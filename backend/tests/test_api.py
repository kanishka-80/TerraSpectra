from fastapi import FastAPI, Query
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.exceptions import validation_exception_handler
from fastapi.exceptions import RequestValidationError


client = TestClient(app)

validation_app = FastAPI()
validation_app.add_exception_handler(
    RequestValidationError,
    validation_exception_handler,
)


@validation_app.get("/test-validation")
def validation_endpoint(limit: int = Query(...)):
    return {"limit": limit}


validation_client = TestClient(validation_app)


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to TerraSpectra API",
        "status": "running",
    }


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_system_status_endpoint():
    response = client.get("/api/v1/status")

    assert response.status_code == 200
    assert response.json() == {
        "status": "operational",
        "service": "TerraSpectra API",
        "version": "v1",
    }


def test_not_found_error():
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {
        "status": "error",
        "message": "Not Found",
        "code": "HTTP_404",
    }


def test_validation_error():
    response = validation_client.get("/test-validation?limit=abc")

    assert response.status_code == 422
    assert response.json()["status"] == "error"
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert response.json()["message"] == "Request validation failed."
    assert "details" in response.json()
