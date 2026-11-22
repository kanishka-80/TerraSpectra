# TerraSpectra — Week 2 Frontend & GIS Integration Handoff Report

**Author:** Ritvik (Frontend / GIS Engineering Lead)  
**Date:** 24 November 2026 (Week 2 Final Delivery)  
**Target Audience:** Kanishka (Backend Lead), Harsh (ML Lead), Khushi (Data Lead)  
**Repository Branch:** `Ritik`  

---

## 1. Executive Summary

During Week 2 (18–24 November 2026), Frontend and GIS Engineering successfully built out the interactive prediction dashboard, aligned the data interfaces with backend and ML contracts, implemented multi-layer Deck.gl visualization, established feature selection and inspection, and created a zero-dependency test suite with 29 passing tests.

The dashboard can consume the agreed backend prediction contract, display prediction layers on the map, provide responsive layer controls, and handle loading, empty, and error states—while maintaining a strict distinction between sample/mock data and real model predictions.

---

## 2. Completed Deliverables Checklist

| Deliverable | Status | Files / Components | Verification |
| :--- | :--- | :--- | :--- |
| **Prediction Data Contract** | Completed | `frontend/docs/api_contract.md`<br>`frontend/src/types/prediction.js` | Aligned with `AnalysisRequestSchema` and `classes.yaml` |
| **Centralized API Client** | Completed | `frontend/src/services/apiClient.js` | Configurable base URL, timeout, structured error parser |
| **Prediction Service & Mock Adapter** | Completed | `frontend/src/services/predictionService.js` | Health, status, analysis endpoints + contract mock adapter |
| **Prediction State Hook** | Completed | `frontend/src/hooks/usePrediction.js` | Double submission guard, idle/loading/success/empty/error states |
| **Deck.gl Reusable Layer Builder** | Completed | `frontend/src/map/layers/layerFactory.js`<br>`frontend/src/map/layers/predictionLayer.js` | EPSG:4326 coordinate checks, tile polygons, stress alerts, boundary grids |
| **Interactive Feature Selection** | Completed | `frontend/src/hooks/useSelectedFeature.js`<br>`frontend/src/components/DetailsPanel.jsx` | Stable tile ID tracking, confidence/uncertainty, provenance metadata, reset button |
| **Layer Visibility Controls** | Completed | `frontend/src/components/LayerControls.jsx` | Polygons, stress alert highlights, grid outlines toggling |
| **Spectral Map Legend** | Completed | `frontend/src/components/MapLegend.jsx` | Confirmed ML classes vs provisional demo categories |
| **Interactive GIS Map** | Completed | `frontend/src/map/MapView.jsx` | Deck.gl + MapLibre Positron, hover tooltips, gold selection ring, empty/loading/error overlays |
| **Test Suite & Integration Report** | Completed | `frontend/src/**/__tests__/` (4 suites)<br>`frontend/docs/integration_test_notes.md` | 29 passing tests via native `node --test` runner |
| **Documentation & Handoff** | Completed | `frontend/README.md`<br>`frontend/docs/week2_notes.md`<br>`frontend/docs/week2_handoff.md` | Comprehensive guides and cross-team notes |

---

## 3. Backend Integration Handoff (for Kanishka)

1. **Endpoints Connected:**
   - `GET /health`: Verified.
   - `GET /api/v1/system/status`: Verified.
   - `POST /api/v1/analyze`: Wired via `submitAnalysis(payload)` following `AnalysisRequestSchema`:
     ```json
     {
       "dataset_id": "...",
       "sensor_name": "AVIRIS-NG",
       "bounding_box": [80.200, 13.080, 80.215, 13.095],
       "include_uncertainty": true
     }
     ```
2. **Response Envelope Expectation:**
   - The UI expects responses adhering to `StandardResponseEnvelope` with ISO UTC timestamp and `job_id`.
   - Polygons and points in `data.features` will be rendered dynamically by Deck.gl.
3. **Error Handling:**
   - The client handles HTTP 400, 404, 408, 422, 500, 502, and 503.
   - Pydantic validation errors (HTTP 422) with `detail: [{ loc, msg }]` are parsed into readable field-level messages.
4. **Environment Switching:**
   - Setting `VITE_API_BASE_URL=http://localhost:8000` switches the app to live backend mode immediately.

---

## 4. ML & GIS Data Handoff (for Harsh & Khushi)

1. **Class Taxonomy:**
   - Production classes are locked to:
     - `0`: `healthy` (Emerald Green `#38a748`)
     - `1`: `stressed` (Coral Red `#dc3636` with "Stress Alert" badge)
     - `-1`: `unclassified_nodata` (Neutral Slate `#8c96a0`)
   - Provisional demo classes (`demo`, `uncertain`) are isolated and clearly labeled.
2. **Confidence & Uncertainty:**
   - Model confidence is formatted as percentage (`0.0` to `1.0` -> `0%` to `100%`).
   - Uncertainty estimation is presented as `± X.X%`. If unestimated, the UI explicitly notes "Not estimated".
3. **Spatial Metadata & Coordinate Ordering:**
   - CRS must be `EPSG:4326`.
   - GeoJSON geometry coordinates must strictly be `[longitude, latitude]` (RFC 7946).
   - Each tile feature should continue retaining `scene_id`, `tile_id`, `sensor`, `acquisition_date`, and `dimensions`.

---

## 5. Prioritized Roadmap for Week 3

1. **Multi-Temporal / Time-Series Slider:**
   - Add map timeline controls to scrub through multi-date hyperspectral passes to monitor disease progression over time.
2. **ViT / Hybrid Checkpoint Integration:**
   - Ingest attention weight overlays from the Vision Transformer branch to visualize spatial-spectral attention maps directly on top of the field tiles.
3. **Raster Tile Overlay (BitmapLayer / TileLayer):**
   - Support direct rendering of backend-generated raster heatmaps (`data.artifacts.raster_download_url`) in addition to vector GeoJSON overlays.
4. **Batch Analysis & Asynchronous Job Polling:**
   - Enhance `usePrediction` to poll long-running inference jobs via `/api/v1/jobs/{job_id}` with live progress percentage.
