"""Lightweight feature fusion modules for TerraSpectra Hybrid 3D-CNN + ViT (Day 18)."""

from __future__ import annotations

import torch
from torch import nn


class ConcatProjectionFusion(nn.Module):
    """Concatenates CNN global features [B, D_cnn] and ViT context embeddings [B, D_vit]
    into [B, D_cnn + D_vit], followed by LayerNorm, Linear projection, GELU, and Dropout
    to produce fused embeddings [B, fused_dim].
    """

    def __init__(
        self,
        cnn_dim: int = 128,
        vit_dim: int = 128,
        fused_dim: int = 128,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        if cnn_dim < 1 or vit_dim < 1 or fused_dim < 1:
            raise ValueError("cnn_dim, vit_dim, and fused_dim must all be >= 1.")
        if not (0.0 <= dropout < 1.0):
            raise ValueError(f"dropout must be in [0.0, 1.0), got {dropout}.")

        self.cnn_dim = int(cnn_dim)
        self.vit_dim = int(vit_dim)
        self.fused_dim = int(fused_dim)
        self.concat_dim = self.cnn_dim + self.vit_dim

        self.norm = nn.LayerNorm(self.concat_dim)
        self.proj = nn.Linear(self.concat_dim, self.fused_dim)
        self.act = nn.GELU()
        self.drop = nn.Dropout(dropout) if dropout > 0.0 else nn.Identity()

    def forward(
        self,
        cnn_features: torch.Tensor,
        vit_embedding: torch.Tensor,
    ) -> torch.Tensor:
        if not isinstance(cnn_features, torch.Tensor) or not isinstance(vit_embedding, torch.Tensor):
            raise TypeError("cnn_features and vit_embedding must both be torch.Tensor instances.")
        if cnn_features.ndim != 2 or cnn_features.shape[1] != self.cnn_dim:
            raise ValueError(
                f"Expected cnn_features shape [B, {self.cnn_dim}], got {tuple(cnn_features.shape)}."
            )
        if vit_embedding.ndim != 2 or vit_embedding.shape[1] != self.vit_dim:
            raise ValueError(
                f"Expected vit_embedding shape [B, {self.vit_dim}], got {tuple(vit_embedding.shape)}."
            )
        if cnn_features.shape[0] != vit_embedding.shape[0]:
            raise ValueError(
                f"Batch size mismatch between cnn_features ({cnn_features.shape[0]}) "
                f"and vit_embedding ({vit_embedding.shape[0]})."
            )
        if cnn_features.dtype != vit_embedding.dtype:
            raise TypeError(
                f"Dtype mismatch between cnn_features ({cnn_features.dtype}) "
                f"and vit_embedding ({vit_embedding.dtype})."
            )
        if cnn_features.device != vit_embedding.device:
            raise ValueError(
                f"Device mismatch between cnn_features ({cnn_features.device}) "
                f"and vit_embedding ({vit_embedding.device})."
            )
        if not torch.isfinite(cnn_features).all() or not torch.isfinite(vit_embedding).all():
            raise ValueError("Fusion inputs contain NaN or Inf values.")

        combined = torch.cat([cnn_features, vit_embedding], dim=-1)
        projected = self.proj(self.norm(combined))
        return self.drop(self.act(projected))
