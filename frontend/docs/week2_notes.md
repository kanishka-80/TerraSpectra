# TerraSpectra — Week 2 Engineering Notes & Alignment Log

**Engineer:** Ritik (Frontend & GIS Engineering)  
**Schedule:** 18–24 November 2026  
**Module:** Interactive Prediction Map, API Integration & Geospatial Visualization  

---

## Day 1 — Wednesday, 18 November 2026

### Focus: Review Week 1 UI and Lock Prediction Response Contract

#### 1. Week 1 UI Review
- **Existing Assets:**
  - Crop Scanner with live webcam capture and video upload.
  - Multi-page navigation (About, Overview, Crop Scanner, Map View, Disease Analysis, Scan History, Settings).
  - Deck.gl map foundation integrated with MapLibre basemap in `MapView.jsx`.
  - Basic API client shell in `apiClient.js` and `predictionService.js`.
- **Gaps Identified:**
  - Map feature inspection was basic without stable ID tracking or formatted scene/tile metadata.
  - Layer visibility controls were missing.
  - The API contract was provisional and not fully mapped to Kanishka's Pydantic schemas in `backend/app/schemas/analysis.py`.
  - Class categories in the legend did not align with Harsh's ML classification configuration in `ml/configs/classes.yaml`.

#### 2. Cross-Functional Alignment Meetings
- **Backend Alignment with Kanishka:**
  - Reviewed `AnalysisRequestSchema` and `StandardResponseEnvelope`.
  - Confirmed `/health` returns `{"status": "healthy", "service": "..."}`.
  - Confirmed `/api/v1/system/status` returns operational status and version.
  - Agreed that `/api/v1/analyze` accepts dataset ID, sensor name, EPSG:4326 bounding box, and uncertainty toggle.
  - Confirmed error responses follow `{ status: "error", error_code, message, details }`.
- **ML Alignment with Harsh:**
  - Confirmed `ml/configs/classes.yaml` defines 2 active classes:
    - ID 0: `healthy` (normal vegetation reflectance, no early stress)
    - ID 1: `stressed` (subtle red-edge / water absorption anomaly, alert class)
    - ID -1: `unclassified_nodata` (cloud/background mask)
  - Provisional labels (`demo`, `uncertain`) must be explicitly badged in the UI to prevent confusing demo placeholders with real disease detection.
- **GIS Alignment with Khushi:**
  - Confirmed CRS standard is `EPSG:4326`.
  - Coordinate order in GeoJSON features must strictly adhere to `[longitude, latitude]`.
  - Bounding box is `[min_lon, min_lat, max_lon, max_lat]`.
  - Each patch/tile metadata will carry `scene_id`, `tile_id`, `sensor`, `acquisition_date`, and `dimensions`.

#### 3. Deliverables Completed for Day 1
- Created `frontend/src/types/prediction.js`: Centralized JSDoc typedefs, confirmed classes, color mappings, bounding box validator, and feature normalizer.
- Authored `frontend/docs/api_contract.md`: Comprehensive frontend/backend/ML specification.
- Logged decisions in `frontend/docs/week2_notes.md`.

---

## Day 2 — Thursday, 19 November 2026

### Focus: Connect Frontend to Backend Prediction Endpoints

#### 1. Tasks Executed
- **Centralized API Client (`frontend/src/services/apiClient.js`):**
  - Configurable backend URL parsing from `VITE_API_BASE_URL`.
  - Structured response and error parsing supporting FastAPI/Pydantic validation errors and standard error envelopes.
  - AbortController timeout mechanism (default 15,000ms).
  - Explicit mock mode guard preventing accidental network calls when running locally.
- **Prediction Service (`frontend/src/services/predictionService.js`):**
  - Integrated `/health` (basic liveness), `/api/v1/system/status` (operational diagnostics), `/api/v1/analyze` (inference), and `/predict` (scanner).
  - Developed a high-fidelity switchable mock adapter producing contract-compliant envelopes stamped with `_isMock: true`.
- **Prediction Hook (`frontend/src/hooks/usePrediction.js`):**
  - Comprehensive lifecycle management: `idle`, `loading`, `success`, `empty`, `error`.
  - Concurrent submission guard preventing duplicate requests while loading.
  - Granular error message and error code surfacing.

---

## Day 3 — Friday, 20 November 2026

### Focus: Render Prediction Overlays on Deck.gl Map

