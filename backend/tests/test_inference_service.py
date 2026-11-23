from backend.app.schemas.analysis import AnalysisRequestSchema
from backend.app.services.inference_service import InferenceService


def test_default_inference_service_uses_mock_adapter():
    request = AnalysisRequestSchema(
        dataset_id="demo_dataset_001",
        sensor_name="Demo Sensor",
        bounding_box=[75.80, 22.60, 75.90, 22.70],
        include_uncertainty=True,
    )

    service = InferenceService()

    result = service.predict(request)

    assert result["job_id"]
    assert result["prediction_type"] == "MOCK_ONLY"
    assert result["is_mock"] is True
    assert result["inference_status"] == "simulated"
    assert result["input_summary"] == request.model_dump(
        mode="json",
        exclude_none=True,
    )


def test_default_inference_service_generates_unique_job_ids():
    request = AnalysisRequestSchema(
        dataset_id="demo_dataset_001",
    )

    service = InferenceService()

    first_result = service.predict(request)
    second_result = service.predict(request)

    assert first_result["job_id"] != second_result["job_id"]


def test_custom_predictor_can_be_injected():
    request = AnalysisRequestSchema(
        dataset_id="demo_dataset_001",
    )

    expected_result = {
        "job_id": "test-job-001",
        "prediction_type": "TEST",
        "is_mock": True,
        "inference_status": "simulated",
    }

    received_requests = []

    def custom_predictor(received_request):
        received_requests.append(received_request)
        return expected_result

    service = InferenceService(predictor=custom_predictor)

    result = service.predict(request)

    assert result == expected_result
    assert len(received_requests) == 1
    assert received_requests[0] is request


def test_custom_predictor_receives_original_request():
    request = AnalysisRequestSchema(
        dataset_id="terra_dataset_001",
        sensor_name="Test Sensor",
    )

    received = {}

    def custom_predictor(received_request):
        received["request"] = received_request
        return {"job_id": "custom-job-001"}

    service = InferenceService(predictor=custom_predictor)
    service.predict(request)

    assert received["request"] is request
