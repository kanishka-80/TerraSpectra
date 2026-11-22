# TerraSpectra — Week 2 ML Pipeline Audit & Readiness Report (Day 13)

**Version:** 1.0.0  
**Date:** November 23, 2026  
**Auditor:** Harsh (ML Engineering Lead)  
**Collaborator:** Khushi (ML & Data Engineering, branch `origin/khushi` @ `f032914`)  
**Audited Branch:** `Harsh` (`HEAD` @ `f55126f`)

---

## A. Week 2 Summary
During Week 2 (Days 8–12), the ML engineering track completed the 3D-CNN spatial-spectral architecture (`TerraSpectra3DCNN`), tensor input contract validation and 4D-to-5D DataLoader adaptation, reproducible PyTorch training and validation engines, best/recovery checkpoint management, scikit-learn classification metrics and JSON/Markdown baseline report generation, and end-to-end integration tests bridging Khushi's data pipeline into training and evaluation.

---

## B. Component Status Audit

| Component | Status | Evidence | Remaining Issues |
| :--- | :--- | :--- | :--- |
| **Data Pipeline** (`origin/khushi` @ `f032914`) | **Implemented; Blocked on Real Scene** | `preprocessing.py` (`StandardNormalizer`), `patch_dataset.py` (`extract_patches`), `spatial_split.py` (`spatial_group_split`), and `loaders.py` (`make_dataloader`) verified via `test_data_model_integration.py`. | `data.yaml` has `source.identifier: UNCONFIRMED`, `path: null`, `bands.indices: null`; `patch.size: 16` vs `patch_dataset.py` default `9` requires final alignment. |
| **Input Contract** (`input_contract.py`) | **Completed and Verified** | Enforces 5D `[B, 1, D, H, W]`, `float32`, finite values, and adapts 4D `[B, D, H, W]` batches via `adapt_4d_patch_batch_to_5d()`; 21 tests pass in `test_input_contract.py` & `test_tensor_shapes.py`. | `InputContractSpec` defaults to `9x9` (`require_odd_spatial=True`); `16x16` requires passing custom `InputContractSpec`. |
| **3D-CNN** (`cnn3d.py`) | **Completed and Verified** | `TerraSpectra3DCNN` (`24,682` params, `96.41 KB` float32 state) verified on CPU and CUDA; 7 tests pass in `test_cnn3d.py`. | Exposes `extract_vit_tokens()` on `model.feature_extractor` rather than a top-level delegator on `TerraSpectra3DCNN`. |
| **Training Engine** (`training/engine.py`, `train.py`, `losses.py`) | **Completed and Verified** | Separated `train_one_epoch()` and `validate_one_epoch()`, configurable `CrossEntropyLoss` & `AdamW`/`Adam`, RNG seeding, and CUDA smoke run (`27.69–32.97 MB` peak VRAM). | No learning-rate scheduler or gradient accumulation yet (low priority; not needed for 96 KB baseline model). |
| **Validation** (`training/engine.py`) | **Completed and Verified** | `validate_one_epoch()` enforces `model.eval()` + `@torch.no_grad()` and verified zero parameter mutation in `test_training.py`. | None. |
| **Checkpointing** (`training/train.py`) | **Completed and Verified** | Saves `{run_id}_best.pt` and `{run_id}_epoch_{epoch:04d}.pt` with model/optimizer states, seed, and config; live audit verified `Ckpt Restored: True`. | Real training checkpoint does not exist yet due to pending real dataset. |
| **Evaluation Metrics** (`evaluation/metrics.py`, `reports.py`, `evaluate.py`) | **Completed and Verified** | Computes Accuracy, Macro/Weighted/Micro Precision, Recall, F1, `(actual x predicted)` confusion matrix, per-class metrics, imbalance warnings, and JSON/MD export; 6 tests pass in `test_metrics.py`. | Real evaluation run blocked until `classes.yaml` has `confirmed: true` and a real checkpoint is trained. |
| **Integration Tests** (`test_data_model_integration.py`) | **Completed and Verified** | Executes Khushi's real data modules end-to-end through `TerraSpectra3DCNN`, training, validation, and evaluation on synthetic cubes. | Synthetic cubes only; real scene integration test pending dataset arrival. |

---

## C. Pipeline Verification
End-to-end boundary verification executed on `Harsh`:
1. **Data -> Input Contract:** `make_dataloader()` (`[B, D, H, W]`, `float32`) $\rightarrow$ `adapt_4d_patch_batch_to_5d()` (`[B, 1, D, H, W]`, `float32`) — **Verified** (`9x9` and `16x16`).
2. **Input Contract -> 3D-CNN -> Loss -> Optimizer:** `TerraSpectra3DCNN` logits (`[B, 2]`) $\rightarrow$ `CrossEntropyLoss` $\rightarrow$ `backward()` $\rightarrow$ `AdamW` parameter update — **Verified** on CUDA.
3. **Validation & Evaluation:** `validate_one_epoch()` and `evaluate_model_on_loader()` preserve weights (`model.eval()`, `@torch.no_grad()`) and produce deterministic confusion matrices and reports — **Verified**.
4. **Checkpointing:** `save_checkpoint()` + `load_checkpoint()` restores `model_state_dict`, `optimizer_state_dict`, `epoch`, and `random_seed` identically (`Ckpt Restored: True`) — **Verified**.

---

