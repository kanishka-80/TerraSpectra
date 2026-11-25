"""Reusable Pre-LayerNorm Transformer encoder blocks for TerraSpectra ViT."""

from __future__ import annotations

import torch
from torch import nn


class TransformerEncoderBlock(nn.Module):
    """Pre-LayerNorm Transformer encoder block with Multi-Head Self-Attention and FFN.

    Input / Output contract:
        x: [B, S, embed_dim] -> out: [B, S, embed_dim]
    """

    def __init__(
        self,
        embed_dim: int = 128,
        num_heads: int = 4,
        mlp_ratio: float = 2.0,
        dropout: float = 0.1,
        attention_dropout: float = 0.1,
        norm_first: bool = True,
    ) -> None:
        super().__init__()
        if embed_dim < 1:
            raise ValueError(f"embed_dim must be >= 1, got {embed_dim}.")
        if num_heads < 1:
            raise ValueError(f"num_heads must be >= 1, got {num_heads}.")
        if embed_dim % num_heads != 0:
            raise ValueError(
                f"embed_dim ({embed_dim}) must be divisible by num_heads ({num_heads})."
            )
        if mlp_ratio <= 0:
            raise ValueError(f"mlp_ratio must be > 0, got {mlp_ratio}.")
        if not (0.0 <= dropout < 1.0) or not (0.0 <= attention_dropout < 1.0):
            raise ValueError("dropout and attention_dropout must be in [0.0, 1.0).")

        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.norm_first = norm_first
        hidden_dim = max(1, int(round(embed_dim * mlp_ratio)))

        self.norm1 = nn.LayerNorm(embed_dim)
        self.attn = nn.MultiheadAttention(
            embed_dim=embed_dim,
            num_heads=num_heads,
            dropout=attention_dropout,
            batch_first=True,
        )
        self.drop1 = nn.Dropout(dropout)

        self.norm2 = nn.LayerNorm(embed_dim)
        self.mlp = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, embed_dim),
            nn.Dropout(dropout),
        )

    def _sa_block(self, x: torch.Tensor) -> torch.Tensor:
        attn_out, _ = self.attn(x, x, x, need_weights=False)
        return self.drop1(attn_out)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.ndim != 3 or x.shape[-1] != self.embed_dim:
            raise ValueError(
                f"Expected 3D token tensor [B, S, {self.embed_dim}], got {tuple(x.shape)}."
            )
        if self.norm_first:
            x = x + self._sa_block(self.norm1(x))
            x = x + self.mlp(self.norm2(x))
        else:
            x = self.norm1(x + self._sa_block(x))
            x = self.norm2(x + self.mlp(x))
        return x


class TransformerEncoderStack(nn.Module):
    """Stack of N configurable TransformerEncoderBlock layers followed by LayerNorm."""

    def __init__(
        self,
        num_layers: int = 2,
        embed_dim: int = 128,
        num_heads: int = 4,
        mlp_ratio: float = 2.0,
        dropout: float = 0.1,
        attention_dropout: float = 0.1,
        norm_first: bool = True,
    ) -> None:
        super().__init__()
        if num_layers < 1:
            raise ValueError(f"num_layers must be >= 1, got {num_layers}.")
        self.layers = nn.ModuleList(
            [
                TransformerEncoderBlock(
                    embed_dim=embed_dim,
                    num_heads=num_heads,
                    mlp_ratio=mlp_ratio,
                    dropout=dropout,
                    attention_dropout=attention_dropout,
                    norm_first=norm_first,
                )
                for _ in range(num_layers)
            ]
        )
        self.final_norm = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        for layer in self.layers:
            x = layer(x)
        return self.final_norm(x)
