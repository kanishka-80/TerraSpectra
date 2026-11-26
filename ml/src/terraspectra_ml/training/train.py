"""Reproducible training entry point, optimizer builder, and checkpoint manager."""

from __future__ import annotations

import json
from pathlib import Path
import random
from typing import Any, Dict, Iterable, List, Optional
import numpy as np
import torch
from torch import nn
from torch.optim import Adam, AdamW, Optimizer
import yaml

from terraspectra_ml.models.cnn3d import TerraSpectra3DCNN
from terraspectra_ml.models.vit import TerraSpectraViT
from terraspectra_ml.models.input_contract import resolve_target_device
from terraspectra_ml.training.engine import train_one_epoch, validate_one_epoch
from terraspectra_ml.training.losses import build_loss_function


def set_reproducibility_seed(seed: int = 42, deterministic: bool = True) -> None:
    """Seed Python, NumPy, and PyTorch RNGs for reproducible initialization and batching.

    Note: Setting seeds and cudnn.deterministic improves repeatability across runs on the
    same hardware/software stack, but exact bit-for-bit determinism across different GPUs
    or CUDA versions is not guaranteed by PyTorch.
    """
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    if deterministic and hasattr(torch.backends, "cudnn"):
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def build_optimizer(model: nn.Module, optimizer_cfg: Dict[str, Any]) -> Optimizer:
    """Construct optimizer from training.yaml optimizer section."""
    name = str(optimizer_cfg.get("name", "AdamW")).strip()
    lr = float(optimizer_cfg.get("learning_rate", 3e-4))
    weight_decay = float(optimizer_cfg.get("weight_decay", 0.01))
    betas_raw = optimizer_cfg.get("betas", [0.9, 0.999])
    betas = (float(betas_raw[0]), float(betas_raw[1]))
    eps = float(optimizer_cfg.get("eps", 1e-8))

    if name == "AdamW":
        return AdamW(model.parameters(), lr=lr, weight_decay=weight_decay, betas=betas, eps=eps)
    if name == "Adam":
        return Adam(model.parameters(), lr=lr, weight_decay=weight_decay, betas=betas, eps=eps)
    raise ValueError(f"Unsupported optimizer '{name}'. Expected 'AdamW' or 'Adam'.")


def save_checkpoint(
    filepath: str | Path,
    model: nn.Module,
    optimizer: Optimizer,
    epoch: int,
    val_loss: Optional[float],
    seed: int,
    config_snapshot: Dict[str, Any],
) -> Path:
    """Persist model, optimizer, epoch metadata, and configuration snapshot."""
    target = Path(filepath)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "epoch": int(epoch),
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "val_loss": val_loss,
        "random_seed": int(seed),
        "config": config_snapshot,
    }
    torch.save(payload, target)
    return target


