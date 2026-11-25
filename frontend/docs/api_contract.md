# TerraSpectra — Frontend / Backend / ML API & Data Contract

**Specification Version:** 2.0.0  
**Effective Date:** Week 3 (25 November – 1 December 2026)  
**Authors:** Ritvik (Frontend/GIS Lead), in alignment with Kanishka (Backend Lead), Harsh (ML Lead), and Khushi (Data Lead)  
**Status:** Locked for Week 3 Real Model Integration & Bounded Geospatial Inference  

---

## 1. Overview & Purpose

This document defines the formal data and API interface between the **TerraSpectra Frontend/GIS Dashboard**, the **Backend API Service** (FastAPI), and the **Machine Learning Pipelines** (3D-CNN / ViT hybrid).

Week 3 enhances the Week 2 foundation by introducing:
1. **Real Model Inference & Lifecycles:** Dynamic loading of trained checkpoints, GPU/CPU execution states, and readiness diagnostics.
2. **Asynchronous Job Workflows:** Support for bounded geospatial tile batches with polling (`/api/v1/jobs/{job_id}`).
3. **Rigorous Score Semantics:** Explicit distinction between raw scores, softmax probabilities, and calibrated confidence, avoiding unsubstantiated disease claims.
4. **Resilient Geospatial Standards:** Strict EPSG:4326 RFC 7946 coordinates and metadata preservation across pipeline layers.

---

## 2. API Endpoints

All endpoints are hosted under `VITE_API_BASE_URL` (e.g., `http://localhost:8000`).

| Endpoint | Method | Mode | Purpose | Week 3 Status |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | Sync | Basic backend liveness check | Operational |
| `/api/v1/system/status` | `GET` | Sync | System operational details, model readiness & adapter state | Enhanced for Week 3 |
| `/api/v1/analyze` | `POST` | Sync/Async | Submit hyperspectral inference request (returns result or job_id) | Enhanced for Week 3 |
| `/api/v1/jobs/{job_id}` | `GET` | Polling | Retrieve status or results of asynchronous inference job | **New in Week 3** |
| `/predict` | `POST` | Sync | Legacy multipart image upload for single-leaf scanner | Maintained |

---

## 3. Request Schemas

### 3.1 Inference Analysis Request (`AnalysisRequestSchema`)

```json
{
  "dataset_id": "AVIRIS_NG_IND_2026_01",
  "sensor_name": "AVIRIS-NG",
  "bounding_box": [80.200, 13.080, 80.215, 13.095],
  "include_uncertainty": true,
  "max_tiles": 50,
  "async_execution": false
}
```

#### Field Specifications:
- `dataset_id` (`string`, optional): Identifier of pre-registered hyperspectral dataset or scene.
- `sensor_name` (`string`, optional): Sensor name (e.g., `"AVIRIS-NG"`, `"EnMAP"`, `"PRISMA"`).
- `bounding_box` (`array of float`, optional): `[min_lon, min_lat, max_lon, max_lat]` in EPSG:4326.
  - Must satisfy `-180.0 <= min_lon < max_lon <= 180.0` and `-90.0 <= min_lat < max_lat <= 90.0`.
- `include_uncertainty` (`boolean`, default: `true`): Flag to compute prediction variance / entropy.
- `max_tiles` (`integer`, optional, default: `50`): Upper limit on tiles to process in one request (bounded execution guardrail).
- `async_execution` (`boolean`, optional, default: `false`): Force asynchronous job queueing.

---

## 4. Response Envelopes

### 4.1 Synchronous Success Response (`StandardResponseEnvelope`)

When the inference completes within the synchronous timeout window:

