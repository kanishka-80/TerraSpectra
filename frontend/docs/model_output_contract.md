# TerraSpectra — Week 3 Model Output & GIS Contract

**Document Version:** 2.0.0  
**Effective Date:** 25 November – 1 December 2026 (Week 3)  
**Stakeholders & Authors:**
- **Ritvik** — Frontend & GIS Engineering Lead
- **Kanishka** — Backend Engineering Lead
- **Harsh** — Machine Learning Engineering Lead
- **Khushi** — Data Engineering & GIS Lead  
**Status:** Confirmed & Locked for Week 3 Integration

---

## 1. Executive Summary & Purpose

This contract formally establishes the interface standards between the **Machine Learning Pipeline (Harsh)**, the **Geospatial Data Pipeline (Khushi)**, the **Backend API Service (Kanishka)**, and the **Frontend / GIS Dashboard (Ritvik)** for Week 3.

Week 3 marks the transition from Week 2's mock/scaffold inference service to:
1. **Real Model Integration:** Loading and executing Harsh's 3D-CNN / ViT hybrid models.
2. **Geospatially Bound Inference:** Preserving CRS, bounding boxes, patch indices, and spatial metadata from Khushi's preprocessed tiles.
3. **Bounded & Asynchronous Job Workflows:** Handling multi-tile inference without hanging synchronous HTTP requests.
4. **Model Transparency & Guardrails:** Treating model scores honestly without overstating disease predictions or conflating scores with calibrated confidence.

---

## 2. Machine Learning Model Output Contract (Harsh)

### 2.1 Model Architecture & Checkpoints
- **Supported Architectures:** 3D-CNN (Spatial-Spectral Baseline) and ViT / Hybrid (Vision Transformer).
- **Active Checkpoint Reference:** Configured dynamically in backend lifespan via `TERRASPECTRA_CHECKPOINT_PATH` (e.g., `checkpoints/3dcnn_aviris_w3.pt`).
- **Device Support:** `cuda` (GPU when available) with automatic fallback to `cpu`.

### 2.2 Classification Taxonomy & Class IDs
Confirmed in `ml/configs/classes.yaml`:

| Class ID | Technical Name | UI Display Label | Alert Class | Spectral / Agronomic Meaning |
| :---: | :--- | :--- | :---: | :--- |
| `0` | `healthy` | Healthy | No | Normal vegetative spectral reflectance; standard chlorophyll red-edge. |
| `1` | `stressed` | Stressed (Alert) | **Yes** | Red-edge shift or water-band absorption anomaly; early physiological stress. |
| `-1` | `unclassified_nodata` | NoData / Masked | No | Cloud contamination, shadow, water surface, or masked background pixels. |

> [!IMPORTANT]
> **Agronomic Guardrail:** The `stressed` class represents *spectral stress anomalies*, **not** a confirmed crop disease diagnosis. The frontend and API must never state that a crop disease is confirmed without field-pathology validation.

### 2.3 Score Semantics & Probability Definition
1. **Output Scores Object:** The model produces an un-calibrated or softmax probability distribution across classes:
   ```json
   "scores": {
     "healthy": 0.12,
     "stressed": 0.86,
     "unclassified_nodata": 0.02
   }
   ```
2. **Primary Score:**
   - Field: `score` (`float`, range `0.0` to `1.0`)
   - Meaning: Top predicted class score.
   - Field: `score_type` (`string`):
     - `"softmax_score"`: Standard softmax normalized output (default).
     - `"calibrated_confidence"`: Calibrated using temperature scaling or isotonic regression.
     - `"raw_logit"`: Raw model logit score.
3. **Uncertainty Estimation:**
   - Field: `uncertainty` (`float | null`): Monte Carlo dropout variance or predictive entropy. If uncertainty estimation is disabled or unsupported by the checkpoint, the value is explicitly `null`.
4. **Display Rule:** The UI must display `score` with its explicit meaning (e.g. `Model Score: 86% (Softmax)`) and display `± uncertainty%` when provided. Never label an uncalibrated score as "Disease Probability".

---

## 3. Geospatial & Preprocessing Contract (Khushi)

### 3.1 Coordinate Reference System (CRS)
- **Standard:** `EPSG:4326` (WGS-84 coordinate system).
- **Geometry Format:** GeoJSON RFC 7946 Polygon or MultiPolygon.
- **Coordinate Order:** Strictly `[longitude, latitude]` (e.g., `[80.2054, 13.0841]`).
- **Spatial Bounding Box:** `[min_lon, min_lat, max_lon, max_lat]` where:
  - `-180.0 <= min_lon < max_lon <= 180.0`
  - `-90.0 <= min_lat < max_lat <= 90.0`

