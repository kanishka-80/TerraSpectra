# TerraSpectra — 3D-CNN Architecture Design Specification

**Version:** 1.0.0  
**Date:** November 13, 2026  
**Author:** Harsh (ML Engineering Lead)

---

## 1. Architecture Overview
The TerraSpectra 3D-CNN module serves as the joint spectral-spatial feature extractor at the front of the proposed **3D-CNN + Vision Transformer (ViT)** hybrid architecture. It ingests 5D hyperspectral patch tensors `[B, C, D, H, W]` and applies volumetric 3D convolutions across contiguous spectral bands (`D`) and local spatial neighborhoods (`H, W`).

---

## 2. Rationale for 3D-CNN over 2D-CNN
- **2D-CNN Limitation:** A 2D convolution applies kernels only across `(H, W)` while summing across all `D` spectral channels in the very first layer. This collapses local inter-band continuity and obscures narrow diagnostic absorption gradients (such as red-edge shifts at 690–730 nm and moisture dips at 970/1200 nm).
- **3D-CNN Advantage:** A 3D convolution slides a kernel `(k_d, k_h, k_w)` across both spectral depth `D` and spatial dimensions `(H, W)`, preserving localized spectral derivatives alongside spatial canopy texture.

---

## 3. Input Tensor Convention
Per `docs/ml/data-model-contract.md` and `ml/src/terraspectra_ml/models/input_contract.py`:
- **Shape:** `[B, C, D, H, W]`
  - `B`: Batch size (`B >= 1`, default `32`)
  - `C`: Input channels (`C = 1`, representing scalar reflectance volume)
  - `D`: Spectral depth (`D >= 4`, symbolic until target sensor band count is locked)
  - `H, W`: Odd spatial patch window (default `13 x 13` centered on target pixel)
- **Data Type:** `float32`, free of `NaN` and `Inf` values.

---

## 4. Proposed Convolution Block Design & Tensor Transformations

Because spatial patches are compact (`H = W = 13`) while spectral depth is large (`D ~ 100-224`), the 3D-CNN strides along the spectral axis (`s_d = 2`) in early blocks while preserving spatial resolution (`s_h = s_w = 1`).

| Stage | Input Shape | Operation | Output Shape (Symbolic) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Input** | `[B, 1, D, H, W]` | `validate_model_input` | `[B, 1, D, H, W]` | Enforces 5D shape, `C=1`, odd `H,W`, `float32`, no `NaN`/`Inf`. |
| **Conv Block 1** | `[B, 1, D, H, W]` | `Conv3d(1->8, k=(7,3,3), s=(2,1,1), p=(3,1,1))` + `BatchNorm3d(8)` + `GELU` | `[B, 8, D1, H, W]` (`D1 = floor((D-1)/2)+1`) | Captures broad low-level spectral slopes while preserving `H x W`. |
| **Conv Block 2** | `[B, 8, D1, H, W]` | `Conv3d(8->16, k=(5,3,3), s=(2,1,1), p=(2,1,1))` + `BatchNorm3d(16)` + `GELU` | `[B, 16, D2, H, W]` (`D2 = floor((D1-1)/2)+1`) | Extracts mid-level compound absorption valleys; halves spectral depth again. |
| **Conv Block 3** | `[B, 16, D2, H, W]` | `Conv3d(16->32, k=(3,3,3), s=(1,1,1), p=(1,0,0))` + `BatchNorm3d(32)` + `GELU` + `Dropout3d(0.1)` | `[B, 32, D2, H-2, W-2]` | Joint spectral-spatial refinement; unpadded spatial `3x3` reduces border padding influence (`13 -> 11`). |
| **Adaptive Pool** | `[B, 32, D2, H-2, W-2]` | `AdaptiveAvgPool3d((D_p, H_p, W_p))` | `[B, 32, D_p, H_p, W_p]` | Decouples feature shape from variable sensor band count `D`. |
| **Aggregation** | `[B, 32, D_p, H_p, W_p]` | Flatten + `Linear(32*D_p*H_p*W_p -> F)` (`F = 128`) | `[B, F]` | Compact spectral-spatial embedding for classification or ViT projection. |

---

## 5. Pooling Strategy Justification
- **Avoiding Early Spatial Pooling:** Applying `MaxPool3d` on a `13 x 13` spatial patch would rapidly collapse spatial context. Instead, spectral downsampling is handled via strided 3D convolutions (`s_d = 2`), and final dimension standardization uses `AdaptiveAvgPool3d`.
- **Sensor Agnosticism:** `AdaptiveAvgPool3d((D_p, H_p, W_p))` guarantees that whether the input cube has `D = 103`, `200`, or `224` bands, the downstream feature representation has an exact, deterministic shape.

---

## 6. Classification Head & Future ViT Connection

    Hyperspectral Input [B, 1, D, H, W]
           |
           v
    3D-CNN Convolution Blocks 1 -> 2 -> 3  ([B, 32, D2, H-2, W-2])
           |
           +---> [Standalone 3D-CNN Baseline Path]
           |     AdaptiveAvgPool3d((1, 1, 1)) -> Flatten -> Linear(32 -> 128) -> [B, 128]
           |
           +---> [Hybrid 3D-CNN + ViT Path (Week 2)]
                 AdaptiveAvgPool3d((D_p, H_p, W_p)) -> Token Projection -> [B, N_tokens, E=128]
                 -> ViT Encoder -> Pooled Embedding [B, 128]
           |
           v
    Classification Head: Dropout(0.2) -> Linear(128 -> K) -> Logits [B, K] -> Softmax [B, K]

---

## 7. Memory, Computational & Pending Considerations
- **VRAM Budget (6 GB RTX 3050):** Base channel progression `[8, 16, 32]` with spectral stride `2` keeps 5D activation maps compact (~15-30 MB per batch of 32 patches).
- **Pending Decisions:**
  1. Final sensor band count `D` once a true hyperspectral dataset is mounted.
  2. Choice between spatial tokenization vs. spectral-spatial tokenization for the Week 2 ViT module.
