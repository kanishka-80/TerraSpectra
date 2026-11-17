
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_valid_mock_prediction():
    payload = {
        "dataset_id": "demo_dataset_001",
        "sensor_name": "Demo Sensor",
        "bounding_box": [75.80, 22.60, 75.90, 22.70],
        "include_uncertainty": True,
    }

    response = client.post(
        "/api/v1/predictions",
        json=payload,
    )

    assert response.status_code == 200

    result = response.json()

    assert result["status"] == "success"
    assert result["job_id"]
    assert result["timestamp"]
    assert result["data"]["is_mock"] is True
    assert result["data"]["prediction_type"] == "MOCK_ONLY"
    assert result["data"]["inference_status"] == "simulated"


def test_invalid_bounding_box():
    payload = {
        "dataset_id": "demo_dataset_001",
        "bounding_box": [200, 22.60, 75.90, 22.70],
    }

    response = client.post(
        "/api/v1/predictions",
        json=payload,
    )

    assert response.status_code == 422
    assert response.json()["status"] == "error"
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_invalid_bounding_box_order():
    payload = {
        "bounding_box": [75.90, 22.70, 75.80, 22.60],
    }

    response = client.post(
        "/api/v1/predictions",
        json=payload,
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
