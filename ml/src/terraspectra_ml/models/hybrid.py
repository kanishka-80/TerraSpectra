"""Hybrid 3D-CNN + Vision Transformer architecture for TerraSpectra (Day 18).

Combines single-pass volumetric 3D-CNN spatial-spectral feature extraction with
Transformer self-attention over CNN-derived spatial-spectral tokens, fused via
ConcatProjectionFusion into a linear classification head returning raw logits.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional
import torch
from torch import nn
import yaml

from terraspectra_ml.models.cnn3d import ClassificationHead, TerraSpectra3DCNN
from terraspectra_ml.models.fusion import ConcatProjectionFusion
from terraspectra_ml.models.input_contract import validate_model_input
from terraspectra_ml.models.vit import TerraSpectraViT, ViTArchitectureSpec


class TerraSpectraHybridCNNViT(nn.Module):
    """End-to-end Hybrid 3D-CNN + ViT model accepting [B, 1, D, H, W] hyperspectral cubes."""

    def __init__(
        self,
        cnn_branch: TerraSpectra3DCNN,
        vit_branch: TerraSpectraViT,
        num_classes: int = 2,
        fused_dim: int = 128,
        fusion_dropout: float = 0.1,
        head_dropout: float = 0.2,
    ) -> None:
        super().__init__()
        if num_classes < 2:
            raise ValueError(f"num_classes must be >= 2, got {num_classes}.")

        self.cnn = cnn_branch
        self.vit = vit_branch
        self.num_classes = int(num_classes)

        cnn_dim = int(self.cnn.feature_extractor.feature_dim)
        vit_dim = int(self.vit.spec.embed_dim)
        self.fused_dim = int(fused_dim)

        self.fusion = ConcatProjectionFusion(
            cnn_dim=cnn_dim,
            vit_dim=vit_dim,
            fused_dim=self.fused_dim,
            dropout=fusion_dropout,
        )
        self.classifier = ClassificationHead(
            in_features=self.fused_dim,
            num_classes=self.num_classes,
            dropout=head_dropout,
        )

    @classmethod
    def from_configs(
        cls,
        hybrid_config_path: str | Path = "ml/configs/hybrid_3dcnn_vit.yaml",
        model_config_path: str | Path = "ml/configs/model_config.yaml",
        vit_config_path: str | Path = "ml/configs/vit.yaml",
        classes_config_path: str | Path = "ml/configs/classes.yaml",
        num_classes_override: Optional[int] = None,
    ) -> "TerraSpectraHybridCNNViT":
        with open(hybrid_config_path, "r", encoding="utf-8") as hf:
            hybrid_cfg: Dict[str, Any] = yaml.safe_load(hf) or {}

        if num_classes_override is not None:
            resolved_classes = int(num_classes_override)
        else:
            with open(classes_config_path, "r", encoding="utf-8") as cf:
                classes_cfg = yaml.safe_load(cf)
            resolved_classes = len(classes_cfg["classes"])

        cnn_branch = TerraSpectra3DCNN.from_configs(
            model_config_path=model_config_path,
            classes_config_path=classes_config_path,
            num_classes_override=resolved_classes,
        )
        vit_spec = ViTArchitectureSpec.from_yaml(vit_config_path)
        vit_branch = TerraSpectraViT(spec=vit_spec, num_classes=resolved_classes)

        fusion_cfg = hybrid_cfg.get("fusion", {})
        cls_cfg = hybrid_cfg.get("classification", {})
        fused_dim = int(fusion_cfg.get("fused_dim", cls_cfg.get("in_features", 128)))
        fusion_dropout = float(fusion_cfg.get("dropout", 0.1))
        head_dropout = float(cls_cfg.get("dropout", 0.2))

        return cls(
            cnn_branch=cnn_branch,
            vit_branch=vit_branch,
            num_classes=resolved_classes,
            fused_dim=fused_dim,
            fusion_dropout=fusion_dropout,
            head_dropout=head_dropout,
        )

    def extract_branch_representations(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """Run single-pass 3D-CNN extraction + ViT encoding + fusion, returning intermediate tensors."""
        validate_model_input(x, spec=self.cnn.contract_spec)

        # Single volumetric 3D-CNN forward pass shared by both global and token paths
        vol = self.cnn.feature_extractor.forward_conv_volume(x)

        cnn_pooled = self.cnn.feature_extractor.global_pool(vol).flatten(start_dim=1)
        cnn_features = self.cnn.feature_extractor.feature_proj(cnn_pooled)  # [B, cnn_dim]

        vit_grid = self.cnn.feature_extractor.vit_pool(vol)  # [B, C_last, D_p, H_p, W_p]
        b, c, d_p, h_p, w_p = vit_grid.shape
        vit_tokens = vit_grid.permute(0, 3, 4, 1, 2).reshape(b, h_p * w_p, c * d_p)  # [B, N_tokens, D_in]

        vit_embedding = self.vit.extract_embedding(vit_tokens)  # [B, vit_dim]
        fused_features = self.fusion(cnn_features, vit_embedding)  # [B, fused_dim]

        return {
            "cnn_features": cnn_features,
            "vit_tokens": vit_tokens,
            "vit_embedding": vit_embedding,
            "fused_features": fused_features,
        }

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Accept 5D hyperspectral input [B, 1, D, H, W] and return raw logits [B, num_classes]."""
        reps = self.extract_branch_representations(x)
        return self.classifier(reps["fused_features"])

    @torch.no_grad()
    def predict_probabilities(self, x: torch.Tensor) -> torch.Tensor:
        """Apply softmax over raw logits for post-hoc inference probability inspection."""
        return torch.softmax(self.forward(x), dim=-1)
