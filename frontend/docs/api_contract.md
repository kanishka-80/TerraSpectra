# TerraSpectra — Frontend / Backend / ML API & Data Contract

**Specification Version:** 1.0.0  
**Effective Date:** Week 2 (18–24 November 2026)  
**Authors:** Ritik (Frontend/GIS Lead), in alignment with Kanishka (Backend Lead), Harsh (ML Lead), and Khushi (Data Lead)  
**Status:** Locked for Week 2 Dashboard & Map Integration  

---

## 1. Overview & Purpose

This document locks the formal data and API interface between the **TerraSpectra Frontend/GIS Dashboard**, the **Backend API Service** (FastAPI), and the **Machine Learning Pipelines** (3D-CNN / ViT hybrid).

It provides:
1. Endpoints for system status, health, and analysis inference.
2. Exact JSON schema definitions for requests, standard responses, and error envelopes.
3. Strict geospatial specifications (CRS, coordinate ordering, and bounding boxes).
4. Confirmed classification taxonomy and score semantics.
5. Rules for distinguishing real model predictions from sample/mock data.

---

## 2. API Endpoints

All endpoints are hosted under `VITE_API_BASE_URL` (e.g., `http://localhost:8000`).

| Endpoint | Method | Purpose | Week 2 Status |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Basic backend liveness check | Confirmed (Operational) |
| `/api/v1/system/status` | `GET` | System operational details & API version | Confirmed (Operational) |
| `/api/v1/analyze` | `POST` | Submit hyperspectral inference request | Aligned with `AnalysisRequestSchema` |
| `/predict` | `POST` | Legacy multipart image upload for scanner | Switchable mock / fallback |

---

## 3. Request Schemas

### 3.1 Inference Analysis Request (`AnalysisRequestSchema`)

```json
{
  "dataset_id": "AVIRIS_NG_IND_2026_01",
  "sensor_name": "AVIRIS-NG",
  "bounding_box": [80.200, 13.080, 80.215, 13.095],
  "include_uncertainty": true
}
```

#### Field Specifications:
- `dataset_id` (`string`, optional): Identifier of pre-registered hyperspectral dataset.
- `sensor_name` (`string`, optional): Sensor name (e.g., "AVIRIS-NG", "EnMAP", "PRISMA").
- `bounding_box` (`array of float`, optional): `[min_lon, min_lat, max_lon, max_lat]` in EPSG:4326.
  - Must satisfy `-180 <= min_lon < max_lon <= 180` and `-90 <= min_lat < max_lat <= 90`.
- `include_uncertainty` (`boolean`, default: `true`): Flag to compute prediction variance / entropy.

---

## 4. Response Envelopes

### 4.1 Successful Response (`StandardResponseEnvelope`)

```json
{
  "status": "success",
  "timestamp": "2026-11-18T10:00:00Z",
  "job_id": "job_exp_001",
  "data": {
    "metadata": {
      "scene_id": "AVIRIS_CHENNAI_RICE_01",
      "sensor": "AVIRIS-NG",
      "crs": "EPSG:4326",
      "acquisition_date": "2026-10-15",
      "spatial_dimensions": { "height": 512, "width": 512 },
      "patch_dimensions": [32, 32],
      "model_name": "3D-CNN Baseline",
      "model_version": "v0.1.0"
    },
    "metrics": {
      "dominant_class": "healthy",
      "class_distribution": {
        "healthy": 0.78,
        "stressed": 0.18,
        "unclassified_nodata": 0.04
      },
      "mean_confidence": 0.892,
      "mean_uncertainty": 0.068
    },
    "features": [
      {
        "type": "Feature",
        "id": "tile_001",
        "properties": {
          "tile_id": "tile_001",
          "label": "Field Sector A-1",
          "class": "healthy",
          "confidence": 0.94,
          "uncertainty": 0.04,
          "metadata": {
            "scene_id": "AVIRIS_CHENNAI_RICE_01",
            "tile_id": "tile_001",
            "sensor": "AVIRIS-NG",
            "acquisition_date": "2026-10-15",
            "crs": "EPSG:4326",
            "dimensions": "32x32 px",
            "model_name": "3D-CNN Baseline",
            "model_version": "v0.1.0"
          }
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [80.200, 13.080],
              [80.205, 13.080],
              [80.205, 13.085],
              [80.200, 13.085],
              [80.200, 13.080]
            ]
          ]
        }
      }
    ],
    "artifacts": {
      "raster_download_url": "/api/v1/results/job_exp_001/raster",
      "summary_url": "/api/v1/results/job_exp_001/summary"
    }
  }
}
```

### 4.2 Error Response Envelope (`ErrorResponse`)

```json
{
  "status": "error",
  "timestamp": "2026-11-18T10:00:00Z",
  "error_code": "INVALID_BOUNDING_BOX",
  "message": "min_lon must be strictly less than max_lon in EPSG:4326",
  "details": {
    "field": "bounding_box",
    "received": [80.21, 13.08, 80.20, 13.09]
  }
}
```

---

## 5. Machine Learning Output Semantics

Confirmed in `ml/configs/classes.yaml` by Harsh:

| Class ID | Technical Name | UI Display Label | Alert Class | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `healthy` | Healthy | No | Normal spectral reflectance; no early physiological stress. |
| `1` | `stressed` | Stressed (Alert) | **Yes** | Subtle red-edge or water-absorption anomaly detected. |
| `-1` | `unclassified_nodata` | NoData / Masked | No | Masked background, cloud-contaminated, or NoData pixels. |

### Provisional Categories (Demo Mode Only)
- `demo`: Sample tile for visual verification when no model output exists.
- `uncertain`: Low confidence score indicating ambiguous spectral signature.
- **Rule:** Provisional categories MUST be displayed with a "Provisional" badge and excluded from real model outputs.

---

## 6. Geospatial Standards & Coordinate Handling

1. **Coordinate Reference System (CRS):** Default to `EPSG:4326` (WGS-84).
2. **Coordinate Ordering:**
   - In GeoJSON geometry (RFC 7946): `[longitude, latitude]` (e.g., `[80.205, 13.085]`).
   - In Bounding Boxes: `[min_lon, min_lat, max_lon, max_lat]`.
3. **No Inferred Coordinates:** Never invent coordinates; if CRS transform fails or is missing, mark layer as failed and notify user.

---

## 7. Mock vs. Real Mode Guardrails

1. When `VITE_API_BASE_URL` is unset or empty, the frontend runs in **Mock Mode**.
2. All mock payloads are stamped with `_isMock: true`.
3. The UI explicitly presents banner notices and details badges:
   - "DEMO MAP — Sample geometry and placeholder categories. Not real farm locations or disease predictions."
4. Never represent mock numbers as verified agronomic ground truth.
