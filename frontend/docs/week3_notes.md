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

---

## Day 2 — Thursday, 26 November 2026

### Focus: Implement Model-Output Adapter and Resilient Data Mapping

#### 1. Tasks Executed
- **Dedicated Model Prediction Adapter (`frontend/src/adapters/predictionAdapter.js`):**
  - Decoupled raw backend API responses from Deck.gl map-layer rendering and DetailsPanel presentation.
  - Implemented `adaptPredictionResponse()`: transforms raw HTTP / async job responses into a guaranteed `PredictionViewModel`.
  - Implemented `adaptFeature()`: standardizes raw features into `PredictionFeatureViewModel` with verified score semantics, formatted score labels, and stable ID resolution.
  - Implemented `createEmptyViewModel()`: standardized empty and fallback view model generator.
  - Integrated support for Week 3 real-model envelopes (`data.metadata`, `data.metrics.mean_score`, `data.features`), Week 2 legacy envelopes (`data.metrics.mean_confidence`), and async job envelopes (`queued`, `running`, `completed`, `failed`).

- **Resilient Data Mapping & Guardrails:**
  - **Optional Metadata:** Missing fields (`acquisition_date`, `sensor`, `checkpoint`, `spatial_resolution_m`) are preserved as `null` or explicit fallback indicators (`"Pending confirmation"`), avoiding invented defaults.
  - **Unknown Class Labels:** Unexpected class names are mapped to a neutral `Unknown Category` badge (`isUnknown: true`, `isProvisional: true`) without throwing unhandled exceptions.
  - **Missing Geometry:** Features lacking valid polygon/point coordinates are preserved with `hasGeometry: false` and `geometry: null`, enabling details inspection while shielding Deck.gl layers from crashing.
  - **Empty / Malformed Predictions:** Null, empty, or malformed responses safely resolve to `status: "empty"` with clear descriptive notices.
  - **Mock / Sample Provenance:** Explicitly tracks `isMock` from payload or feature metadata to drive UI demo indicators.

- **Hook & Type System Integration:**
  - Updated `frontend/src/hooks/usePrediction.js`: Wired `adaptPredictionResponse` into `runAnalysis`, exposing a reactive `viewModel` alongside raw `result`.
  - Updated `frontend/src/types/prediction.js`: Re-exported `adaptPredictionResponse`, `adaptFeature`, and `createEmptyViewModel`.

- **Fixture-Based Test Suite (`frontend/src/adapters/__tests__/predictionAdapter.test.js`):**
  - Created 12 new unit test assertions with approved sample response fixtures (Week 3 real model, Week 2 legacy, async running/completed/failed, empty predictions, unknown classes, missing geometries, and sparse metadata).
  - Explicitly labeled all fixtures as synthetic sample data to prevent confusing test fixtures with model evaluation evidence.
  - Total test suite expanded to **60 passing tests** across 20 suites with zero failures.

#### 2. Quality Verification
- **Test Suite:** 60 tests passing (`npm test`).
- **Linter:** 0 warnings, 0 errors across 24 files (`npx oxlint`).
- **Production Build:** Clean bundle generated in 1.13s (`npm run build`).

#### 3. Daily Commit
- `feat(frontend): add model prediction response adapter`

---

## Day 3 — Friday, 27 November 2026

### Focus: Improve Map Layers and Spatial Filtering

#### 1. Tasks Executed
- **Refined Deck.gl Layer Implementation (`frontend/src/map/layers/layerFactory.js`):**
  - Added native multi-geometry support for `Polygon`, `MultiPolygon`, `Point`, and `MultiPoint` geometries.
  - Implemented `filterSpatialFeatures()` to safeguard Deck.gl layers against non-spatial or tabular prediction records (`geometry: null`).
  - Enhanced `calculateFeatureBounds()` to traverse multi-ring and multi-polygon geometries, ensuring accurate map bounding box calculations.
  - Implemented unified property accessors (`getFeatureClass`, `getFeatureId`, `isAlertFeature`) that seamlessly operate on both raw GeoJSON API features and normalized `PredictionFeatureViewModel` instances.
  - Added a disjoint multi-plot sample feature to `SAMPLE_FEATURES` in `frontend/src/map/layers/predictionLayer.js`.

- **Prediction Filtering Hook & Pure Reducers (`frontend/src/hooks/usePredictionFilters.js`):**
  - Architected headless pure helpers (`extractFilterOptions`, `applyPredictionFilters`) alongside the reactive `usePredictionFilters` hook.
  - Supports filtering only on fields the API actually provides:
    - **Class Filter:** Filters by confirmed classes (`healthy`, `stressed`, `unclassified_nodata`).
    - **Scene Filter:** Dynamically derived from unique `scene_id` values in the dataset.
    - **Acquisition Date Filter:** Dynamically derived from UTC acquisition timestamps.
    - **Keyword Search:** Case-insensitive search across `tile_id`, `label`, and `stableId`.
    - **Alerts Only Toggle:** Instant isolation of physiological stress anomaly alerts.
  - Synchronizes visible vs. total feature counts and provides a one-click `resetFilters()` action.

- **PredictionFilters Component (`frontend/src/components/PredictionFilters.jsx`):**
  - Built an accessible, responsive filter control card with search input, class/scene/date dropdowns, alert toggle button with count badge, count pill (`X of Y visible`), and reset action.
  - Added comprehensive responsive styling in `frontend/src/App.css`.

- **Map View Integration (`frontend/src/map/MapView.jsx`):**
  - Wired `usePredictionFilters` directly into `MapView.jsx`, feeding `filteredFeatures` to Deck.gl overlay, alert, and boundary layers.
  - Updated `LayerControls` and `DetailsPanel` scene summaries to reflect filtered counts in real time.
  - Added a dedicated "No Features Match Active Filters" overlay with a one-click "Reset Filters" action when filters yield 0 results from a non-empty dataset.

- **Test Suite (`frontend/src/map/__tests__/predictionFilters.test.js`):**
  - Added 16 new automated test assertions covering MultiPolygon bounding calculations, non-spatial feature filtering, class/scene/date/search filtering, alerts-only filtering, empty matches, and combined multi-filter evaluations.
  - Expanded test suite to **76 passing tests** across 22 suites with 0 failures.

#### 2. Quality Verification
- **Test Suite:** 76 tests passing (`npm test`).
- **Linter:** 0 warnings, 0 errors across 27 files (`npx oxlint`).
- **Production Build:** Clean bundle generated in 1.34s (`npm run build`).

#### 3. Daily Commit
- `feat(frontend): add prediction layer filters and map updates`


