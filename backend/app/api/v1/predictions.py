from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.app.schemas.analysis import (
    AnalysisRequestSchema,
    StandardResponseEnvelope,
)
from backend.app.services.inference_service import (
    InferenceService,
    inference_service,
)

router = APIRouter()


def get_inference_service() -> InferenceService:
    """Provide the configured inference service."""
    return inference_service


@router.post(
    "/predictions",
    response_model=StandardResponseEnvelope,
    summary="Generate a mock prediction",
    description=(
        "Accepts validated analysis inputs and returns "
        "a simulated prediction response for integration testing. "
        "No actual ML model is executed."
    ),
)
def create_prediction(
    request: AnalysisRequestSchema,
    service: InferenceService = Depends(get_inference_service),
):
    prediction_result = service.predict(request)

    return StandardResponseEnvelope(
        status="success",
        timestamp=datetime.now(timezone.utc),
        job_id=prediction_result["job_id"],
        data=prediction_result,
    )
