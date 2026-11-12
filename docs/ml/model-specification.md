# TerraSpectra — ML Prediction Task & Model Output Specification

**Version:** 1.0.0  
**Date:** November 12, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Stakeholders:** Khushi (ML & Data Engineering), Kanishka (Backend Engineering), Ritvik (Frontend & GIS)

---

## 1. ML Task Definition & Scientific Scope
TerraSpectra's initial ML pipeline addresses **single-date hyperspectral crop stress detection**. By analyzing contiguous spectral reflectance cubes (`[B, 1, D, H, W]`), the model classifies spatial patches into mutually exclusive physiological condition categories.

### Detection vs. Identification vs. Forecasting
| Capability | Scientific Definition | TerraSpectra Status |
| :--- | :--- | :--- |
| **Crop Stress Detection** | Classifies current vegetation stress states from single-date spectral-spatial signatures. | **Primary Phase 1/2 Target** |
| **Disease Identification** | Diagnoses a specific pathogen (e.g., fungal species) using confirmed pathology ground truth. | **Blocked** unless verified disease labels are obtained |
| **Disease Risk Assessment** | Combines stress probabilities, uncertainty bounds, and contextual weather variables. | **Phase 3 Target** |
| **Disease Forecasting** | Predicts future disease incidence days/weeks ahead using multi-date time series and outcome labels. | **Out of Scope** for single-date imagery |

---

## 2. Dataset & Label Assumptions
- **Current State:** Dataset selection and ground-truth label auditing are pending final dataset confirmation.
- **Provisional Schema:** `ml/configs/classes.yaml` defines a provisional 2-class mapping (`0: healthy`, `1: stressed`) marked `confirmed: false`.
- **Guardrail:** Land-cover or crop-species labels from benchmark datasets (e.g., Indian Pines, Salinas) will strictly be used for pipeline validation and will never be misrepresented as fungal disease labels.

---

## 3. Proposed 3D-CNN + ViT Classification Flow

    Hyperspectral Input Tensor [B, 1, D, 13, 13]  (float32, ascending wavelengths)
           |
           v
    3D-CNN Feature Extractor (Local spectral-spatial convolutions across D, H, W)
           |
           v
    Vision Transformer (ViT) (Global spectral-spatial self-attention across feature tokens)
           |
           v
    Pooled Feature Representation [B, E]
           |
           v
    Classification Head: Dropout(p) -> Linear(E, K)
           |
           v
    Raw Logits [B, K]  -->  Softmax  -->  Class Probabilities [B, K]

- **Connection Point:** The classification head attaches to the pooled embedding vector `[B, E]` emitted by the Vision Transformer encoder.
- **Output Neurons (`K`):** Dynamically bound to the length of `classes` in `ml/configs/classes.yaml` (never hardcoded).

---

## 4. Logits, Probabilities & Uncertainty Representation
- **Logits (z):** Unnormalized real-valued scores used during training with `CrossEntropyLoss`.
- **Softmax Probabilities (p):** Normalized scores summing to `1.0` across classes, representing relative class likelihood under a closed-world assumption.
- **Separate Uncertainty Tracking:** Softmax confidence can be overconfident on out-of-distribution spectra. Predictive uncertainty (e.g., predictive entropy across Monte Carlo Dropout passes) is stored as an independent scalar/raster channel rather than mixed into class probabilities.

---

## 5. Multi-Tiered Output Specification

### Tier 1: Model-Level Output (PyTorch `nn.Module`)
- Returns raw `logits` tensor of shape `[B, K]` (`torch.float32`).

### Tier 2: Patch-Level Inference Output (`terraspectra_ml.inference.predict`)

    {
      "patch_id": "tile_001_r04_c08",
      "predicted_class_id": 1,
      "predicted_class": "stressed",
      "class_probabilities": {
        "healthy": 0.15,
        "stressed": 0.85
      },
      "prediction_score": 0.85,
      "uncertainty": null
    }

*(Note: Numeric values above are structural schema examples only, not actual model predictions.)*

### Tier 3: Spatial / Tile-Level Output (`terraspectra_ml.inference.stitch`)
- Reconstructs patch predictions into 2D georeferenced rasters matching the input tile dimensions `[H_tile, W_tile]`:
  - `class_map`: `int16` array (`-1` for masked NoData/clouds, `0..K-1` for valid predictions).
  - `confidence_map`: `float32` array (`NaN` for masked pixels, `[0.0, 1.0]` for valid predictions).
  - `uncertainty_map`: `float32` array (optional Phase 3 output).
- Preserves parent scene CRS and Affine Transform.

### Tier 4: Backend API Contract (Kanishka — FastAPI Integration)
Kanishka's backend inference worker consumes Tier 3 outputs and wraps them with system-level metadata to serve `/api/v1/predictions/{prediction_id}`:
- **ML Module Provides:** `model_name`, `model_version`, `class_mapping`, `class_map` raster, `confidence_map` raster, `uncertainty_map` raster (if enabled), and tile-level summary statistics.
- **Backend Service Adds:** `prediction_id`, `job_id`, `scene_id`, `observation_date`, `processing_status` (`queued | running | completed | failed`), validation error payloads, and Cloud Optimized GeoTIFF (COG) / GeoJSON asset URLs.

---

## 6. Limitations & Open Decisions
1. **Unconfirmed Label Set:** Final class count `K` and class definitions await dataset confirmation.
2. **Coarse Spatial Resolution:** Satellite hyperspectral sensors (e.g., EnMAP at 30 m) exhibit mixed-pixel effects on small farm parcels; outputs must be presented as decision-support indicators for human inspection.
3. **Architecture Dimensions:** Exact `feature_dim` and ViT embedding sizes remain `null` until Week 2 model prototyping.
