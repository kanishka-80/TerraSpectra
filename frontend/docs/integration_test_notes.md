# TerraSpectra — Week 2 Integration & Testing Report

**Author:** Ritik (Frontend & GIS Engineering)  
**Date:** 23 November 2026 (Day 6)  
**Test Suite Status:** PASS (29 tests passing, 0 failures, 8 suites)  
**Test Runner:** Node.js native test runner (`node:test`, `node:assert/strict`)  

---

## 1. Test Suite Summary

A comprehensive, zero-dependency unit and integration test suite has been established for the frontend API client, prediction service, Deck.gl layer factory, and sample geospatial fixtures.

```
▶ layerFactory
  ▶ colorForClass (5 tests passed)
  ▶ isValidCoordinate (4 tests passed)
  ▶ calculateFeatureBounds (2 tests passed)
  ▶ Deck.gl layer builders (3 tests passed)
▶ predictionLayer sample fixtures (6 tests passed)
▶ apiClient (4 tests passed)
▶ predictionService (5 tests passed)

ℹ tests 29 | suites 8 | pass 29 | fail 0
```

---

## 2. Tested Workflows & Verification

### 2.1 End-to-End Prediction Request → Map Rendering Flow
1. **Request Formation:**
   - Validated that `AnalysisRequestSchema` conforms to backend Pydantic validation:
     `{ dataset_id, sensor_name, bounding_box, include_uncertainty }`.
   - Verified that bounding box coordinates conform to EPSG:4326 (`-180 <= min_lon < max_lon <= 180` and `-90 <= min_lat < max_lat <= 90`).
2. **Response Reception & Envelope Parsing:**
   - Verified that both live responses and switchable mock responses return the standard `StandardResponseEnvelope` with:
     - ISO 8601 UTC timestamp
     - Unique `job_id`
     - Metadata: `scene_id`, `sensor`, `crs`, `spatial_dimensions`, `patch_dimensions`
     - Metrics: `dominant_class`, `class_distribution`, `mean_confidence`, `mean_uncertainty`
3. **Deck.gl Layer Instantiation:**
   - Features from the response are converted into Deck.gl `GeoJsonLayer` instances via `buildPredictionLayer`.
   - Polygons are stroked and filled with class colors; selected features receive a high-contrast gold outline (`[255, 215, 0, 255]`).

---

## 3. Failure Modes & Edge Cases Tested

| Failure Mode / Edge Case | Simulated Behavior | Handling in UI | Test Verification |
| :--- | :--- | :--- | :--- |
| **Network Failure / Unreachable Backend** | `fetch` throws `TypeError` / network error | Caught in `apiClient`, wrapped in structured `ApiError` (`errorCode: "NETWORK_ERROR"`), surfaced to user with retry option | `apiClient.test.js` |
| **Request Timeout** | `AbortController` triggers after timeout (default 15,000ms) | Error code `TIMEOUT` (HTTP 408); UI displays descriptive timeout banner | `apiClient.test.js` |
| **Malformed / Missing Response Data** | Backend returns `{ status: "success", data: null }` | Hook sets `status: "empty"`; MapView displays empty-state guidance with reload button | `usePrediction.js` |
| **Empty Feature Collection (`features: []`)** | API returns empty feature array or all layers toggled off | MapView displays friendly empty overlay: "No Prediction Layers Available" or "All Map Layers Hidden" with one-click restore | `layerFactory.test.js` & `MapView.jsx` |
| **Missing Feature Geometry** | Feature has `geometry: null` | `calculateFeatureBounds` safely skips invalid coordinates; `buildPredictionLayer` skips rendering without throwing | `layerFactory.test.js` |
| **Missing Feature Metadata** | Properties lack `sensor`, `scene_id`, or `acquisition_date` | `normalizePredictionFeature` supplies clean "Not provided" or "Pending scene intake" labels; never displays misleading fake values | `predictionLayer.test.js` & `DetailsPanel.jsx` |
| **Duplicate Concurrent Submissions** | User clicks "Analyse" repeatedly while request is pending | `usePrediction` has a strict guard: `if (status === "loading") return;` silently ignoring repeated clicks | `usePrediction.js` |

---

## 4. Geospatial CRS & Coordinate Order Audit

1. **Coordinate Reference System:**
   - All GeoJSON fixtures and bounding boxes strictly assume `EPSG:4326` (WGS-84).
2. **Coordinate Ordering Check:**
   - Evaluated RFC 7946 compliance: `[longitude, latitude]`.
   - Longitude values in test area: `80.200` to `80.213` (East of Prime Meridian).
   - Latitude values in test area: `13.080` to `13.093` (North of Equator).
   - If latitude and longitude were accidentally swapped, coordinates would fall into the Southern Indian Ocean / Antarctica; our coordinate validation test explicitly guards against latitude `> 90` or `<-90` and verifies polygon closure.
3. **MapLibre Positron Alignment:**
   - Verified that Deck.gl layer coordinates overlay accurately on top of the MapLibre Positron basemap at zoom level 14.

---

## 5. Cross-Team Findings & Recommendations

### For Kanishka (Backend Lead):
- Ensure FastAPI returns `content-type: application/json` on all HTTP error responses (e.g. 422 Unprocessable Entity) so the frontend can parse the field-level validation issues cleanly.
- Ensure all timestamps in `StandardResponseEnvelope` and `ErrorResponse` include a UTC timezone (`Z` or `+00:00`).

### For Harsh & Khushi (ML & Data Leads):
- Confirmed that classification labels in production will remain `healthy` (0), `stressed` (1), and `unclassified_nodata` (-1).
- Provisional demo categories (`demo`, `uncertain`) are isolated to local mock mode and marked with badges.
- Requested that patch metadata from Khushi's pipeline continue including `tile_id`, `scene_id`, and `patch_dimensions` (e.g., `32x32`).
