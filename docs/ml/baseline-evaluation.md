# TerraSpectra — Baseline Comparison & Spatial Leakage Prevention Protocol (Day 11)

**Version:** 1.0.0  
**Date:** November 21, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Primary Collaborator:** Khushi (ML & Data Engineering)

---

## 1. Baseline Model & Comparison Strategy

### 1.1 Primary Baseline Model
- **Model:** `TerraSpectra3DCNN` (`ml/src/terraspectra_ml/models/cnn3d.py`, 24,682 parameters).
- **Why Suitable:** Directly captures local 3D spatial-spectral correlations (`[B, 1, D, 9, 9]`) without requiring sequence attention, establishing a disciplined lower-bound reference before introducing the Week 3 Vision Transformer (`3D-CNN + ViT`).
- **Optional Conventional Comparator (Data-Permitting):** Once Khushi locks the verified hyperspectral cube and label file, a pixel-spectrum `RandomForest` or `Linear SVM` trained on the center-pixel reflectance vector (`[B, D]`) may be evaluated under identical splits to quantify the gain from 3D spatial neighborhood modeling. No superiority claim is made until both models are evaluated on identical splits.

### 1.2 Fair Comparison Invariants
Every baseline and hybrid model comparison MUST hold constant:
1. **Dataset & Sensor Cube:** Identical scene ID, usable band list (`D`), and radiometric normalization.
2. **Class Mapping:** Identical `ml/configs/classes.yaml` IDs (`confirmed: true`).
3. **Spatial Split:** Identical spatially disjoint train/validation/test block assignments.
4. **Evaluation Protocol:** Identical `compute_classification_metrics()` calculation (`Macro F1` as primary selection metric alongside `Weighted F1`, `Accuracy`, and per-class precision/recall/F1).

---

## 2. Data Leakage Prevention & Split Governance

### 2.1 Hyperspectral Spatial Autocorrelation Risk
Neighboring pixels in agricultural hyperspectral imagery share canopy reflectance, soil background, and illumination conditions. Randomly shuffling overlapping `9 x 9` patches across train, validation, and test splits causes severe spatial leakage and artificially inflated metrics.

### 2.2 Split & Augmentation Boundaries
- **Spatial Separation:** Coordinate with Khushi's spatial splitting (`ml/src/terraspectra_ml/evaluation/spatial_split.py` on `origin/khushi`) to partition scenes into spatially contiguous, non-overlapping geographic blocks with a buffer margin $\ge \lfloor 9/2 \rfloor = 4$ pixels so no `9 x 9` patch straddles a split boundary.
- **Augmentation Boundary:** Any spatial flips or rotations must occur strictly **after** spatial block assignment and only on the training split.
- **Test-Set Isolation:** The test split is locked and never accessed during training, early stopping, or hyperparameter tuning.

---

## 3. Current Evaluation Readiness & Blockers
- **Implemented & Verified:** Reusable metric engine (`metrics.py`), JSON/Markdown report exporter (`reports.py`), CLI evaluation entry point (`ml/scripts/evaluate.py`), and automated unit tests (`ml/tests/test_metrics.py`).
- **Pending Blocker:** Real hyperspectral evaluation remains blocked until Khushi delivers a verified dataset cube, spatial split mask, and confirmed ground-truth labels (`confirmed: true`).