def load_checkpoint(
    filepath: str | Path,
    model: nn.Module,
    optimizer: Optional[Optimizer] = None,
    map_location: str | torch.device = "cpu",
) -> Dict[str, Any]:
    """Restore model (and optionally optimizer) state from a saved checkpoint."""
    checkpoint = torch.load(Path(filepath), map_location=map_location, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    if optimizer is not None and "optimizer_state_dict" in checkpoint:
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    return checkpoint


def run_training(
    training_cfg: Dict[str, Any],
    model: nn.Module,
    train_loader: Iterable[Any],
    val_loader: Iterable[Any],
    resume_from: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """Execute a complete reproducible training and validation session."""
    repro_cfg = training_cfg.get("reproducibility", {})
    seed = int(repro_cfg.get("random_seed", 42))
    deterministic = bool(repro_cfg.get("deterministic", True))
    set_reproducibility_seed(seed=seed, deterministic=deterministic)

    hw_cfg = training_cfg.get("hardware", {})
    requested_dev = str(hw_cfg.get("device_preference", "auto"))
    if requested_dev.startswith("cuda") and not torch.cuda.is_available() and bool(hw_cfg.get("allow_cpu_fallback", True)):
        resolved_dev_str = "cpu"
    else:
        resolved_dev_str = resolve_target_device(requested_dev)
    device = torch.device(resolved_dev_str)

    model = model.to(device)
    criterion = build_loss_function(training_cfg.get("loss", {}), device=device)
    optimizer = build_optimizer(model, training_cfg.get("optimizer", {}))

    start_epoch = 1
    best_val_loss = float("inf")
    if resume_from is not None:
        ckpt = load_checkpoint(resume_from, model=model, optimizer=optimizer, map_location=device)
        start_epoch = int(ckpt["epoch"]) + 1
        if ckpt.get("val_loss") is not None:
            best_val_loss = float(ckpt["val_loss"])

    train_params = training_cfg.get("training", {})
    total_epochs = int(train_params.get("epochs", 1))
    val_cfg = training_cfg.get("validation", {})
    val_freq = int(val_cfg.get("val_every_n_epochs", 1))

    ckpt_cfg = training_cfg.get("checkpointing", {})
    ckpt_dir = Path(ckpt_cfg.get("checkpoint_dir", "ml/artifacts/checkpoints"))
    recovery_freq = int(ckpt_cfg.get("save_recovery_every_n_epochs", 5))

    log_cfg = training_cfg.get("logging", {})
    run_id = str(log_cfg.get("run_id", "run_default"))
    output_dir = Path(log_cfg.get("output_dir", "ml/artifacts/runs")) / run_id
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(output_dir / "resolved_training_config.yaml", "w", encoding="utf-8") as f:
        yaml.safe_dump(training_cfg, f, sort_keys=False)

    history: List[Dict[str, Any]] = []
    best_checkpoint_path: Optional[str] = None
    last_recovery_path: Optional[str] = None

    for epoch in range(start_epoch, total_epochs + 1):
        train_stats = train_one_epoch(
            model=model,
            dataloader=train_loader,
            criterion=criterion,
            optimizer=optimizer,
            device=device,
        )

        val_loss: Optional[float] = None
        if epoch % val_freq == 0 or epoch == total_epochs:
            val_stats = validate_one_epoch(
                model=model,
                dataloader=val_loader,
                criterion=criterion,
                device=device,
            )
            val_loss = val_stats["val_loss"]

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                saved_best = save_checkpoint(
                    filepath=ckpt_dir / f"{run_id}_best.pt",
                    model=model,
                    optimizer=optimizer,
                    epoch=epoch,
                    val_loss=val_loss,
                    seed=seed,
                    config_snapshot=training_cfg,
                )
                best_checkpoint_path = str(saved_best)

        if recovery_freq > 0 and (epoch % recovery_freq == 0 or epoch == total_epochs):
            saved_rec = save_checkpoint(
                filepath=ckpt_dir / f"{run_id}_epoch_{epoch:04d}.pt",
                model=model,
                optimizer=optimizer,
                epoch=epoch,
                val_loss=val_loss,
                seed=seed,
                config_snapshot=training_cfg,
            )
            last_recovery_path = str(saved_rec)

        history.append(
            {
                "epoch": epoch,
                "train_loss": train_stats["train_loss"],
                "val_loss": val_loss,
            }
        )

    summary = {
        "run_id": run_id,
        "device": str(device),
        "random_seed": seed,
        "best_val_loss": best_val_loss if best_val_loss < float("inf") else None,
        "best_checkpoint": best_checkpoint_path,
        "last_recovery_checkpoint": last_recovery_path,
        "history": history,
    }
    with open(output_dir / "training_history.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary


def _deep_merge_dicts(base: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(base)
    for k, v in overrides.items():
        if isinstance(v, dict) and isinstance(merged.get(k), dict):
            merged[k] = _deep_merge_dicts(merged[k], v)
        else:
            merged[k] = v
    return merged


def main(
    training_config_path: str | Path = "ml/configs/training.yaml",
    model_config_path: str | Path = "ml/configs/model_config.yaml",
    classes_config_path: str | Path = "ml/configs/classes.yaml",
    train_loader: Optional[Iterable[Any]] = None,
    val_loader: Optional[Iterable[Any]] = None,
    model_type: str = "3dcnn",
    vit_config_path: str | Path = "ml/configs/vit.yaml",
    resume_from: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """CLI/programmatic entry point for TerraSpectra 3D-CNN and standalone ViT training."""
    with open(training_config_path, "r", encoding="utf-8") as f:
        training_cfg = yaml.safe_load(f)

    if train_loader is None or val_loader is None:
        raise RuntimeError(
            "Dataset integration blocker: train_loader and val_loader must be supplied from a verified "
            "hyperspectral dataset split (awaiting Khushi's confirmed scene and label mask)."
        )

    normalized_model = str(model_type).strip().lower()
    if normalized_model == "3dcnn":
        model: nn.Module = TerraSpectra3DCNN.from_configs(
            model_config_path=model_config_path,
            classes_config_path=classes_config_path,
        )
    elif normalized_model == "vit":
        with open(vit_config_path, "r", encoding="utf-8") as vf:
            vit_raw = yaml.safe_load(vf) or {}
        if "training_overrides" in vit_raw:
            training_cfg = _deep_merge_dicts(training_cfg, vit_raw["training_overrides"])
        model = TerraSpectraViT.from_configs(
            vit_config_path=vit_config_path,
            classes_config_path=classes_config_path,
        )
    else:
        raise ValueError(f"Unsupported model_type '{model_type}'. Expected '3dcnn' or 'vit'.")

    return run_training(
        training_cfg=training_cfg,
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        resume_from=resume_from,
    )


if __name__ == "__main__":
    main()
