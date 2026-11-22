# TerraSpectra – Backend Inference Contract

**Module:** Backend Engineering  
**Owner:** Kanishka  
**Stakeholders:** Harsh (ML Lead), Khushi (ML & Data Engineering), Ritik (Frontend Lead)  
**Status:** Draft – Pending ML/Data Team Confirmation  
**Version:** 0.1.0  
**Updated:** 22 November 2026

---

## 1. Purpose

This document defines the interface between the TerraSpectra FastAPI backend and the machine learning inference module.

The objective is to maintain a stable API contract while separating API request handling from actual model execution.

The current backend uses a mock prediction service. Real ML inference has not yet been integrated.

Unconfirmed model parameters must remain TBD until confirmed by the responsible team members.

## 2. Current Backend API Contract

### 2.1 Prediction Endpoint

| Property | Current Specification |
|---|---|
| Method | POST |
| Endpoint | `/api/v1/predictions` |
| Content-Type | `application/json` |
| Framework | FastAPI |
| Request validation | Pydantic |
| Current execution | Mock prediction only |
| HTTP success status | 200 |

### 2.2 Request Schema

Current request fields:

| Field | Type | Required | Current behavior |
|---|---|---|---|
| dataset_id | string or null | No | Identifies a registered dataset |
| sensor_name | string or null | No | Identifies the hyperspectral sensor |
| bounding_box | array of 4 numbers or null | No | Geographic area of interest |
| include_uncertainty | boolean | No | Defaults to true |

Bounding box convention:

`[min_lon, min_lat, max_lon, max_lat]`

Coordinate reference system: EPSG:4326.

Validation rules:
- Exactly four coordinates must be provided when bounding_box is present.
- Longitude must be between -180 and 180.
- Latitude must be between -90 and 90.
- Minimum longitude must be less than maximum longitude.
- Minimum latitude must be less than maximum latitude.

Note: The current request schema permits optional fields to be omitted. The actual ML input requirements are not yet finalized.

### 2.3 Current Request Example

```json
{
  "dataset_id": "demo_dataset_001",
  "sensor_name": "Demo Sensor",
  "bounding_box": [75.8, 22.6, 75.9, 22.7],
  "include_uncertainty": true
}
```

## 3. Current Response Contract

### 3.1 Successful Response

The response envelope currently contains exactly four top-level fields:

- status
- timestamp
- job_id
- data

The timestamp uses UTC.

The current mock data object contains:

- job_id
- prediction_type
- is_mock
- message
- input_summary
- inference_status

### 3.2 Current Mock Response Example

```json
{
  "status": "success",
  "timestamp": "2026-11-22T09:00:00Z",
  "job_id": "example-job-id",
  "data": {
    "job_id": "example-job-id",
    "prediction_type": "MOCK_ONLY",
    "is_mock": true,
    "message": "This is a simulated response. No ML model was executed.",
    "input_summary": {
      "dataset_id": "demo_dataset_001",
      "sensor_name": "Demo Sensor",
      "bounding_box": [75.8, 22.6, 75.9, 22.7],
      "include_uncertainty": true
    },
    "inference_status": "simulated"
  }
}
```

This is an illustrative response. It does not represent actual model predictions.

### 3.3 Validation Error Response

Invalid requests currently return HTTP 422.

The standard error response contains:

- status: error
- code: VALIDATION_ERROR
- message: Request validation failed.
- details: validation error information

Example:

```json
{
  "status": "error",
  "message": "Request validation failed.",
  "code": "VALIDATION_ERROR",
  "details": []
}
```

The details array above is illustrative; actual validation details depend on the invalid request.

## 4. Current Backend Architecture

Current execution flow:

```text
Frontend Client
      |
      v
FastAPI Prediction Route
      |
      v
AnalysisRequestSchema
      |
      v
Mock Predictor Service
      |
      v
Standard Response Envelope
      |
      v
Frontend Client
```

Current implementation:

- `backend/app/api/v1/predictions.py`
- `backend/app/schemas/analysis.py`
- `backend/app/services/mock_predictor.py`

The prediction route currently calls `generate_mock_prediction()` directly.

The inference service abstraction is a Week 2 implementation task.

