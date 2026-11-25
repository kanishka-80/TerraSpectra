"""Configurable Vision Transformer (ViT) building blocks for TerraSpectra (Day 16).

Supports:
1. Pre-tokenized spatial-spectral embeddings [B, N_tokens, D_in] emitted by
   SpatialSpectral3DExtractor.extract_vit_tokens() (projected to embed_dim if D_in != embed_dim).
2. Direct hyperspectral cube tokenization [B, 1, D, H, W] via spectral-band-agnostic
   adaptive spectral pooling + spatial 2D patch embedding without hardcoding D, H, or W.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import torch
from torch import nn
import yaml

from terraspectra_ml.models.transformer_blocks import TransformerEncoderStack


@dataclass(frozen=True)
class ViTTokenContract:
    """Verified token tensor contract [B, N_tokens, embed_dim]."""

    expected_ndim: int = 3
    num_tokens: int = 25
    embed_dim: int = 128
    expected_dtype: torch.dtype = torch.float32


@dataclass(frozen=True)
class ViTArchitectureSpec:
    """Resource-aware Vision Transformer configuration specification (RTX 3050 4GB VRAM)."""

    embed_dim: int = 128
    input_token_dim: int = 128
    num_tokens: int = 25
    num_heads: int = 4
    num_layers: int = 2
    mlp_ratio: float = 2.0
    dropout: float = 0.1
    attention_dropout: float = 0.1
    use_cls_token: bool = True
    pooling: str = "cls"
    norm_first: bool = True
    spectral_bins: int = 16
    spatial_grid_size: int = 5

    @classmethod
    def from_yaml(cls, config_path: str | Path = "ml/configs/vit.yaml") -> "ViTArchitectureSpec":
        with open(config_path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)
        vit_cfg: Dict[str, Any] = raw.get("vit", raw)
        grid = int(vit_cfg.get("spatial_grid_size", 5))
        num_tokens = int(vit_cfg.get("num_tokens", grid * grid))
        return cls(
            embed_dim=int(vit_cfg.get("embed_dim", 128)),
            input_token_dim=int(vit_cfg.get("input_token_dim", vit_cfg.get("embed_dim", 128))),
            num_tokens=num_tokens,
            num_heads=int(vit_cfg.get("num_heads", 4)),
            num_layers=int(vit_cfg.get("num_layers", 2)),
            mlp_ratio=float(vit_cfg.get("mlp_ratio", 2.0)),
            dropout=float(vit_cfg.get("dropout", 0.1)),
            attention_dropout=float(vit_cfg.get("attention_dropout", 0.1)),
            use_cls_token=bool(vit_cfg.get("use_cls_token", True)),
            pooling=str(vit_cfg.get("pooling", "cls")),
            norm_first=bool(vit_cfg.get("norm_first", True)),
            spectral_bins=int(vit_cfg.get("spectral_bins", 16)),
            spatial_grid_size=grid,
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
    if contract.num_tokens > 0 and n_tokens != contract.num_tokens:
        raise ValueError(f"Expected num_tokens={contract.num_tokens}, got {n_tokens}.")
    if d_model != contract.embed_dim:
        raise ValueError(f"Expected embed_dim={contract.embed_dim}, got {d_model}.")
    if not torch.isfinite(tokens).all():
        raise ValueError("ViT token tensor contains NaN or Inf values.")
    return (batch_size, n_tokens, d_model)


class HyperspectralTokenEmbedding(nn.Module):
    """Converts either 3D spatial-spectral tokens [B, N, D_in] or 5D cubes [B, 1, D, H, W]
    into [B, N_tokens, embed_dim] embeddings without hardcoding band count D or patch size (H, W).
    """

    def __init__(
        self,
        embed_dim: int = 128,
        input_token_dim: int = 128,
        spectral_bins: int = 16,
        spatial_grid_size: int = 5,
    ) -> None:
        super().__init__()
        if embed_dim < 1 or input_token_dim < 1:
            raise ValueError("embed_dim and input_token_dim must be >= 1.")
        if spectral_bins < 1 or spatial_grid_size < 1:
            raise ValueError("spectral_bins and spatial_grid_size must be >= 1.")

        self.embed_dim = embed_dim
        self.input_token_dim = input_token_dim
        self.spectral_bins = spectral_bins
        self.spatial_grid_size = spatial_grid_size
        self.num_tokens = spatial_grid_size * spatial_grid_size

        # Linear projection for pre-tokenized 3D embeddings [B, N, D_in] -> [B, N, embed_dim]
        self.token_proj = (
            nn.Identity()
            if input_token_dim == embed_dim
            else nn.Linear(input_token_dim, embed_dim)
        )

        # Spectral-band-agnostic 5D cube tokenizer: [B, 1, D, H, W] -> [B, spectral_bins, grid, grid] -> [B, N, embed_dim]
        self.cube_pool = nn.AdaptiveAvgPool3d((spectral_bins, spatial_grid_size, spatial_grid_size))
        self.cube_proj = nn.Conv2d(spectral_bins, embed_dim, kernel_size=1, bias=True)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if not isinstance(x, torch.Tensor):
            raise TypeError(f"Expected torch.Tensor, got {type(x).__name__}.")
        if x.dtype != torch.float32:
            raise TypeError(f"Expected torch.float32 input, got {x.dtype}.")
        if not torch.isfinite(x).all():
            raise ValueError("Input tensor contains NaN or Inf values.")

        if x.ndim == 3:
            if x.shape[0] < 1 or x.shape[1] < 1:
                raise ValueError(f"Batch and token dimensions must be >= 1, got {tuple(x.shape)}.")
            if x.shape[2] != self.input_token_dim:
                raise ValueError(
                    f"Expected token feature dim {self.input_token_dim}, got {x.shape[2]}."
                )
            tokens = self.token_proj(x)
            return self.norm(tokens)

        if x.ndim == 5:
            if x.shape[0] < 1 or x.shape[1] != 1 or min(x.shape[2], x.shape[3], x.shape[4]) < 1:
                raise ValueError(
                    f"Expected valid 5D hyperspectral tensor [B, 1, D, H, W], got {tuple(x.shape)}."
                )
            pooled = self.cube_pool(x).squeeze(1)  # [B, spectral_bins, grid, grid]
            projected = self.cube_proj(pooled)     # [B, embed_dim, grid, grid]
            tokens = projected.flatten(2).transpose(1, 2)  # [B, grid*grid, embed_dim]
            return self.norm(tokens)

        raise ValueError(
            f"Expected 3D tokens [B, N, {self.input_token_dim}] or 5D cube [B, 1, D, H, W], got {tuple(x.shape)}."
        )


class LearnablePositionalEncoding(nn.Module):
    """Prepends an optional [CLS] token and adds learnable positional embeddings.

    Supports configurable token counts (up to max_tokens, with dynamic 1D interpolation if
    a different spatial token count is passed at runtime).
    """

    def __init__(
        self,
        num_tokens: int = 25,
        embed_dim: int = 128,
        use_cls_token: bool = True,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        if num_tokens < 1 or embed_dim < 1:
            raise ValueError("num_tokens and embed_dim must be >= 1.")
        self.num_tokens = num_tokens
        self.embed_dim = embed_dim
        self.use_cls_token = use_cls_token

        self.cls_token = (
            nn.Parameter(torch.zeros(1, 1, embed_dim)) if use_cls_token else None
        )
        self.pos_embed = nn.Parameter(torch.zeros(1, num_tokens, embed_dim))
        self.cls_pos_embed = (
            nn.Parameter(torch.zeros(1, 1, embed_dim)) if use_cls_token else None
        )
        self.dropout = nn.Dropout(dropout)

        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        if self.cls_token is not None and self.cls_pos_embed is not None:
            nn.init.trunc_normal_(self.cls_token, std=0.02)
            nn.init.trunc_normal_(self.cls_pos_embed, std=0.02)

    def _get_spatial_pos_embed(self, seq_len: int) -> torch.Tensor:
        if seq_len == self.num_tokens:
            return self.pos_embed
        # Interpolate [1, num_tokens, D] -> [1, seq_len, D] for arbitrary token counts
        pos = self.pos_embed.transpose(1, 2)  # [1, D, num_tokens]
        pos = torch.nn.functional.interpolate(pos, size=seq_len, mode="linear", align_corners=False)
        return pos.transpose(1, 2)

    def forward(self, tokens: torch.Tensor) -> torch.Tensor:
        if tokens.ndim != 3 or tokens.shape[-1] != self.embed_dim:
            raise ValueError(
                f"Expected [B, N, {self.embed_dim}] tokens, got {tuple(tokens.shape)}."
            )
        batch_size, seq_len, _ = tokens.shape
        x = tokens + self._get_spatial_pos_embed(seq_len)

        if self.use_cls_token and self.cls_token is not None and self.cls_pos_embed is not None:
            cls_tok = (self.cls_token + self.cls_pos_embed).expand(batch_size, -1, -1)
            x = torch.cat([cls_tok, x], dim=1)

        return self.dropout(x)


class ViTClassificationHead(nn.Module):
    """Pools encoded Transformer tokens ('cls' or 'mean') and projects to [B, num_classes] logits."""

    def __init__(
        self,
        embed_dim: int = 128,
        num_classes: int = 2,
        pooling: str = "cls",
        use_cls_token: bool = True,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        if num_classes < 2:
            raise ValueError(f"num_classes must be >= 2, got {num_classes}.")
        if pooling not in {"cls", "mean"}:
            raise ValueError(f"pooling must be 'cls' or 'mean', got '{pooling}'.")
        if pooling == "cls" and not use_cls_token:
            raise ValueError("pooling='cls' requires use_cls_token=True.")

        self.embed_dim = embed_dim
        self.num_classes = num_classes
        self.pooling = pooling
        self.use_cls_token = use_cls_token
        self.drop = nn.Dropout(dropout)
        self.fc = nn.Linear(embed_dim, num_classes)

    def pool_tokens(self, encoded_tokens: torch.Tensor) -> torch.Tensor:
        if encoded_tokens.ndim != 3 or encoded_tokens.shape[-1] != self.embed_dim:
            raise ValueError(
                f"Expected encoded tokens [B, S, {self.embed_dim}], got {tuple(encoded_tokens.shape)}."
            )
        if self.pooling == "cls":
            return encoded_tokens[:, 0, :]
        spatial_tokens = encoded_tokens[:, 1:, :] if self.use_cls_token else encoded_tokens
        return spatial_tokens.mean(dim=1)

    def forward(self, encoded_tokens: torch.Tensor) -> torch.Tensor:
        pooled = self.pool_tokens(encoded_tokens)
        return self.fc(self.drop(pooled))


class TerraSpectraViT(nn.Module):
    """Configurable Vision Transformer for TerraSpectra spatial-spectral tokens or 5D cubes."""

    def __init__(
        self,
        spec: ViTArchitectureSpec = ViTArchitectureSpec(),
        num_classes: int = 2,
    ) -> None:
        super().__init__()
        self.spec = spec
        self.num_classes = num_classes

        self.tokenizer = HyperspectralTokenEmbedding(
            embed_dim=spec.embed_dim,
            input_token_dim=spec.input_token_dim,
            spectral_bins=spec.spectral_bins,
            spatial_grid_size=spec.spatial_grid_size,
        )
        self.pos_encoding = LearnablePositionalEncoding(
            num_tokens=spec.num_tokens,
            embed_dim=spec.embed_dim,
            use_cls_token=spec.use_cls_token,
            dropout=spec.dropout,
        )
        self.encoder = TransformerEncoderStack(
            num_layers=spec.num_layers,
            embed_dim=spec.embed_dim,
            num_heads=spec.num_heads,
            mlp_ratio=spec.mlp_ratio,
            dropout=spec.dropout,
            attention_dropout=spec.attention_dropout,
            norm_first=spec.norm_first,
        )
        self.head = ViTClassificationHead(
            embed_dim=spec.embed_dim,
            num_classes=num_classes,
            pooling=spec.pooling,
            use_cls_token=spec.use_cls_token,
            dropout=spec.dropout,
        )

    @classmethod
    def from_configs(
        cls,
        vit_config_path: str | Path = "ml/configs/vit.yaml",
        classes_config_path: str | Path = "ml/configs/classes.yaml",
        num_classes_override: Optional[int] = None,
    ) -> "TerraSpectraViT":
        spec = ViTArchitectureSpec.from_yaml(vit_config_path)
        if num_classes_override is not None:
            resolved_classes = int(num_classes_override)
        else:
            with open(classes_config_path, "r", encoding="utf-8") as f:
                classes_cfg = yaml.safe_load(f)
            resolved_classes = len(classes_cfg["classes"])
        return cls(spec=spec, num_classes=resolved_classes)

    def encode_tokens(self, x: torch.Tensor) -> torch.Tensor:
        """Return encoded token sequence [B, S, embed_dim] (with [CLS] at index 0 if enabled)."""
        tokens = self.tokenizer(x)
        pos_tokens = self.pos_encoding(tokens)
        return self.encoder(pos_tokens)

    def extract_embedding(self, x: torch.Tensor) -> torch.Tensor:
        """Return pooled [B, embed_dim] representation for future hybrid fusion."""
        encoded = self.encode_tokens(x)
        return self.head.pool_tokens(encoded)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Accept [B, N, D_in] tokens or [B, 1, D, H, W] cube and return [B, num_classes] logits."""
        encoded = self.encode_tokens(x)
        return self.head(encoded)


class TerraSpectraViTStub(nn.Module):
    """Backwards-compatible Day 15 contract placeholder."""

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
            "TerraSpectraViTStub is a Day 15 contract placeholder; use TerraSpectraViT."
        )