```json
{
  "status": "success",
  "timestamp": "2026-11-25T10:00:00Z",
  "job_id": "job_sync_20261125_001",
  "data": {
    "metadata": {
      "scene_id": "AVIRIS_CHENNAI_RICE_01",
      "sensor": "AVIRIS-NG",
      "crs": "EPSG:4326",
      "acquisition_date": "2026-10-15T09:30:00Z",
      "spatial_dimensions": { "height": 512, "width": 512 },
      "patch_dimensions": [32, 32],
      "spatial_resolution_m": 4.0,
      "model_name": "3D-CNN Spatial-Spectral Baseline",
      "model_version": "v0.3.0",
      "checkpoint": "checkpoints/3dcnn_aviris_w3.pt",
      "is_mock": false,
      "execution_device": "cuda"
    },
    "metrics": {
      "dominant_class": "healthy",
      "class_distribution": {
        "healthy": 0.78,
        "stressed": 0.18,
        "unclassified_nodata": 0.04
      },
      "mean_score": 0.892,
      "score_type": "softmax_score",
      "mean_uncertainty": 0.068
    },
    "features": [
      {
        "type": "Feature",
        "id": "tile_001_p02",
        "properties": {
          "tile_id": "tile_001_p02",
          "label": "Sector A - Patch 2",
          "class": "stressed",
          "score": 0.884,
          "score_type": "softmax_score",
          "scores": {
            "healthy": 0.092,
            "stressed": 0.884,
            "unclassified_nodata": 0.024
          },
          "uncertainty": 0.041,
          "metadata": {
            "scene_id": "AVIRIS_CHENNAI_RICE_01",
            "tile_id": "tile_001_p02",
            "sensor": "AVIRIS-NG",
            "acquisition_date": "2026-10-15T09:30:00Z",
            "crs": "EPSG:4326",
            "dimensions": "32x32 px",
            "spatial_resolution_m": 4.0,
            "model_name": "3D-CNN Spatial-Spectral Baseline",
            "model_version": "v0.3.0"
          },
          "_isMock": false
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
      "raster_download_url": "/api/v1/results/job_sync_20261125_001/raster",
      "summary_url": "/api/v1/results/job_sync_20261125_001/summary"
    }
  }
}
```

### 4.2 Asynchronous Job Status Response (`JobStatusEnvelope`)

Returned when `/api/v1/analyze` queues a background task, or when polling `GET /api/v1/jobs/{job_id}`:

```json
{
  "job_id": "job_async_20261125_042",
  "status": "running",
  "created_at": "2026-11-25T10:02:00Z",
  "updated_at": "2026-11-25T10:02:05Z",
  "progress": 0.65,
  "result": null,
  "error": null
}
```

When completed:
```json
{
  "job_id": "job_async_20261125_042",
  "status": "completed",
  "created_at": "2026-11-25T10:02:00Z",
  "updated_at": "2026-11-25T10:02:08Z",
  "progress": 1.0,
  "result": {
    "status": "success",
    "timestamp": "2026-11-25T10:02:08Z",
    "data": { ... }
  },
  "error": null
}
```

### 4.3 Error Response Envelope (`ErrorResponse`)

```json
{
  "status": "error",
  "timestamp": "2026-11-25T10:00:00Z",
  "error_code": "MODEL_NOT_READY",
  "message": "Real ML model checkpoint is not loaded. Mock fallback is inactive.",
  "details": {
    "checkpoint": "checkpoints/3dcnn_aviris_w3.pt",
    "active_adapter": "none"
  }
}
```

---

## 5. Machine Learning Output Semantics

Confirmed in `ml/configs/classes.yaml` by Harsh:

| Class ID | Technical Name | UI Display Label | Alert Class | Agronomic Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `healthy` | Healthy | No | Normal spectral reflectance; baseline vegetative health. |
| `1` | `stressed` | Stressed (Alert) | **Yes** | Red-edge / water absorption anomaly; early physiological stress alert. |
| `-1` | `unclassified_nodata` | NoData / Masked | No | Masked background, cloud/shadow contamination, or NoData pixels. |

### Score Semantics Rule
- A numeric score is **not** automatically a disease probability or confidence percentage.
- The UI must display `score` alongside `score_type` (e.g. `Score: 88.4% (Softmax)`).
- Never report generic vegetation stress as confirmed crop disease without ground-truth verification.

---

## 6. Geospatial Standards & Coordinate Handling

1. **Coordinate Reference System (CRS):** Strictly `EPSG:4326` (WGS-84).
2. **Coordinate Ordering:**
   - In GeoJSON geometry (RFC 7946): `[longitude, latitude]` (e.g., `[80.205, 13.085]`).
   - In Bounding Boxes: `[min_lon, min_lat, max_lon, max_lat]`.
3. **No Inferred Coordinates:** Never invent coordinates; if CRS transform fails or is missing, mark layer as failed and notify user.

---

## 7. Mock vs. Real Mode Guardrails

1. When `VITE_API_BASE_URL` is unset or empty, the frontend runs in **Mock Mode**.
2. All mock payloads are stamped with `_isMock: true` and `metadata.is_mock = true`.
3. The UI explicitly presents banner notices and details badges:
   - "SAMPLE / MOCK DATA — Sample geometry and placeholder categories. Not real farm locations or validated disease predictions."
4. When connected to a live backend with real inference, the UI displays:
   - "LIVE MODEL PREDICTION — Model: 3D-CNN Spatial-Spectral Baseline (v0.3.0)"
