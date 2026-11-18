
from datetime import datetime

from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_prediction_response_contract():
    """Verify the successful prediction response structure."""

    payload = {
        "dataset_id": "demo_dataset_001",
        "sensor_name": "Demo Sensor",
        "bounding_box": [75.8, 22.6, 75.9, 22.7],
        "include_uncertainty": True,
    }

    response = client.post(
        "/api/v1/predictions",
        json=payload,
    )

    assert response.status_code == 200

    result = response.json()

    # Verify top-level response fields
    assert set(result.keys()) == {
        "status",
        "timestamp",
        "job_id",
        "data",
    }

    assert result["status"] == "success"
    assert result["job_id"]
    assert result["job_id"] == result["data"]["job_id"]

    # Verify timestamp format and timezone
    timestamp = datetime.fromisoformat(
        result["timestamp"].replace("Z", "+00:00")
    )
    assert timestamp.tzinfo is not None
    assert timestamp.utcoffset().total_seconds() == 0

    # Verify prediction data structure
    data = result["data"]

    assert set(data.keys()) == {
        "job_id",
        "prediction_type",
        "is_mock",
        "message",
        "input_summary",
        "inference_status",
    }

    assert data["prediction_type"] == "MOCK_ONLY"
    assert data["is_mock"] is True
    assert data["inference_status"] == "simulated"
    assert "No ML model was executed" in data["message"]

    # Verify submitted inputs are preserved
    assert data["input_summary"] == payload


def test_prediction_validation_error_contract():
    """Verify the standard error response for invalid input."""

    payload = {
        "dataset_id": "demo_dataset_001",
        "bounding_box": [200, 22.6, 75.9, 22.7],
    }

    response = client.post(
        "/api/v1/predictions",
        json=payload,
    )

    assert response.status_code == 422

    result = response.json()

    assert result["status"] == "error"
    assert result["code"] == "VALIDATION_ERROR"
    assert result["message"] == "Request validation failed."
    assert "details" in result
