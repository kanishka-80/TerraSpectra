# TerraSpectra — Week 2 ML Final Consolidation & Week 3 Handoff Report (Day 14)

**Version:** 1.0.0  
**Date:** November 23, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Collaborator:** Khushi (ML & Data Engineering, branch `origin/khushi` @ `f032914`)  
**Branch:** `Harsh`

---

## 1. Week 2 Overview
Week 2 (Days 8–14) established the modular PyTorch 3D-CNN baseline architecture, strict tensor input contracts, reproducible training and validation engines, best/recovery checkpointing, classification evaluation metrics and JSON/Markdown baseline reporting, end-to-end data-model integration tests, and a complete Week 2 engineering audit.

---

## 2. Work Completed & Verified in Repository
- **3D-CNN Architecture & Input Contract (`ml/src/terraspectra_ml/models/cnn3d.py`, `input_contract.py`):** Implemented `TerraSpectra3DCNN` (`24,682` parameters, `96.41 KB` in `float32`), `Conv3DBlock`, `SpatialSpectral3DExtractor` (with top-level `model.extract_vit_tokens()` delegator emitting `[B, 25, 128]` tokens), strict 5D `[B, 1, D, H, W]` validation, and `adapt_4d_patch_batch_to_5d()`.
- **Training, Validation & Checkpointing (`ml/src/terraspectra_ml/training/engine.py`, `train.py`, `losses.py`):** Implemented separated `train_one_epoch()` and `validate_one_epoch()`, configurable `CrossEntropyLoss` & `AdamW`/`Adam`, deterministic RNG seeding, `resolved_training_config.yaml` snapshots, best-validation checkpoints, and periodic recovery checkpoints.
- **Evaluation & Baseline Reporting (`ml/src/terraspectra_ml/evaluation/metrics.py`, `reports.py`, `ml/scripts/evaluate.py`, `docs/ml/baseline-evaluation.md`):** Implemented Accuracy, Macro/Weighted/Micro Precision, Recall, F1-score, `(actual x predicted)` confusion matrices, per-class metrics with zero-support warnings, class imbalance diagnostics, and JSON/Markdown report exporters.
- **Data-Model Integration & Audits (`ml/tests/test_data_model_integration.py`, `docs/ml/week2-integration-report.md`, `docs/ml/week2-ml-audit-report.md`):** Verified end-to-end execution of Khushi's `extract_patches()`, `spatial_group_split()`, `StandardNormalizer`, `PatchDataset`, and `make_dataloader()` into `TerraSpectra3DCNN`, training, validation, and evaluation.

---

## 3. ML Component Status

| Component | Status | Evidence | Remaining Work |
| :--- | :--- | :--- | :--- |
| **Data Pipeline** (`origin/khushi` @ `f032914`) | **Blocked (Software Verified)** | `StandardNormalizer`, `extract_patches`, `spatial_group_split`, `PatchDataset`, and `make_dataloader` verified in `test_data_model_integration.py`. | Lock real scene path, usable bands (`data.yaml`), and `confirmed: true` labels (`classes.yaml`) with Khushi. |
| **Input Contract** (`input_contract.py`) | **Verified Complete** | Enforces `[B, 1, D, H, W]` `float32` and adapts 4D DataLoader batches (`9x9` & `16x16`); 21 unit tests pass. | Align default `9x9` vs `16x16` patch size in `data.yaml` once scene resolution is finalized. |
| **3D-CNN** (`cnn3d.py`) | **Verified Complete** | `TerraSpectra3DCNN` (`24,682` params) and `model.extract_vit_tokens()` verified; 8 unit tests pass in `test_cnn3d.py`. | None for Week 2 baseline. |
| **Training Engine** (`engine.py`, `losses.py`) | **Verified Complete** | Separated train/val loops and CUDA smoke check verified (`27.69–32.97 MB` peak VRAM). | None for Week 2 baseline. |
| **Validation** (`engine.py`) | **Verified Complete** | `validate_one_epoch()` enforces `model.eval()` + `@torch.no_grad()` with zero weight mutation. | None. |
| **Checkpointing** (`train.py`) | **Verified Complete** | Best & periodic `.pt` save/restore verified (`Ckpt Restored: True`). | Train real checkpoint once dataset is unlocked. |
| **Evaluation** (`metrics.py`, `reports.py`, `evaluate.py`) | **Verified Complete** | Metrics, confusion matrix, per-class warnings, and JSON/MD reports verified; 6 tests pass in `test_metrics.py`. | Execute real evaluation once trained checkpoint & confirmed labels exist. |
| **Integration** (`test_data_model_integration.py`) | **Verified Complete** | End-to-end pipeline verified on synthetic cubes across `9x9` and `16x16` patches. | Re-run smoke test on real hyperspectral scene upon delivery. |
| **Automated Tests** (`ml/tests/`) | **Verified Complete** | `41/41` unit and integration tests passing in `ml/tests/` (`Ran 41 tests in 5.108s`). | Add ViT unit tests in Week 3. |

