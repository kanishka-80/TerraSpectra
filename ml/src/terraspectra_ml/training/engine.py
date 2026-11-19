"""Reusable PyTorch training and validation engine for TerraSpectra."""

from __future__ import annotations

from typing import Any, Dict, Iterable, Tuple
import torch
from torch import nn
from torch.optim import Optimizer

from terraspectra_ml.models.input_contract import (
    InputContractError,
    adapt_4d_patch_batch_to_5d,
)
from terraspectra_ml.training.losses import compute_classification_loss


def _unpack_and_prepare_batch(
    batch: Any,
    device: torch.device,
) -> Tuple[torch.Tensor, torch.Tensor]:
    """Validate batch structure, adapt 4D DataLoader batches to 5D, and move to target device."""
    if not isinstance(batch, (tuple, list)) or len(batch) < 2:
        raise ValueError(
            "Each DataLoader batch must be a tuple/list of (inputs, targets) for supervised training."
        )

    inputs, targets = batch[0], batch[1]
    if not isinstance(inputs, torch.Tensor):
        inputs = torch.as_tensor(inputs, dtype=torch.float32)
    if not isinstance(targets, torch.Tensor):
        targets = torch.as_tensor(targets, dtype=torch.long)

    # Support both Khushi's 4D [B, D, H, W] batches and native 5D [B, 1, D, H, W] batches
    if inputs.ndim == 4:
        inputs = adapt_4d_patch_batch_to_5d(inputs)
    elif inputs.ndim != 5:
        raise InputContractError(
            f"Batch inputs must be 4D [B, D, H, W] or 5D [B, 1, D, H, W], got {inputs.ndim}D {tuple(inputs.shape)}."
        )

    inputs = inputs.to(device=device, dtype=torch.float32, non_blocking=False)
    targets = targets.to(device=device, dtype=torch.long, non_blocking=False)
    return inputs, targets


def train_one_epoch(
    model: nn.Module,
    dataloader: Iterable[Any],
    criterion: nn.Module,
    optimizer: Optimizer,
    device: torch.device,
) -> Dict[str, float]:
    """Run one training epoch and return average training loss."""
    model.train()
    total_loss = 0.0
    total_samples = 0
    num_batches = 0

    for batch in dataloader:
        inputs, targets = _unpack_and_prepare_batch(batch, device=device)
        batch_size = inputs.shape[0]

        optimizer.zero_grad(set_to_none=True)
        logits = model(inputs)
        loss = compute_classification_loss(criterion, logits, targets)
        loss.backward()
        optimizer.step()

        total_loss += float(loss.item()) * batch_size
        total_samples += batch_size
        num_batches += 1

    if total_samples == 0:
        raise ValueError("Training DataLoader yielded 0 samples; cannot compute epoch training loss.")

    return {
        "train_loss": total_loss / total_samples,
        "num_batches": float(num_batches),
        "num_samples": float(total_samples),
    }


@torch.no_grad()
def validate_one_epoch(
    model: nn.Module,
    dataloader: Iterable[Any],
    criterion: nn.Module,
    device: torch.device,
) -> Dict[str, float]:
    """Run one validation epoch in eval mode without gradient tracking or weight updates."""
    model.eval()
    total_loss = 0.0
    total_samples = 0
    num_batches = 0

    for batch in dataloader:
        inputs, targets = _unpack_and_prepare_batch(batch, device=device)
        batch_size = inputs.shape[0]

        logits = model(inputs)
        loss = compute_classification_loss(criterion, logits, targets)

        total_loss += float(loss.item()) * batch_size
        total_samples += batch_size
        num_batches += 1

    if total_samples == 0:
        raise ValueError("Validation DataLoader yielded 0 samples; cannot compute epoch validation loss.")

    return {
        "val_loss": total_loss / total_samples,
        "num_batches": float(num_batches),
        "num_samples": float(total_samples),
    }
