
# TerraSpectra Backend

FastAPI backend foundation for the TerraSpectra hyperspectral crop stress intelligence platform.

## Prerequisites
- Python 3.10 or later
- pip
- Git

## Setup

    python -m venv .venv
    .venv\Scripts\Activate.ps1
    python -m pip install -r backend/requirements.txt

## Run Backend

    python -m uvicorn backend.app.main:app --reload

API URL: http://127.0.0.1:8000

## API Documentation
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Available Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | / | Root API information |
| GET | /health | Health check |
| GET | /api/v1/status | System status |
| POST | /api/v1/predictions | Mock prediction |

## Mock Prediction Request

POST /api/v1/predictions

    {
      "dataset_id": "demo_dataset_001",
      "sensor_name": "Demo Sensor",
      "bounding_box": [75.8, 22.6, 75.9, 22.7],
      "include_uncertainty": true
    }

Bounding box order: [min_lon, min_lat, max_lon, max_lat].

The endpoint returns a simulated response. No actual ML model is executed.

See docs/backend/api_examples.md for complete examples.

## Run Tests

    python -m pytest backend/tests -v

## Implementation Status
- FastAPI application implemented.
- Centralized exception handling configured.
- Request and response schemas defined.
- Bounding box validation implemented.
- Health and system status endpoints available.
- Mock prediction endpoint implemented.
- API examples documented.
- Automated backend tests implemented.

## Limitations
- Actual ML inference is not connected.
- Raster upload and processing are not implemented.
- Background inference jobs are not implemented.
- Prediction classes and model output formats need ML team confirmation.
- Geospatial raster output and storage strategy are pending.

## Integration Notes

The prediction endpoint supports frontend integration and API contract testing.

Mock responses must not be interpreted as actual crop stress or disease predictions. The ML inference interface, input contract, output structure, and geospatial processing responsibilities must be confirmed with the relevant teams.