## 5. Target Week 2 Architecture

Expected architecture after the service-layer refactor:

```text
Frontend Client
      |
      v
FastAPI Prediction Route
      |
      v
Request Validation
      |
      v
Inference Service Interface
      |
      +---------------------+
      |                     |
      v                     v
Mock Adapter          Real Model Adapter
      |                     |
      v                     v
Mock Result           ML Model Execution
      |                     |
      +----------+----------+
                 |
                 v
       Response Formatting
                 |
                 v
       Standard API Response
```

The mock adapter and real model adapter must be distinguishable.

The backend must never report successful real model inference when only the mock adapter has executed.

## 6. Proposed ML Integration Interface

The backend will expose a replaceable inference-service boundary.

The following responsibilities are expected:

1. Initialize or load the inference component.
2. Report model readiness separately from API health.
3. Accept validated inference input.
4. Execute the selected inference adapter.
5. Return a structured result or a controlled error.
6. Identify whether execution used a mock or real model.

The exact Python function signature and input/output data structures are TBD.

No tensor dimensions, spectral band counts, class labels or model-specific assumptions are finalized in this document.

## 7. Prediction Result Requirements – Pending Confirmation

The final real-model response may require:

| Field | Status |
|---|---|
| Prediction job ID | Existing |
| Prediction classes | TBD |
| Class probabilities or scores | TBD |
| Dominant predicted class | TBD |
| Confidence metric | TBD |
| Uncertainty metric | TBD |
| Model version | TBD |
| Processing status | TBD |
| Spatial prediction output | TBD |
| Scene/tile reference | TBD |

`PredictionMetricsSchema` already exists in the backend, but it is not currently used as the prediction response data schema.

Its final integration depends on agreement about model outputs and frontend requirements.

## 8. Existing Supporting Endpoints

| Method | Endpoint | Current purpose |
|---|---|---|
| GET | `/` | Root API information |
| GET | `/health` | API health check |
| GET | `/api/v1/status` | API operational status |
| POST | `/api/v1/predictions` | Mock prediction request |

API health must not be treated as proof that the real ML model is loaded and ready.

A separate inference readiness status will be addressed during Week 2.

## 9. Integration Responsibilities

| Team Member | Responsibility | Confirmation Required |
|---|---|---|
| Harsh | 3D-CNN model interface, input and output specifications | Yes |
| Khushi | Prepared dataset, preprocessing and geospatial metadata | Yes |
| Ritik | Frontend request and response requirements | Yes |
| Kanishka | Backend API, inference service abstraction, validation and integration | Ongoing |

## 10. Pending Technical Decisions

The following details must be confirmed before real model integration:

- Model input representation and Python interface.
- Spectral band count and ordering.
- Spatial patch dimensions.
- Supported raster formats.
- Model output structure.
- Classification taxonomy.
- Confidence and uncertainty definitions.
- Model checkpoint format and storage.
- CPU/GPU execution requirements.
- Tiling and stitching responsibilities.
- Geospatial output format and CRS conventions.

Refer to `docs/backend/open_questions.md` for the detailed integration questions and decision register.

## 11. Testing and Acceptance Criteria

The inference service integration should satisfy the following:

1. Existing API request validation remains functional.
2. Existing successful response envelope remains compatible unless a change is agreed.
3. Mock and real inference execution are clearly distinguishable.
4. Model initialization failures are handled safely.
5. Model readiness is not reported as ready when the real model is unavailable.
6. Invalid input produces controlled validation errors.
7. Service-layer behavior can be tested independently.
8. API integration tests verify the complete route-to-service flow.
9. No fabricated predictions or unconfirmed model parameters are introduced.

## 12. Current Status

**Completed:**
- FastAPI foundation.
- Prediction endpoint.
- Request and response schemas.
- Mock prediction service.
- Standard validation error handling.
- API and schema tests.

**Week 2 implementation:**
- Inference service abstraction.
- Separate mock and real model adapters.
- Model readiness handling.
- Improved validation and response formatting.
- Geospatial request context.
- Integration tests and documentation.

**Overall status:** Backend currently supports mock prediction requests. Real ML inference integration is pending confirmation of the ML/data interface.