---

## 4. Architecture & Artifact Organization Summary
- **Data Flow:** `Raster Cube -> StandardNormalizer (train-fit) -> extract_patches -> spatial_group_split -> make_dataloader [B, D, H, W] -> adapt_4d_patch_batch_to_5d [B, 1, D, H, W] -> SpatialSpectral3DExtractor -> ClassificationHead [B, K] -> CrossEntropyLoss / Evaluation Report`.
- **Configuration & Artifact Layout:**
  - `ml/configs/`: `data.yaml`, `classes.yaml`, `model_config.yaml`, `training.yaml`, `experiment.yaml`, `hybrid_3dcnn_vit.yaml` (no hardcoded machine paths).
  - `ml/artifacts/` (excluded from Git via `.gitignore` alongside `*.pt`, `*.pth`, `data/raw/`): `checkpoints/`, `logs/`, `reports/`, `plots/`.

---

## 5. Test Summary & Hardware Resource Constraints
- **Command:** `python -m unittest discover -s ml/tests -v`
- **Actual Result:** **`Ran 41 tests in 5.108s` — `OK`** (41 passed, 0 failed, 0 skipped; synthetic fixtures clearly separated from real dataset evidence).
- **Hardware Compatibility (`NVIDIA GeForce RTX 3050 Laptop GPU`, 4 GB VRAM, 16 GB RAM, Intel Core i5-11400H):**
  - Model size: `24,682` parameters (`96.41 KB` in `float32`).
  - Measured peak CUDA VRAM: `27.69 MB`–`32.97 MB` (< 1% of 4 GB VRAM budget).

---

## 6. Final Baseline Readiness Level
TerraSpectra's ML pipeline reaches **Level 2+ (Architecture, Training Engine, Evaluation & Software Data-Interface Verified)**:
- **Level 1 — Architecture Verified:** **Yes** (`TerraSpectra3DCNN` forward pass & token extraction verified).
- **Level 2 — Training Pipeline Verified:** **Yes** (`train_one_epoch`, `validate_one_epoch`, loss, optimizer, RNG seeding, and checkpoint save/load verified).
- **Level 3 — Real Data Integration Verified:** **Partial / Blocked** (Khushi's real DataLoader/preprocessing code is verified on synthetic cubes, but real hyperspectral scene files and labels are still `UNCONFIRMED`).
- **Level 4 — Real Baseline Experiment Completed:** **No** (no real-world baseline accuracy is claimed; blocked on confirmed dataset and ground-truth labels).

---

## 7. Remaining Issues & Week 3 ViT Roadmap

### 7.1 Outstanding Issues
- **Critical:** Real hyperspectral dataset path, usable band list (`data.yaml`), and confirmed ground-truth labels (`confirmed: true` in `classes.yaml`) are still pending from Data Engineering.
- **High:** Reconcile `data.yaml` `patch.size: 16` vs. default `InputContractSpec` `9x9` once scene spatial resolution is confirmed.
- **Medium:** Merge `origin/khushi` and `Harsh` so `terraspectra_ml.data` and `models`/`training`/`evaluation` live in one unified branch.
- **Low:** Unrelated unstaged modification in root `README.md` kept out of ML commits.

### 7.2 Week 3 Vision Transformer (ViT) Roadmap (Not Started Today)
- **Verified CNN Token Interface:** `model.extract_vit_tokens(x)` takes `[B, 1, D, H, W]` (`float32`) and emits normalized spatial-spectral tokens `[B, 25, 128]` (`N_tokens = 5 x 5 = 25`, `d_model = 128`).
- **Conceptual Hybrid Architecture:** Project/retain `d_model = 128` tokens, add learnable 2D spatial positional embeddings + optional `[CLS]` token, pass through a lightweight 2–4 layer Transformer Encoder (`num_heads=4`, `mlp_ratio=2.0`, `dropout=0.1` to stay < 500K params and < 150 MB VRAM on RTX 3050), and classify via `ClassificationHead`.
- **Key Week 3 Risks:** Overfitting on small labelled patch counts, class imbalance, and spatial patch leakage across split boundaries.
- **Recommended Week 3 Sequence:**
  1. Merge `origin/khushi` and `Harsh` branches.
  2. Implement `ViTEncoder` and `TerraSpectraHybridCNNViT` (`hybrid_3dcnn_vit.yaml`) with unit shape/gradient/VRAM tests.
  3. Wire `TerraSpectraHybridCNNViT` into existing `engine.py` and `evaluate.py`.
  4. Once real labelled data is confirmed, train and compare `TerraSpectra3DCNN` baseline vs. `TerraSpectraHybridCNNViT` under identical spatial splits and `Macro F1` metrics.