### 3.2 Tile & Scene Metadata Envelope
Each tile feature emitted by the pipeline or backend must preserve:

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `scene_id` | `string` | **Yes** | Source hyperspectral flightline / scene identifier. |
| `tile_id` | `string` | **Yes** | Unique spatial patch identifier within the scene. |
| `sensor` | `string` | **Yes** | Sensor name (`AVIRIS-NG`, `EnMAP`, `PRISMA`, `Hyperion`). |
| `acquisition_date` | `string` (ISO 8601) | **Yes** | UTC acquisition timestamp (`YYYY-MM-DD` or full ISO). |
| `crs` | `string` | **Yes** | Projection reference (strictly `EPSG:4326`). |
| `spatial_resolution_m` | `float` | No | Pixel ground resolution in meters (e.g. `4.0`). |
| `patch_dimensions` | `[int, int]` | No | Dimensions of spectral cube patch in pixels (e.g. `[32, 32]`). |
| `bounds` | `[float x 4]` | **Yes** | Tile bounding box `[min_lon, min_lat, max_lon, max_lat]`. |

> [!CAUTION]
> **No Inferred Coordinates:** Never attempt to compute geographic coordinates from pixel indices without the geotransform and CRS metadata from the data pipeline. If spatial metadata is missing, mark the feature as non-spatial and report the mismatch.

---

## 4. Backend Service & Job Contract (Kanishka)

### 4.1 Endpoints Overview

| Endpoint | Method | Mode | Purpose |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | Sync | Basic liveness probe (`{"status": "healthy"}`). |
| `/api/v1/system/status` | `GET` | Sync | Operational status, model loaded state, active adapter (`real` vs `mock`). |
| `/api/v1/analyze` | `POST` | Sync/Async | Submit inference request for a scene or bounding box. |
| `/api/v1/jobs/{job_id}` | `GET` | Polling | Query asynchronous job execution status and results. |
| `/predict` | `POST` | Sync | Legacy multipart image upload for single-leaf scanner. |

### 4.2 System Readiness & Status Schema
`GET /api/v1/system/status` response:
```json
{
  "status": "operational",
  "version": "0.3.0",
  "model_ready": true,
  "active_adapter": "real",
  "model_metadata": {
    "name": "3D-CNN Spatial-Spectral Baseline",
    "version": "v0.3.0",
    "checkpoint": "checkpoints/3dcnn_aviris_w3.pt",
    "device": "cuda",
    "input_shape": [1, 224, 32, 32],
    "classes": ["healthy", "stressed", "unclassified_nodata"]
  }
}
```

### 4.3 Asynchronous Job Status Lifecycle (`JobStatusEnvelope`)
For long-running inference jobs:
```json
{
  "job_id": "job_w3_20261125_0042",
  "status": "running",
  "created_at": "2026-11-25T15:00:00Z",
  "updated_at": "2026-11-25T15:00:04Z",
  "progress": 0.45,
  "result": null,
  "error": null
}
```

**Job Statuses:**
- `"queued"`: Request received and placed in processing queue.
- `"running"`: Model adapter inference in progress (`progress` between `0.0` and `1.0`).
- `"completed"`: Job succeeded; `result` contains the `StandardResponseEnvelope`.
- `"failed"`: Job failed; `error` contains structured error details (`code`, `message`).

---

## 5. Standard Feature & Response Schema

### 5.1 GeoJSON Feature Specification
```json
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
      "model_version": "v0.3.0",
      "checkpoint": "checkpoints/3dcnn_aviris_w3.pt"
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
```

---

## 6. Frontend Resilience & Incomplete Data Guardrails

1. **Optional Field Handling:**
   - If `uncertainty` is omitted or `null`, the UI displays `"Uncertainty: Not estimated"`.
   - If `acquisition_date` is omitted, the UI displays `"Acquisition Date: Pending intake"`.
   - If `model_name` or `model_version` is omitted, the UI falls back to `"Standard Model (Version pending)"`.
2. **Unknown Class Handling:**
   - If an unexpected class label (e.g. `nitrogen_deficiency` before agreement) is returned, the frontend maps it to `Unknown Category` with a neutral warning badge, without crashing.
3. **Mock vs. Real Indication:**
   - If `_isMock: true` or `metadata.is_mock: true` or `active_adapter === "mock"`, the map displays a distinct amber `"SAMPLE / MOCK DATA"` banner.
   - If real inference output is active, the map displays `"LIVE MODEL PREDICTION"` with model and checkpoint details.

---

## 7. Approval Sign-Off

- **Ritvik (Frontend/GIS Lead):** Confirmed
- **Kanishka (Backend Lead):** Aligned with Day 1 Model Contract
- **Harsh (ML Lead):** Aligned with `classes.yaml` and model outputs
- **Khushi (Data Lead):** Aligned with frozen preprocessing and EPSG:4326 GIS spec
