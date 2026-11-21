# TerraSpectra — Week 2 Data-to-Model Integration Report (Day 12)

**Version:** 1.0.0  
**Date:** November 22, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Primary Collaborator:** Khushi (ML & Data Engineering, branch `origin/khushi` @ `f032914`)  
**Working Branch:** `Harsh`

---

## 1. Integration Status Matrix

| Pipeline Stage | Module / Entry Point | Status | Evidence / Notes |
| :--- | :--- | :---: | :--- |
| **Data Preprocessing** | `ml/src/terraspectra_ml/data/preprocessing.py` (`StandardNormalizer`) | **Successfully Verified** | Executed `fit_transform` on train split and `transform` on val split; outputs finite `float32` tensors. |
| **Spatial Splitting** | `ml/src/terraspectra_ml/evaluation/spatial_split.py` (`spatial_group_split`) | **Successfully Verified** | Confirmed zero group overlap across `train_groups`, `validation_groups`, and `test_groups`. |
| **Patch Extraction & DataLoader** | `patch_dataset.py` (`extract_patches`) & `loaders.py` (`make_dataloader`) | **Successfully Verified** | Yields 4D `float32` batches `[B, D, H, W]` + 1D `int64` labels `[B]`. |
| **4D -> 5D Input Contract Bridge** | `input_contract.py` (`adapt_4d_patch_batch_to_5d`) | **Successfully Verified** | Un-squeezes channel axis `[B, D, H, W] -> [B, 1, D, H, W]` without axis permutation; verified for both `9x9` and `16x16` patches. |
| **3D-CNN Forward, Loss & Backward** | `cnn3d.py` + `losses.py` + `engine.py` | **Successfully Verified** | Verified forward logits `[B, K]`, finite `CrossEntropyLoss`, gradient flow, and `AdamW` weight updates on CUDA (`27.69 MB` peak VRAM). |
| **Validation & Evaluation** | `engine.py` (`validate_one_epoch`) + `ml/scripts/evaluate.py` | **Successfully Verified** | Verified `eval()` + `@torch.no_grad()` inference, metrics calculation, and confusion matrix export without weight updates. |
| **Real Hyperspectral Dataset Run** | `ml/configs/data.yaml` & `ml/configs/classes.yaml` | **Blocked** | `source.identifier: UNCONFIRMED`, `path: null`, `bands.indices: null`, and `confirmed: false` in `classes.yaml`. |
| **Week 3 ViT Encoder Integration** | `SpatialSpectral3DExtractor.extract_vit_tokens` | **Proposed (Week 3)** | Token interface `[B, 25, 128]` ready; ViT encoder not started per Week 2 scope. |

---

## 2. Khushi's Data Pipeline & Contract Findings

1. **Data Flow Verified (`origin/khushi` @ `f032914`):**
   - `raster_reader.py` $\rightarrow$ `quality_checks.py` $\rightarrow$ `preprocessing.py` (`StandardNormalizer`) $\rightarrow$ `patch_dataset.py` (`extract_patches`) $\rightarrow$ `spatial_split.py` (`spatial_group_split`) $\rightarrow$ `loaders.py` (`make_dataloader`).
2. **Tensor & Label Alignment:**
   - `make_dataloader()` emits `(patches: torch.float32 [B, D, H, W], labels: torch.int64 [B])` using a seeded `torch.Generator`.
   - `train_one_epoch()`, `validate_one_epoch()`, and `evaluate_model_on_loader()` invoke `_unpack_and_prepare_batch()`, which calls `adapt_4d_patch_batch_to_5d()` to produce `[B, 1, D, H, W]` `float32` tensors matching `TerraSpectra3DCNN`.
3. **Patch Size Configuration Note (`9 x 9` vs. `16 x 16`):**
   - `patch_dataset.py` defaults to `patch_size=9`, whereas Khushi's Week 2 `data.yaml` specifies `patch.size: 16` (`stride: 8`). Both `9 x 9` and `16 x 16` were verified end-to-end with `TerraSpectra3DCNN` (via `InputContractSpec(expected_height=16, expected_width=16, require_odd_spatial=False)`). Both teams will lock the final patch size once the real scene spatial resolution is confirmed.

---

## 3. Integration Tests, GPU Smoke Results & Limitations

- **Unit & Integration Test Suite (`python -m unittest discover -s ml/tests -v`):**
  - **Result:** `Ran 40 tests in 25.281s` — `OK` (including `test_end_to_end_khushi_dataloader_to_3dcnn_train_val_eval` and `test_khushi_data_yaml_16x16_patch_compatibility` in `ml/tests/test_data_model_integration.py`).
- **CUDA Forward + Backward + Optimizer Smoke Check:**
  - **Device:** `cuda` (`NVIDIA GeForce RTX 3050 Laptop GPU`, 4 GB VRAM budget)
  - **Batch:** `[16, 64, 9, 9]` (`batch_size=8`, `AdamW`, `CrossEntropyLoss`)
  - **Result:** `Integration GPU Smoke OK | Device: cuda | Train Loss: 0.6916 | Peak VRAM MB: 27.69`
- **Limitations:**
  - All integration tests executed Khushi's real Python modules on **explicitly labeled synthetic hyperspectral cubes** because the real scene file, usable band indices, and verified class labels (`confirmed: true`) are still pending. Zero real hyperspectral classification accuracy is claimed.
