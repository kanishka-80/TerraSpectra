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