## D. Resource Analysis (Hardware Compatibility)
- **Target Hardware:** NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM), 16 GB System RAM, Intel Core i5-11400H, Python 3.11.
- **Measured Footprint:**
  - **Model Parameters:** `24,682` (`96.41 KB` in `float32`).
  - **Measured Peak CUDA VRAM:** `30.87 MB` during live Day 13 audit (`27.69 MB`–`32.97 MB` across Day 10–12 CUDA smoke checks at `batch_size=8..16`, `D=64`, `9x9` patches) — using **< 1% of the 4,096 MB VRAM budget**.
  - **Bottlenecks:** Model VRAM is negligible; main runtime consideration on Windows is keeping `num_workers: 0` in `training.yaml` for small in-memory patch tensors to avoid multiprocessing spawn overhead.

---

## E. Test Results
- **Command Executed:** `python -m unittest discover -s ml/tests -v`
- **Result:** `Ran 40 tests in 6.593s` — **`OK`** (40 passed, 0 failed, 0 skipped):
  - `test_cnn3d.py`: 7 passed
  - `test_input_contract.py`: 12 passed
  - `test_tensor_shapes.py`: 9 passed
  - `test_training.py`: 4 passed
  - `test_metrics.py`: 6 passed
  - `test_data_model_integration.py`: 2 passed
- **Live Audit Probe:** `AUDIT OK | Device: cuda | Params: 24682 | Size KB: 96.41 | ViT Tokens: (4, 25, 128) | Ckpt Restored: True | Peak VRAM MB: 30.87`

---

## F. Data Leakage Audit
- **Spatial Autocorrelation Control:** Khushi's `spatial_split.py` provides `spatial_group_split()` (group-disjoint partitioning) and buffered spatial row-boundary splitting (`train_mask`, `validation_mask`, `test_mask` separated by `buffer_pixels`).
- **Normalization Isolation:** `StandardNormalizer.fit()` computes channel-wise mean and standard deviation strictly on training patches; `transform()` applies those statistics to validation/test splits.
- **Test-Set Isolation:** `training.yaml` sets `use_test_set_during_training: false`, and `train.py` never accesses test loaders.
- **Identified Risk:** Final scene coordinates and `buffer_pixels` ($\ge 4$ pixels for `9x9` patches or $\ge 8$ pixels for `16x16` patches) must be verified once the real hyperspectral raster arrives.

---

## G. Technical Debt & Issues by Severity

| Severity | Issue | Location | Evidence | Impact | Suggested Fix | Blocks Week 3? |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Critical** | Unconfirmed dataset & labels | `ml/configs/data.yaml`, `classes.yaml` | `source.identifier: UNCONFIRMED`, `confirmed: false` | Prevents real model training and baseline accuracy reporting. | Lock real scene path, usable bands, and class mask with Khushi. | **No** (software dev unblocked; real training blocked) |
| **High** | Patch size mismatch (`9x9` vs `16x16`) | `ml/configs/data.yaml` vs `input_contract.py` | `data.yaml` sets `patch.size: 16`; `InputContractSpec` defaults to `9x9` | Default `9x9` contract rejects `16x16` batches unless configured. | Align `data.yaml` and `InputContractSpec` once real scene resolution is locked. | **No** |
| **Medium** | Khushi's `data/` modules live on `origin/khushi` | Git branches `Harsh` vs `origin/khushi` | `test_data_model_integration.py` loads `origin/khushi` via `git show` | Local imports require branch sync before unified CLI training. | Merge `origin/khushi` and `Harsh` into integration branch at Week 3 kickoff. | **No** |
| **Medium** | `extract_vit_tokens()` nested under `feature_extractor` | `ml/src/terraspectra_ml/models/cnn3d.py` | Calling `m.extract_vit_tokens()` directly raises `AttributeError`; `m.feature_extractor.extract_vit_tokens()` works | Minor ergonomic friction when wiring Week 3 hybrid model. | Add thin `extract_vit_tokens()` wrapper method on `TerraSpectra3DCNN` in Week 3. | **No** |
| **Low** | Unstaged local edit in root `README.md` | `README.md` | Appears in `git status` as unstaged | Unrelated to ML pipeline; kept out of ML commits. | Coordinate root `README.md` cleanup with team lead. | **No** |

---

## H. Week 3 Readiness (Vision Transformer Integration)
- **Readiness Verdict:** **READY for Week 3 ViT architectural implementation.**
- **Interface Verified:** `m.feature_extractor.extract_vit_tokens(x)` accepts `[B, 1, D, H, W]` (`float32`) and outputs normalized spatial-spectral token embeddings `[B, N_tokens, 128]` (`(4, 25, 128)` for `9x9` patches via `AdaptiveAvgPool3d((1, 5, 5))` + `LayerNorm(128)`).
- **Week 3 Integration Contract:** Week 3 will attach a lightweight Transformer Encoder (`d_model=128`, learnable positional embeddings, `[CLS]` or mean token pooling) + classification head on top of `SpatialSpectral3DExtractor.extract_vit_tokens()`, reusing the exact Day 10 training engine (`engine.py`, `train.py`) and Day 11 evaluation framework (`metrics.py`, `reports.py`).

---

## I. Recommended Next Steps
1. **Week 3, Day 1:** Implement the lightweight Vision Transformer (`ViT`) encoder block and `TerraSpectraHybridCNNViT` model consuming `SpatialSpectral3DExtractor.extract_vit_tokens()` (`[B, 25, 128]`), keeping total parameters well within the 4 GB RTX 3050 VRAM budget.
2. **Team Sync (Harsh + Khushi):** Merge `origin/khushi` and `Harsh` so `terraspectra_ml.data`, `models`, `training`, and `evaluation` reside in a unified package tree.
3. **Dataset Lock:** Once Khushi confirms the real hyperspectral scene, usable bands, and `classes.yaml` (`confirmed: true`), execute the locked spatial split and run real baseline training and evaluation.
