"""Configurable loss functions for TerraSpectra supervised classification."""

from __future__ import annotations

from typing import Any, Dict, Optional, Sequence
import torch
from torch import nn


def build_loss_function(
    loss_cfg: Dict[str, Any],
    device: Optional[torch.device] = None,
) -> nn.Module:
    """Instantiate a classification loss function from training configuration.

    Notes:
        - Expects raw unnormalized model logits [B, K] and 1D integer class indices [B] (int64).
        - Class weighting is disabled by default and requires explicit, evidence-backed weights.
    """
    name = str(loss_cfg.get("name", "CrossEntropyLoss")).strip()
    if name != "CrossEntropyLoss":
        raise ValueError(
            f"Unsupported loss function '{name}'. Currently supported: 'CrossEntropyLoss'."
        )

    use_weights = bool(loss_cfg.get("use_class_weights", False))
    raw_weights: Optional[Sequence[float]] = loss_cfg.get("class_weights")
    weight_tensor: Optional[torch.Tensor] = None

    if use_weights:
        if raw_weights is None or len(raw_weights) == 0:
            raise ValueError(
                "use_class_weights=True requires explicit non-empty 'class_weights' derived from dataset statistics."
            )
        weight_tensor = torch.tensor(list(raw_weights), dtype=torch.float32)
        if device is not None:
            weight_tensor = weight_tensor.to(device)

    label_smoothing = float(loss_cfg.get("label_smoothing", 0.0))
    return nn.CrossEntropyLoss(weight=weight_tensor, label_smoothing=label_smoothing)


def compute_classification_loss(
    criterion: nn.Module,
    logits: torch.Tensor,
    targets: torch.Tensor,
) -> torch.Tensor:
    """Validate logits/target compatibility and compute scalar loss."""
    if logits.ndim != 2:
        raise ValueError(f"Expected 2D logits [B, K], got shape {tuple(logits.shape)}.")
    if targets.ndim != 1:
        raise ValueError(f"Expected 1D class index targets [B], got shape {tuple(targets.shape)}.")
    if logits.shape[0] != targets.shape[0]:
        raise ValueError(
            f"Batch size mismatch between logits ({logits.shape[0]}) and targets ({targets.shape[0]})."
        )
    if targets.dtype != torch.long:
        targets = targets.long()

    loss = criterion(logits, targets)
    if not torch.isfinite(loss):
        raise RuntimeError(f"Non-finite loss encountered during computation: {loss.item()}")
    return loss