#### 1. Tasks Executed
- **Layer Factory (`frontend/src/map/layers/layerFactory.js`):**
  - Implemented reusable Deck.gl layer builders (`buildPredictionLayer`, `buildStressAlertLayer`, `buildTileBoundaryLayer`).
  - Strict EPSG:4326 coordinate validation (`[longitude, latitude]` order checking).
  - Feature bounding box calculation helper (`calculateFeatureBounds`).
  - Class color scheme mapped to ML contract (Healthy, Stressed Alert, NoData).
  - High-contrast gold selection outline when features are selected.
- **Prediction Layer Fixtures (`frontend/src/map/layers/predictionLayer.js`):**
  - Contract-compliant sample GeoJSON tiles and point markers over realistic agricultural extents.
  - Features stamped with `_isMock: true` and full scene metadata.
- **Map Legend (`frontend/src/components/MapLegend.jsx`):**
  - Visual separation of confirmed ML classes and provisional demo categories.
  - Active layer count and explicit demo notice footer.

---

## Day 4 — Saturday, 21 November 2026

### Focus: Add Map Selection and Prediction Details

#### 1. Tasks Executed
- **Selected Feature Hook (`frontend/src/hooks/useSelectedFeature.js`):**
  - Robust tracking of selected and hovered map features.
  - Stable ID extraction (`tile_id`, `feature_id`, `id`).
  - Normalization using `normalizePredictionFeature` for strong type-safety.
  - Interactive selection and reset synchronization.
- **Details Panel (`frontend/src/components/DetailsPanel.jsx`):**
  - Displays classification, confidence score, and uncertainty.
  - Surfaces scene ID, sensor, acquisition date, CRS (EPSG:4326), and patch dimensions.
  - Clear provenance badges (Model name, checkpoint version, sample data indicator).
  - Explicit "Not provided" or "Pending scene intake" for missing metadata (no misleading placeholders).
  - High-visibility selection reset button.
  - Empty-state guidance with scene summary statistics when no feature is selected.
- **Map View Integration (`frontend/src/map/MapView.jsx`):**
  - Connected click & hover picking.
  - Visual gold selection highlight ring on active Deck.gl features.
  - Floating hover tooltip showing label, class, and confidence.

---

## Day 5 — Sunday, 22 November 2026

### Focus: Build Layer Controls and Improve Dashboard Usability

#### 1. Tasks Executed
- **Layer Controls (`frontend/src/components/LayerControls.jsx`):**
  - Toggles for Prediction Polygons, Stress Alerts, and Tile Grid Boundaries.
  - Active layer count indicator and accessible keyboard controls.
  - Dynamic integration with MapView Deck.gl layer list.
- **Empty & Error State Overlays:**
  - Informative overlay when no prediction layers are returned.
  - Helpful overlay when all layers are toggled off with a "Show All Layers" restoration button.
  - Clear error banner with retry callback for failed layers.
- **Responsive Dashboard Polish (`frontend/src/App.css`):**
  - Grid layout dynamically adjusts between desktop and mobile.
  - Sidebar scroll management and custom slim scrollbars.
  - High-contrast visual hierarchy for legend chips and status badges.
- **Cleaned Up Unused Imports:**
  - Removed unused icons in `App.jsx` and `Settings.jsx`, bringing Oxlint down to 0 errors and 0 warnings.

---

## Day 6 — Monday, 23 November 2026

### Focus: Test End-to-End API and Map Behavior

#### 1. Tasks Executed
- **Built Comprehensive Unit & Integration Test Suite:**
  - Configured native test runner: `npm test` runs Node.js `node --test src/**/__tests__/*.test.js`.
  - Created 4 test suites with 29 individual test assertions:
    - `apiClient.test.js` (4 tests): base URL resolution, mock mode guard, ApiError construction.
    - `predictionService.test.js` (5 tests): health check, system status, mock analysis envelope matching StandardResponseEnvelope.
    - `layerFactory.test.js` (14 tests): color mapping, coordinate validation, bounds calculation, Deck.gl GeoJsonLayer building, alert filtering.
    - `predictionLayer.test.js` (6 tests): sample feature schema compliance, EPSG:4326 coordinate checks, normalization.
  - All 29 tests pass with 0 failures!
- **Edge Case & Failure Mode Validation:**
  - Verified network timeouts, network errors, malformed envelopes, empty feature lists, missing geometries, and missing metadata.
- **Documented Integration Report:**
  - Authored `frontend/docs/integration_test_notes.md`.
