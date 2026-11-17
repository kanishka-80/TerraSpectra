# TerraSpectra — Week 2 Architecture & Data Contract Decisions (Day 8)

**Version:** 1.0.0  
**Date:** November 18, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Primary Collaborator:** Khushi (ML & Data Engineering)

---

## 1. Decision Epistemic Status Legend
Every specification in this document is explicitly tagged:
- **[CONFIRMED]** — Verified by inspection of actual repository code or data files.
- **[AGREED]** — Aligned across Khushi's data pipeline (`origin/khushi`) and Harsh's ML contracts.
- **[PROPOSED]** — Calibrated engineering baseline ready for Day 9 implementation, not yet empirically benchmarked.
- **[UNRESOLVED]** — Blocked pending final dataset scene and ground-truth label verification.

---

## 2. Input Tensor Convention & DataLoader Interface
1. **3D-CNN Input Tensor Convention [CONFIRMED]:** `[Batch, Channels, Depth, Height, Width]` (`B_C_D_H_W`) with `C = 1` scalar reflectance volume.
2. **Khushi DataLoader Output Shape [CONFIRMED]:** Inspection of `origin/khushi:ml/src/terraspectra_ml/data/patch_dataset.py` and `loaders.py` confirms that `PatchDataset` and `create_torch_loader` emit **4D batches** of shape `(batch_size, bands, patch_size, patch_size)` with default `patch_size=9` and `batch_size=16`.
3. **4D-to-5D Adapter Bridge [CONFIRMED]:** Implemented `adapt_4d_patch_batch_to_5d()` in `ml/src/terraspectra_ml/models/input_contract.py` to insert the `C = 1` channel axis (`[B, D, H, W] -> [B, 1, D, H, W]`) and validate shape, dtype, and numerical integrity before forward execution.
4. **Spatial Patch Dimensions [AGREED]:** Default patch window updated from `13 x 13` to **`9 x 9`** (`patch_height: 9`, `patch_width: 9`) to match Khushi's `extract_patches(patch_size=9)` default while preserving an odd center pixel.
5. **Spectral Bands, Ordering & Normalization [AGREED / UNRESOLVED]:**
   - *Rule [AGREED]:* `float32` normalized reflectance in `[0.0, 1.0]`, ascending wavelength order, zero `NaN`/`Inf` in valid patches.
   - *Band Count `D` [UNRESOLVED]:* Exact usable band count `D` remains symbolic (`null` in `model_config.yaml`) until Khushi locks the primary hyperspectral scene.

---

## 3. Prediction Task & Class Mapping
- **Task Name [PROPOSED / UNRESOLVED]:** Single-date hyperspectral crop stress classification (`confirmed: false` in `ml/configs/classes.yaml`).
- **Verification Status [CONFIRMED BLOCKER]:** Inspection of `origin/khushi:docs/dataset/label-audit.md` confirms that no ground-truth label CSV or satellite scene is marked verified yet.
- **Output Dimensions [PROPOSED]:** Dynamic output neurons `K` bound at runtime from `ml/configs/classes.yaml` (provisional `K = 2`: `0: healthy`, `1: stressed`), emitting raw `float32` logits `[B, K]`.

---

## 4. Finalized 3D-CNN & Training Configuration (Day 9 Blueprint)
- **3D-CNN Architecture (`ml/configs/model_config.yaml`) [PROPOSED]:**
  - 3 volumetric blocks: `1 -> 8` (`k=(7,3,3), s=(2,1,1), p=(3,1,1)`), `8 -> 16` (`k=(5,3,3), s=(2,1,1), p=(2,1,1)`), `16 -> 32` (`k=(3,3,3), s=(1,1,1), p=(1,0,0)`), with `BatchNorm3d`, `GELU`, and `Dropout3d(0.1)`.
  - Spatial progression on `9 x 9` patches: `9x9 -> 9x9 -> 9x9 -> 7x7`, followed by `AdaptiveAvgPool3d((1, 1, 1))` (standalone baseline `[B, 32] -> Linear [B, 128]`) or `AdaptiveAvgPool3d((4, 5, 5))` (Week 3 ViT token interface).
- **Training Configuration (`ml/configs/training.yaml`) [PROPOSED]:**
  - `batch_size: 16`, `learning_rate: 0.0003`, `optimizer: AdamW`, `weight_decay: 0.01`, `num_epochs: 30`, `loss_function: CrossEntropyLoss`, `random_seed: 42`, `num_workers: 0`.

---

## 5. Development Subset & Compute Constraints
- **Development Smoke-Test Subset [PROPOSED]:** When Khushi produces the first prepared patch array from a candidate scene, reserve a small, spatially contiguous smoke-test slice (e.g., 64–128 valid patches across available classes, isolated from final test blocks) solely to verify end-to-end forward pass, loss backward pass, and checkpoint serialization. Synthetic tensors in `ml/tests/` remain strictly for structural shape validation.
- **Hardware & Memory Constraints [CONFIRMED]:**
  - **GPU:** NVIDIA GeForce RTX 3050 Laptop GPU (**4 GB VRAM**).
  - **Host:** 16 GB System RAM, Intel Core i5-11400H.
  - **Design Impact:** Conservative `batch_size=16`, `9x9` spatial window, and compact `[8, 16, 32]` channel widths keep 5D feature activations small (~8–15 MB per batch) to prevent CUDA out-of-memory errors on 4 GB VRAM. Empirical peak VRAM will be measured in Day 9/10 benchmarks.

---

## 6. Unresolved Decisions & Blockers
1. **[BLOCKER — Khushi]:** Final selection of primary hyperspectral dataset cube, usable band count `D`, and verified ground-truth label mapping (`confirmed: true`).
2. **[NON-BLOCKING — Harsh]:** Day 9 implementation of `ml/src/terraspectra_ml/models/cnn3d.py` and forward-pass unit tests (unblocked via symbolic `D` and `AdaptiveAvgPool3d`).
