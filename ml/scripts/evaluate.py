"""CLI and programmatic evaluation entry point for TerraSpectra models."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Any, Dict, Iterable, List, Optional
import numpy as np
import torch
from torch import nn
import yaml

ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from terraspectra_ml.evaluation.metrics import compute_classification_metrics
from terraspectra_ml.evaluation.reports import build_evaluation_report, export_evaluation_report
from terraspectra_ml.models.cnn3d import TerraSpectra3DCNN
from terraspectra_ml.models.input_contract import resolve_target_device
from terraspectra_ml.training.engine import _unpack_and_prepare_batch
from terraspectra_ml.training.train import load_checkpoint


def load_class_mapping(classes_config_path: str | Path) -> tuple[Dict[int, str], bool]:
    """Load integer-to-name class mapping and verification status from classes.yaml."""
    with open(classes_config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    confirmed = bool(cfg.get("confirmed", False))
    mapping = {int(entry["id"]): str(entry["name"]) for entry in cfg["classes"]}
    return mapping, confirmed


@torch.no_grad()
def evaluate_model_on_loader(
    model: nn.Module,
    dataloader: Iterable[Any],
    class_mapping: Dict[int, str],
    device: torch.device,
    metadata: Optional[Dict[str, Any]] = None,
    limitations: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Run inference in eval mode with no gradients and return a full evaluation report."""
    model.eval()
    model.to(device)

    all_preds: List[np.ndarray] = []
    all_targets: List[np.ndarray] = []

    for batch in dataloader:
        inputs, targets = _unpack_and_prepare_batch(batch, device=device)
        logits = model(inputs)
        preds = torch.argmax(logits, dim=-1)
        all_preds.append(preds.cpu().numpy())
        all_targets.append(targets.cpu().numpy())

    if not all_targets:
        raise ValueError("Evaluation DataLoader yielded 0 samples.")

    y_true = np.concatenate(all_targets, axis=0)
    y_pred = np.concatenate(all_preds, axis=0)

    metrics_result = compute_classification_metrics(
        y_true=y_true,
        y_pred=y_pred,
        class_mapping=class_mapping,
    )
    return build_evaluation_report(
        metrics_result=metrics_result,
        metadata=metadata or {},
        limitations=limitations,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a trained TerraSpectra classification checkpoint.")
    parser.add_argument("--checkpoint", type=str, default=None, help="Path to trained model .pt checkpoint.")
    parser.add_argument("--dataset-path", type=str, default=None, help="Path to verified evaluation split.")
    parser.add_argument("--model-config", type=str, default="ml/configs/model_config.yaml")
    parser.add_argument("--classes-config", type=str, default="ml/configs/classes.yaml")
    parser.add_argument("--experiment-config", type=str, default="ml/configs/experiment.yaml")
    parser.add_argument("--output-dir", type=str, default="ml/artifacts/reports")
    parser.add_argument("--device", type=str, default="auto")
    args = parser.parse_args()

    class_mapping, labels_confirmed = load_class_mapping(args.classes_config)

    if args.checkpoint is None or not Path(args.checkpoint).exists():
        raise RuntimeError(
            "Evaluation blocker: No trained model checkpoint (.pt) was provided or found on disk. "
            "Train a checkpoint on verified data before running ml/scripts/evaluate.py."
        )

    if args.dataset_path is None or not Path(args.dataset_path).exists() or not labels_confirmed:
        raise RuntimeError(
            "Evaluation blocker: Verified evaluation split or confirmed ground-truth labels "
            "(confirmed: true in ml/configs/classes.yaml) are not yet available from Data Engineering."
        )

    device = torch.device(resolve_target_device(args.device))
    model = TerraSpectra3DCNN.from_configs(
        model_config_path=args.model_config,
        classes_config_path=args.classes_config,
    )
    ckpt = load_checkpoint(args.checkpoint, model=model, map_location=device)
    _ = (class_mapping, ckpt, export_evaluation_report)


if __name__ == "__main__":
    main()
