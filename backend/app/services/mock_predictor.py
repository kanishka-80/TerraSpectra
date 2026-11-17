
from uuid import uuid4

from backend.app.schemas.analysis import AnalysisRequestSchema


def generate_mock_prediction(request: AnalysisRequestSchema) -> dict:
    """
    Generate a mock prediction response for API integration testing.

    This function does not execute any ML model.
    """

    return {
        "job_id": str(uuid4()),
        "prediction_type": "MOCK_ONLY",
        "is_mock": True,
        "message": "This is a simulated response. No ML model was executed.",
        "input_summary": request.model_dump(
            mode="json",
            exclude_none=True,
        ),
        "inference_status": "simulated",
    }
