# TerraSpectra — Implemented 3D-CNN Architecture Specification (Day 9)

**Version:** 2.0.0  
**Date:** November 19, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Implementation Module:** `ml/src/terraspectra_ml/models/cnn3d.py`  
**Status:** Standalone 3D-CNN PyTorch architecture implemented and forward-pass verified (Training loop and ViT encoder not yet implemented).

---

## 1. End-to-End Architecture Flow

    Hyperspectral Input [B, 1, D, 9, 9] (float32)
           |
           v
    Input Contract Validation (validate_model_input)
           |
           v
    3D Convolution Blocks (Conv3DBlock x 3: 1 -> 8 -> 16 -> 32)
           |
           v
    Spatial-Spectral Feature Extraction (AdaptiveAvgPool3d -> Linear [B, 128])
           |
           v
    Classification Head (Dropout(0.2) -> Linear(128, K))
           |
           v
    Output Logits [B, K] (raw unnormalized scores)

---

## 2. Implemented Components (`cnn3d.py`)

### 2.1 Reusable Convolution Block (`Conv3DBlock`)
Each block encapsulates `nn.Conv3d` -> `nn.BatchNorm3d` -> `nn.GELU` -> `nn.Dropout3d(0.1)` configured directly from `ml/configs/model_config.yaml`:

| Block | Channels (`in -> out`) | Kernel `(k_d, k_h, k_w)` | Stride `(s_d, s_h, s_w)` | Padding `(p_d, p_h, p_w)` | Output Tensor Shape (Symbolic) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Input** | `1` | — | — | — | `[B, 1, D, 9, 9]` |
| **Block 1** | `1 -> 8` | `(7, 3, 3)` | `(2, 1, 1)` | `(3, 1, 1)` | `[B, 8, ceil(D/2), 9, 9]` |
| **Block 2** | `8 -> 16` | `(5, 3, 3)` | `(2, 1, 1)` | `(2, 1, 1)` | `[B, 16, ceil(D/4), 9, 9]` |
| **Block 3** | `16 -> 32` | `(3, 3, 3)` | `(1, 1, 1)` | `(1, 0, 0)` | `[B, 32, ceil(D/4), 7, 7]` |

### 2.2 Feature Extractor (`SpatialSpectral3DExtractor`)
- **Standalone Classification Path (`forward`):** Applies `AdaptiveAvgPool3d((1, 1, 1))` to collapse variable spectral depth `D_3` and `7 x 7` spatial extent into `[B, 32]`, followed by `Linear(32, 128)` + `GELU` to emit `[B, 128]`.
- **Week 3 ViT Interface (`extract_vit_tokens`):** Exposes `AdaptiveAvgPool3d((4, 5, 5))` reshaped into `[B, 25, 128]` spatial-spectral tokens so Week 3 ViT integration can reuse the exact same convolutional weights without refactoring.

### 2.3 Classification Head (`ClassificationHead`)
- `nn.Dropout(0.2)` -> `nn.Linear(128, K)` where `K` is bound dynamically from `ml/configs/classes.yaml` (provisional `K = 2`).
- Returns raw unnormalized logits `[B, K]`. Softmax is intentionally omitted from `forward()` (provided separately via `predict_probabilities()`) so training uses `nn.CrossEntropyLoss` directly.

---

## 3. Known Limitations & Unresolved Decisions
- **Provisional Class Count (`K = 2`):** Bound from `ml/configs/classes.yaml` (`confirmed: false`); will automatically adapt when Khushi locks the verified ground-truth label schema.
- **Unimplemented Downstream Stages:** Training loop (`Day 10`), real hyperspectral dataset training, and Vision Transformer encoder (`Week 3`) are not part of this implementation.
