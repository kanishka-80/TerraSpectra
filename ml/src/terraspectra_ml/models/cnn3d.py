"""Initial 3D-CNN architecture for TerraSpectra hyperspectral patch classification.

Implements reusable 3D convolution blocks, a sensor-agnostic spectral-spatial
feature extractor, a linear classification head returning raw logits, and full
integration with the Day 8 5D input contract ([B, C=1, D, H, W]).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple
import yaml
import torch
from torch import nn

from terraspectra_ml.models.input_contract import (
    InputContractSpec,
    validate_model_input,
)


def _get_activation(name: str) -> nn.Module:
    normalized = name.strip().lower()
    if normalized == "gelu":
        return nn.GELU()
    if normalized == "relu":
        return nn.ReLU(inplace=True)
    if normalized == "silu":
        return nn.SiLU(inplace=True)
    raise ValueError(f"Unsupported activation function '{name}'. Expected 'GELU', 'ReLU', or 'SiLU'.")


class Conv3DBlock(nn.Module):
    """Reusable volumetric 3D convolution block: Conv3d -> Norm -> Activation -> Dropout.

    Input shape:  [B, C_in, D_in, H_in, W_in]
    Output shape: [B, C_out, D_out, H_out, W_out]
    """

    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: Tuple[int, int, int],
        stride: Tuple[int, int, int] = (1, 1, 1),
        padding: Tuple[int, int, int] = (0, 0, 0),
        activation: str = "GELU",
        normalization: str = "BatchNorm3d",
        dropout: float = 0.0,
    ) -> None:
        super().__init__()
        use_bias = normalization.strip().lower() == "none"
        self.conv = nn.Conv3d(
            in_channels=in_channels,
            out_channels=out_channels,
            kernel_size=kernel_size,
            stride=stride,
            padding=padding,
            bias=use_bias,
        )

        norm_key = normalization.strip().lower()
        if norm_key == "batchnorm3d":
            self.norm: nn.Module = nn.BatchNorm3d(out_channels)
        elif norm_key == "none":
            self.norm = nn.Identity()
        else:
            raise ValueError(
                f"Unsupported normalization layer '{normalization}'. Expected 'BatchNorm3d' or 'none'."
            )

        self.act = _get_activation(activation)
        self.drop: nn.Module = nn.Dropout3d(p=dropout) if dropout > 0.0 else nn.Identity()

    def extract_vit_tokens(self, x: torch.Tensor) -> torch.Tensor:
        """Validate 5D input and return [B, N_tokens, feature_dim] tokens for Week 3 ViT."""
        validate_model_input(x, spec=self.contract_spec)
        return self.feature_extractor.extract_vit_tokens(x)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv(x)
        x = self.norm(x)
        x = self.act(x)
        x = self.drop(x)
        return x


class SpatialSpectral3DExtractor(nn.Module):
    """Volumetric 3D-CNN feature extractor decoupling local extraction from classification.

    Tensor transformations:
        Input:            [B, 1, D, H, W]       (e.g., [B, 1, D, 9, 9])
        Conv Block 1:     [B, 8, D_1, H_1, W_1] (e.g., [B, 8, ceil(D/2), 9, 9])
        Conv Block 2:     [B, 16, D_2, H_2, W_2](e.g., [B, 16, ceil(D_1/2), 9, 9])
        Conv Block 3:     [B, 32, D_3, H_3, W_3](e.g., [B, 32, D_2, 7, 7])
        Global Pool:      [B, 32, 1, 1, 1] -> Flatten [B, 32]
        Feature Proj:     [B, feature_dim]      (default: [B, 128])
    """

    def __init__(
        self,
        block_configs: Sequence[Dict[str, Any]],
        activation: str = "GELU",
        normalization: str = "BatchNorm3d",
        dropout_3d: float = 0.1,
        feature_dim: int = 128,
        vit_pool_size: Tuple[int, int, int] = (4, 5, 5),
    ) -> None:
        super().__init__()
        if not block_configs:
            raise ValueError("block_configs must define at least one 3D convolution block.")

        blocks: List[Conv3DBlock] = []
        last_channels = 1
        for cfg in block_configs:
            in_ch = int(cfg["in_channels"])
            out_ch = int(cfg["out_channels"])
            k = tuple(int(v) for v in cfg["kernel_size"])
            s = tuple(int(v) for v in cfg["stride"])
            p = tuple(int(v) for v in cfg["padding"])
            blocks.append(
                Conv3DBlock(
                    in_channels=in_ch,
                    out_channels=out_ch,
                    kernel_size=(k[0], k[1], k[2]),
                    stride=(s[0], s[1], s[2]),
                    padding=(p[0], p[1], p[2]),
                    activation=activation,
                    normalization=normalization,
                    dropout=dropout_3d,
                )
            )
            last_channels = out_ch

        self.blocks = nn.ModuleList(blocks)
        self.last_channels = last_channels
        self.feature_dim = int(feature_dim)
        self.global_pool = nn.AdaptiveAvgPool3d((1, 1, 1))
        self.vit_pool = nn.AdaptiveAvgPool3d(vit_pool_size)
        self.feature_proj = nn.Sequential(
            nn.Linear(self.last_channels, self.feature_dim),
            _get_activation(activation),
        )

    def forward_conv_volume(self, x: torch.Tensor) -> torch.Tensor:
        """Pass 5D input through volumetric 3D convolution blocks: [B, 1, D, H, W] -> [B, C_last, D', H', W']."""
        for block in self.blocks:
            x = block(x)
        return x

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Extract compact 2D feature embedding [B, feature_dim] for classification."""
        vol = self.forward_conv_volume(x)
        pooled = self.global_pool(vol).flatten(start_dim=1)
        return self.feature_proj(pooled)

    def extract_vit_tokens(self, x: torch.Tensor) -> torch.Tensor:
        """Prepare pooled spatial-spectral tokens [B, H_p * W_p, C_last * D_p] for Week 3 ViT integration."""
        vol = self.forward_conv_volume(x)
        pooled = self.vit_pool(vol)  # [B, C_last, D_p, H_p, W_p]
        b, c, d_p, h_p, w_p = pooled.shape
        # Permute spatial grid first -> [B, H_p, W_p, C_last, D_p] -> [B, H_p * W_p, C_last * D_p]
        tokens = pooled.permute(0, 3, 4, 1, 2).reshape(b, h_p * w_p, c * d_p)
        return tokens


class ClassificationHead(nn.Module):
    """Linear classification head mapping [B, in_features] -> raw logits [B, num_classes].

    Note: Softmax is intentionally excluded from forward() so raw logits can be
    passed directly to CrossEntropyLoss during training or calibrated post-hoc.
    """

    def __init__(self, in_features: int, num_classes: int, dropout: float = 0.2) -> None:
        super().__init__()
        if num_classes < 2:
            raise ValueError(f"num_classes must be >= 2 for classification, got {num_classes}.")
        self.dropout = nn.Dropout(p=dropout) if dropout > 0.0 else nn.Identity()
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.fc(self.dropout(features))


class TerraSpectra3DCNN(nn.Module):
    """Complete standalone 3D-CNN baseline model with integrated 5D input contract validation."""

    def __init__(
        self,
        model_cfg: Dict[str, Any],
        num_classes: int,
        contract_spec: Optional[InputContractSpec] = None,
    ) -> None:
        super().__init__()
        self.model_cfg = model_cfg
        self.num_classes = int(num_classes)

        input_cfg = model_cfg["input"]
        cnn_cfg = model_cfg["cnn3d"]
        cls_cfg = model_cfg["classification"]

        if contract_spec is None:
            contract_spec = InputContractSpec(
                expected_ndim=5,
                expected_channels=int(input_cfg.get("in_channels", 1)),
                expected_depth=input_cfg.get("spectral_depth"),
                min_depth=int(input_cfg.get("min_spectral_depth", 4)),
                expected_height=input_cfg.get("patch_height", 9),
                expected_width=input_cfg.get("patch_width", 9),
                allowed_dtypes=(str(input_cfg.get("dtype", "float32")),),
            )
        self.contract_spec = contract_spec

        vit_pool_raw = cnn_cfg.get("pooling", {}).get("vit_ready_output_size", [4, 5, 5])
        vit_pool_size = (int(vit_pool_raw[0]), int(vit_pool_raw[1]), int(vit_pool_raw[2]))

        self.feature_extractor = SpatialSpectral3DExtractor(
            block_configs=cnn_cfg["blocks"],
            activation=str(cnn_cfg.get("activation", "GELU")),
            normalization=str(cnn_cfg.get("normalization", "BatchNorm3d")),
            dropout_3d=float(cnn_cfg.get("dropout_3d", 0.1)),
            feature_dim=int(cnn_cfg.get("feature_dim", 128)),
            vit_pool_size=vit_pool_size,
        )

        head_cfg = cls_cfg.get("head_structure", {})
        self.classifier = ClassificationHead(
            in_features=int(head_cfg.get("linear_in_features", self.feature_extractor.feature_dim)),
            num_classes=self.num_classes,
            dropout=float(head_cfg.get("dropout", 0.2)),
        )

    @classmethod
    def from_configs(
        cls,
        model_config_path: str | Path = "ml/configs/model_config.yaml",
        classes_config_path: str | Path = "ml/configs/classes.yaml",
        num_classes_override: Optional[int] = None,
    ) -> "TerraSpectra3DCNN":
        """Instantiate TerraSpectra3DCNN directly from repository YAML configuration files."""
        with open(model_config_path, "r", encoding="utf-8") as f:
            model_cfg = yaml.safe_load(f)
        with open(classes_config_path, "r", encoding="utf-8") as f:
            classes_cfg = yaml.safe_load(f)

        if num_classes_override is not None:
            resolved_classes = int(num_classes_override)
        elif model_cfg.get("classification", {}).get("num_classes") is not None:
            resolved_classes = int(model_cfg["classification"]["num_classes"])
        else:
            resolved_classes = len(classes_cfg["classes"])

        return cls(model_cfg=model_cfg, num_classes=resolved_classes)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Validate 5D input and return [B, feature_dim] representation."""
        validate_model_input(x, spec=self.contract_spec)
        return self.feature_extractor(x)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Validate 5D input [B, 1, D, H, W] and return raw classification logits [B, K]."""
        features = self.extract_features(x)
        return self.classifier(features)

    def extract_vit_tokens(self, x: torch.Tensor) -> torch.Tensor:
        """Validate 5D input and return [B, N_tokens, feature_dim] tokens for Week 3 ViT."""
        validate_model_input(x, spec=self.contract_spec)
        return self.feature_extractor.extract_vit_tokens(x)

    @torch.no_grad()
    def predict_probabilities(self, x: torch.Tensor) -> torch.Tensor:
        """Apply softmax over raw logits for inference probability inspection."""
        logits = self.forward(x)
        return torch.softmax(logits, dim=-1)
