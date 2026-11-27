# TerraSpectra — Week 3 Hybrid 3D-CNN + Vision Transformer Architecture (Day 18)

**Version:** 1.0.0  
**Date:** November 28, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Collaborator:** Khushi (ML Developer, `origin/khushi` @ `baea3c7`)  
**Branch:** `Harsh`

---

## 1. Objective
Combine local volumetric spatial-spectral feature extraction (`TerraSpectra3DCNN`) with global self-attention over spatial-spectral tokens (`TerraSpectraViT`) into a lightweight, testable hybrid architecture (`TerraSpectraHybridCNNViT`) calibrated for the NVIDIA RTX 3050 Laptop GPU (4 GB VRAM).

---

## 2. Architecture Overview & Single-Pass Flow
Rather than executing the 3D-CNN backbone twice, `TerraSpectraHybridCNNViT.extract_branch_representations(x)` validates the 5D input cube `[B, 1, D, H, W]` once and runs `cnn.feature_extractor.forward_conv_volume(x)` once to feed both downstream branches:

    Hyperspectral Cube [B, 1, D, H, W] (float32, finite)
                   |
       3D-CNN Volumetric Backbone (forward_conv_volume)
                   |
           +-------+-------+
           |               |
     Global Pool      Adaptive Pool [4, 5, 5]
     + Linear Proj    + Spatial-First Reshape
           |               |
     CNN Features     CNN Tokens [B, 25, 128]
       [B, 128]            |
           |          TerraSpectraViT ([CLS] + 2-Layer Pre-LN Encoder)
           |               |
           |          ViT Embedding [B, 128]
           |               |
           +-------+-------+
                   |
       ConcatProjectionFusion
       (Concat [B, 256] -> LayerNorm -> Linear(256, 128) -> GELU -> Dropout)
                   |
           Fused Features [B, 128]
                   |
       ClassificationHead (Dropout -> Linear(128, num_classes))
                   |
            Raw Logits [B, num_classes]

---

## 3. Feature Extraction & Fusion Strategy
- **3D-CNN Branch (`TerraSpectra3DCNN`):** Preserves standalone usability (`cnn(x)` -> `[B, K]`, `cnn.extract_features(x)` -> `[B, 128]`, `cnn.extract_vit_tokens(x)` -> `[B, 25, 128]`).
- **ViT Branch (`TerraSpectraViT`):** Preserves standalone usability (`vit(tokens)` -> `[B, K]`, `vit.extract_embedding(tokens)` -> `[B, 128]`) using `embed_dim=128`, `num_heads=4`, `num_layers=2`, `mlp_ratio=2.0`, and `[CLS]` pooling.
- **Selected Fusion Strategy (`ConcatProjectionFusion` in `fusion.py`):** Concatenation (`[B, 128] || [B, 128] -> [B, 256]`) followed by `LayerNorm(256)`, `Linear(256, 128)`, `GELU`, and `Dropout(0.1)`. Chosen because it preserves complementary local volumetric and global self-attention signals equally without adding heavy cross-attention memory overhead.

---

## 4. Verified Tensor Dimensions & Gradient Flow
| Stage / Tensor | Verified Shape & Dtype | Notes |
| :--- | :--- | :--- |
| **Model Input (`x`)** | `[B, 1, D, H, W]`, `torch.float32` | Validated via `validate_model_input()` ($D \ge 8$) |
| **CNN Global Features** | `[B, 128]`, `torch.float32` | Pooled & projected 3D-CNN summary vector |
| **CNN ViT Tokens** | `[B, 25, 128]`, `torch.float32` | `5 x 5` spatial grid $	imes$ `128` spectral-channel features |
| **ViT Embedding** | `[B, 128]`, `torch.float32` | `[CLS]` representation after final LayerNorm |
| **Fused Representation** | `[B, 128]`, `torch.float32` | Output of `ConcatProjectionFusion` |
| **Classification Logits** | `[B, num_classes]`, `torch.float32` | Raw unnormalized logits for `nn.CrossEntropyLoss` |

- **Gradient Verification:** Confirmed via `test_04_gradient_propagation_across_both_branches` that `CrossEntropyLoss.backward()` propagates non-zero gradients through `classifier`, `fusion`, `vit.encoder`, and `cnn.feature_extractor`.

---

## 5. Testing & Measured Resource Usage
- **Test Suite:** `python -m unittest discover -s ml/tests -v` -> **`Ran 56 tests in 10.176s` — `OK`** (`5` new tests in `ml/tests/test_hybrid_shapes.py` + `51` existing tests).
- **Measured Hardware Telemetry (`[4, 1, 64, 9, 9]` on `cuda` — NVIDIA GeForce RTX 3050 Laptop GPU):**
  - **Total / Trainable Parameters:** `329,710` / `329,710` (`1,287.93 KB` in `float32`)
  - **Initialization Time:** `172.57 ms`
  - **Forward / Backward Runtime:** `418.62 ms` / `78.92 ms`
  - **Peak CUDA VRAM:** `24.27 MB` allocated / `48.00 MB` reserved (< 1.2% of 4 GB budget)

---

## 6. Limitations & Day 19 Readiness
- **Verification Level Achieved:** **Architecture implemented, forward pass verified, gradient propagation verified, and integration tests passed** on synthetic software fixtures (real dataset integration and real training remain gated on Khushi's confirmation of dataset path, usable band indices, patch size, and ground-truth labels in `data.yaml` / `classes.yaml`).
- **Day 19 Readiness:** Ready to wire `model_type="hybrid"` into `ml/src/terraspectra_ml/training/train.py` and `ml/scripts/evaluate.py` without modifying the core training engine.
