
# TerraSpectra API Examples

## 1. Create Prediction

**Endpoint:** `POST /api/v1/predictions`

**Description:** Accepts analysis input and returns a simulated prediction response. This endpoint does not execute an actual machine learning model.

### Request Body

```json
{
  "dataset_id": "demo_dataset_001",
  "sensor_name": "Demo Sensor",
  "bounding_box": [
    75.8,
    22.6,
    75.9,
    22.7
  ],
  "include_uncertainty": true
}
```

### Request Field Details

| Field | Type | Description |
|---|---|---|
| dataset_id | string or null | Identifier of a registered dataset |
| sensor_name | string or null | Target hyperspectral sensor |
| bounding_box | array of 4 numbers or null | [min_lon, min_lat, max_lon, max_lat] |
| include_uncertainty | boolean | Whether uncertainty estimation is requested |

### Successful Response

**HTTP Status:** `200 OK`

```json
{
  "status": "success",
  "timestamp": "2026-11-18T08:16:23.249954Z",
  "job_id": "a90e0b20-7551-4505-bb7e-2ac9a1417f4f",
  "data": {
    "job_id": "a90e0b20-7551-4505-bb7e-2ac9a1417f4f",
    "prediction_type": "MOCK_ONLY",
    "is_mock": true,
    "message": "This is a simulated response. No ML model was executed.",
    "input_summary": {
      "dataset_id": "demo_dataset_001",
      "sensor_name": "Demo Sensor",
      "bounding_box": [
        75.8,
        22.6,
        75.9,
        22.7
      ],
      "include_uncertainty": true
    },
    "inference_status": "simulated"
  }
}
```

*Note: The timestamp and job ID above are from a sample API response. Actual values are generated for each request.*

### Response Field Details

| Field | Description |
|---|---|
| status | Overall API response status |
| timestamp | UTC response timestamp |
| job_id | Unique identifier for the request |
| data.prediction_type | Indicates the response is mock-only |
| data.is_mock | Confirms that the response is simulated |
| data.message | Explains that no ML model was executed |
| data.input_summary | Summary of the submitted input |
| data.inference_status | Current simulated inference status |

## 2. Validation Rules

- Bounding box must contain exactly four numeric coordinates.
- Longitude values must be between -180 and 180.
- Latitude values must be between -90 and 90.
- Minimum longitude must be less than maximum longitude.
- Minimum latitude must be less than maximum latitude.
- Invalid request data returns HTTP `422 Unprocessable Entity`.

## 3. Important Integration Note

This endpoint currently uses a mock prediction service.

The frontend must not interpret this response as a real crop-stress prediction or display it as an actual ML result.

Actual inference functionality will be integrated separately when the ML service becomes available.
