# TerraSpectra — Week 3 Engineering Notes & Alignment Log

**Engineer:** Ritik (Frontend & GIS Engineering)  
**Schedule:** 25 November – 1 December 2026  
**Module:** Model-Aware Map Visualization, Richer Spatial Interaction & Integration Hardening  

---

## Day 1 — Wednesday, 25 November 2026

### Focus: Review Week 2 Integration and Confirm Model-Output Contract

#### 1. Week 2 Integration Review & Verification
- **Dashboard & API Verification:**
  - Verified Week 2 dashboard state, API client (`apiClient.js`), and prediction service (`predictionService.js`).
  - Ran full automated test suite: 29 baseline tests passed across 8 suites (`layerFactory`, `predictionLayer`, `apiClient`, `predictionService`).
  - Verified code quality: Oxlint reported 0 warnings and 0 errors across 21 files.
  - Verified production build: `npm run build` compiled cleanly in under 1.5 seconds.
  - Confirmed map overlay rendering, feature selection ring, hovering tooltip, legend classification, and empty/error state handling.

#### 2. Cross-Functional Alignment Meetings
- **ML Alignment with Harsh (ML Lead):**
  - Confirmed model architecture: evolving 3D-CNN (Spatial-Spectral Baseline) and Vision Transformer (ViT) hybrid experiments.
  - Confirmed checkpoint format and dynamic loading via `TERRASPECTRA_CHECKPOINT_PATH` (e.g., `checkpoints/3dcnn_aviris_w3.pt`).
  - Confirmed class taxonomy from `ml/configs/classes.yaml`:
    - `0`: `healthy` (Emerald green `#38a748`, normal vegetative reflectance).
    - `1`: `stressed` (Coral red `#dc3636`, alert class, red-edge/water absorption anomaly).
    - `-1`: `unclassified_nodata` (Neutral slate `#8c96a0`, background or cloud mask).
  - Confirmed score semantics and guardrails:
    - Output provides `score` (0.0 to 1.0) and `score_type` (`softmax_score`, `calibrated_confidence`, `raw_logit`).
    - **Guardrail:** A numeric score is not automatically a disease probability or confidence percentage; the UI displays explicit score labels.
    - **Guardrail:** The `stressed` class indicates physiological stress anomaly, not a confirmed specific disease diagnosis.
    - Uncertainty estimation: `uncertainty` (`float | null`) based on Monte Carlo dropout variance or predictive entropy when enabled.

- **GIS & Data Alignment with Khushi (Data Lead):**
  - Confirmed CRS standard: `EPSG:4326` (WGS-84).
  - Confirmed geometry format: GeoJSON RFC 7946 Polygon or MultiPolygon with strict `[longitude, latitude]` coordinate ordering.
  - Confirmed tile bounding box format: `[min_lon, min_lat, max_lon, max_lat]`.
  - Confirmed tile and scene provenance fields: `scene_id`, `tile_id`, `sensor`, `acquisition_date`, `crs`, `spatial_resolution_m`, `patch_dimensions`, `bounds`.
  - **Guardrail:** Never convert pixel coordinates to geographic coordinates without verified geotransform and CRS metadata from the data pipeline.

- **Backend Alignment with Kanishka (Backend Lead):**
  - Confirmed endpoint stability:
    - `GET /health`: Basic liveness probe.
    - `GET /api/v1/system/status`: Enhanced for Week 3 with `model_ready`, `active_adapter` (`real` vs `mock`), `execution_device` (`cuda` vs `cpu`), and `checkpoint`.
    - `POST /api/v1/analyze`: Supports both fast synchronous inference and queueing for bounded batch tasks.
    - `GET /api/v1/jobs/{job_id}`: **New in Week 3** for polling long-running inference jobs.
  - Confirmed job status lifecycle: `queued` → `running` (with `progress: 0.0 - 1.0`) → `completed` (with `result`) or `failed` (with `error`).
  - Confirmed batch limit guardrail: bounded execution limits on tile batches to prevent server memory exhaustion.

#### 3. Deliverables Completed for Day 1
- **`frontend/docs/model_output_contract.md`:** Authored comprehensive multi-stakeholder contract locking ML, GIS, backend, and frontend specifications.
- **`frontend/docs/api_contract.md`:** Updated to Specification Version 2.0.0 incorporating Week 3 async job polling and model readiness schemas.
- **`frontend/src/types/prediction.js`:**
  - Added `SCORE_TYPES`, `SCORE_TYPE_LABELS`, `JOB_STATUS`, and `ADAPTER_MODE`.
  - Implemented `formatScore()` for semantic display.
  - Implemented `isKnownClass()` validator.
  - Enhanced `normalizePredictionFeature()` with resilient handling for unknown classes and incomplete optional metadata without crashing.
- **`frontend/src/types/__tests__/predictionContract.test.js`:** Added 19 new unit tests verifying the Week 3 contracts. Total test suite expanded to **48 passing tests** (0 failures).
- **Git Commit:** Committed Day 1 changes with message: `docs(frontend): confirm Week 3 model output and GIS contract`.
