# TerraSpectra — Week 3 Standalone ViT Training & Checkpoint Report (Day 17)

**Version:** 1.0.0  
**Date:** November 27, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

---

## 1. Objective
Connect the standalone Vision Transformer (`TerraSpectraViT`) implemented on Day 16 to TerraSpectra's existing PyTorch training, validation, and checkpointing pipeline without duplicating data-loading or training-engine code, and verify end-to-end training mechanics on RTX 3050 CUDA hardware.

---

## 2. Existing Infrastructure Reused
- **Training & Validation Loops (`ml/src/terraspectra_ml/training/engine.py`):** Reused `train_one_epoch()` and `validate_one_epoch()` directly; `_unpack_and_prepare_batch()` adapts 4D `[B, D, H, W]` DataLoader batches to 5D `[B, 1, D, H, W]` (`float32`), which `TerraSpectraViT.forward()` accepts natively.
- **Shared Entry Point & Checkpointing (`ml/src/terraspectra_ml/training/train.py`):** Extended `main()` with `model_type="vit"` and `resume_from` while reusing `run_training()`, `set_reproducibility_seed()`, `build_optimizer()`, `build_loss_function()`, `save_checkpoint()`, and `load_checkpoint()`.
- **Collaborator Data Contract (`origin/khushi` @ `baea3c7`):** Preserved Khushi's preprocessing, spatial splitting, and DataLoader contract without duplication.

---

## 3. Model & Training Configuration
- **Model (`ml/configs/vit.yaml`):** `TerraSpectraViT` (`271,362` trainable parameters, `1,060.01 KB` in `float32`), `embed_dim=128`, `input_token_dim=128`, `num_tokens=25` (`5 x 5` spatial grid), `num_heads=4`, `num_layers=2`, `mlp_ratio=2.0`, `spectral_bins=16`, `dropout=0.10`, `use_cls_token=true`, `pooling="cls"`, `norm_first=true`.
- **Training (`ml/configs/training.yaml` + `vit.yaml` overrides):** `AdamW` (`lr=0.0003`, `weight_decay=0.01`), `CrossEntropyLoss`, `random_seed=42`, `deterministic=true`, `batch_size=8`, `num_workers=0`, checkpoints saved to `outputs/experiments/vit/checkpoints/`, logs saved to `outputs/experiments/vit/logs/`.

---

## 4. Data Readiness & Controlled Training Decision
- **Dataset Availability:** `UNCONFIRMED` (`source.identifier: UNCONFIRMED`, `source.path: null` in `ml/configs/data.yaml`).
- **Label Verification:** Provisional `{0: "healthy", 1: "stressed"}` (`confirmed: false` in `ml/configs/classes.yaml`).
- **Band Information:** `bands.indices: null` (`selected_bands_count: null`).
- **Patch Dimensions:** Unresolved discrepancy (`patch.size: 16` in `origin/khushi:ml/configs/data.yaml` vs. `patch_size: 13` in local `data.yaml` vs. `9x9` default in `patch_dataset.py`).
- **Decision (Case B):** Because real labelled hyperspectral cubes and ground-truth masks are still unconfirmed, **controlled scientific training was not performed** and no real classification accuracy is claimed. A **synthetic software smoke-training job** was executed to verify training, validation, and checkpointing mechanics.

---

## 5. Training Integration
- Added `_deep_merge_dicts()` and `model_type: str = "3dcnn"` (`"3dcnn"` or `"vit"`), `vit_config_path`, and `resume_from` arguments to `terraspectra_ml.training.train.main()`.
- Added `training_overrides` to `ml/configs/vit.yaml` and excluded `outputs/` in `.gitignore`.

---

## 6. Smoke-Test Results (Synthetic Software Smoke Test)
- **Experiment Type:** Synthetic software smoke test (`24` train / `8` val synthetic 4D patches of shape `[64, 9, 9]`, `batch_size=8`, `3` epochs, `seed=42` — **does NOT represent real hyperspectral accuracy**).
- **Execution Command:** `terraspectra_ml.training.train.main(..., model_type="vit")`
- **Loss & Optimization Behavior:**
  - Epoch 1: `train_loss = 0.870435`, `val_loss = 0.586676`
  - Epoch 2–3: finite `train_loss` and `val_loss` with best `val_loss = 0.572629`
  - Verified finite forward logits, non-zero backward gradients, parameter updates, and `model.eval()` validation mode.
- **Checkpoint Verification:**
  - Best checkpoint saved: `outputs/experiments/vit/checkpoints/vit_standalone_best.pt`
  - Periodic recovery checkpoint saved: `outputs/experiments/vit/checkpoints/vit_standalone_epoch_0003.pt`
  - State restoration verified via `load_checkpoint()` (`restored_epoch = 3`).

---

## 7. Controlled Training & Validation Results
- **Status:** Deferred (`0` real-data epochs run) pending Khushi's confirmation of dataset path, usable spectral bands, patch size, and ground-truth class labels.

---

## 8. Resource Usage (Measured)
- **Device:** `cuda` (`NVIDIA GeForce RTX 3050 Laptop GPU`, 4 GB VRAM)
- **Model Parameters:** `271,362` (`1,060.01 KB` in `float32`)
- **3-Epoch Smoke Runtime:** `3.815 s`
- **Peak CUDA VRAM Allocated:** `23.72 MB` (< 0.6% of 4 GB VRAM budget)

---

## 9. Limitations & Remaining Blockers
- Real hyperspectral scene file path, usable spectral band indices (`D`), finalized spatial patch size (`9x9` vs. `13x13` vs. `16x16`), and confirmed class labels (`confirmed: true`) remain pending from Data Engineering (`Khushi`).

---

## 10. Day 18 Readiness
- **Verification Level Achieved:** **Synthetic training workflow verified** (`51/51` unit & integration tests passing in `5.811s`).
- `TerraSpectraViT` (`extract_embedding()` -> `[B, 128]`, `forward()` -> `[B, num_classes]`) and `TerraSpectra3DCNN` (`extract_features()` -> `[B, 128]`, `extract_vit_tokens()` -> `[B, 25, 128]`) are ready for Day 18 Hybrid CNN-ViT integration.
