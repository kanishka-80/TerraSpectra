"""Week 3 Day 15 Vision Transformer (ViT) input contract and architecture design stub.

Scope Notice (Day 15):
    This module defines the verified spatial-spectral token contract and configuration
    dataclass for the upcoming Vision Transformer branch. Full Transformer encoder layers
    and hybrid CNN-ViT fusion will be implemented starting on Day 16.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Tuple
import torch
from torch import nn
import yaml


@dataclass(frozen=True)
class ViTTokenContract:
    """Verified token tensor contract emitted by SpatialSpectral3DExtractor.extract_vit_tokens."""

    expected_ndim: int = 3
    num_tokens: int = 25
    embed_dim: int = 128
    expected_dtype: torch.dtype = torch.float32


@dataclass(frozen=True)
class ViTArchitectureSpec:
    """Resource-aware Vision Transformer configuration specification (RTX 3050 4GB VRAM)."""

    embed_dim: int = 128
    num_tokens: int = 25
    num_heads: int = 4
    num_layers: int = 2
    mlp_ratio: float = 2.0
    dropout: float = 0.1
    use_cls_token: bool = True
    pooling: str = "cls"

    @classmethod
    def from_yaml(cls, config_path: str | Path = "ml/configs/vit.yaml") -> "ViTArchitectureSpec":
        with open(config_path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)
        vit_cfg: Dict[str, Any] = raw.get("vit", raw)
        return cls(
            embed_dim=int(vit_cfg.get("embed_dim", 128)),
            num_tokens=int(vit_cfg.get("num_tokens", 25)),
            num_heads=int(vit_cfg.get("num_heads", 4)),
            num_layers=int(vit_cfg.get("num_layers", 2)),
            mlp_ratio=float(vit_cfg.get("mlp_ratio", 2.0)),
            dropout=float(vit_cfg.get("dropout", 0.1)),
            use_cls_token=bool(vit_cfg.get("use_cls_token", True)),
            pooling=str(vit_cfg.get("pooling", "cls")),
        )


def validate_vit_token_tensor(
    tokens: torch.Tensor,
    contract: ViTTokenContract = ViTTokenContract(),
) -> Tuple[int, int, int]:
    """Validate [B, N_tokens, D_model] tokens before Transformer encoding."""
    if not isinstance(tokens, torch.Tensor):
        raise TypeError(f"Expected torch.Tensor for ViT tokens, got {type(tokens).__name__}.")
    if tokens.ndim != contract.expected_ndim:
        raise ValueError(
            f"Expected {contract.expected_ndim}D token tensor [B, N_tokens, D_model], got shape {tuple(tokens.shape)}."
        )
    if tokens.dtype != contract.expected_dtype:
        raise TypeError(f"Expected dtype {contract.expected_dtype}, got {tokens.dtype}.")
    batch_size, n_tokens, d_model = int(tokens.shape[0]), int(tokens.shape[1]), int(tokens.shape[2])
    if batch_size < 1:
        raise ValueError("Batch size must be >= 1.")
    if n_tokens != contract.num_tokens:
        raise ValueError(f"Expected num_tokens={contract.num_tokens}, got {n_tokens}.")
    if d_model != contract.embed_dim:
        raise ValueError(f"Expected embed_dim={contract.embed_dim}, got {d_model}.")
    if not torch.isfinite(tokens).all():
        raise ValueError("ViT token tensor contains NaN or Inf values.")
    return (batch_size, n_tokens, d_model)


class TerraSpectraViTStub(nn.Module):
    """Day 15 interface placeholder for the Week 3 Vision Transformer encoder."""

    def __init__(self, spec: ViTArchitectureSpec = ViTArchitectureSpec()) -> None:
        super().__init__()
        self.spec = spec
        self.token_contract = ViTTokenContract(
            num_tokens=spec.num_tokens,
            embed_dim=spec.embed_dim,
        )

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        validate_vit_token_tensor(tokens, contract=self.token_contract)
        raise NotImplementedError(
            "TerraSpectraViTStub is a Day 15 contract stub. "
            "Full Transformer encoder layers will be implemented starting on Day 16."
        )
