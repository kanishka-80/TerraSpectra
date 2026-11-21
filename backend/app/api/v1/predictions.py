
from datetime import datetime, timezone

from fastapi import APIRouter

from backend.app.schemas.analysis import (
    AnalysisRequestSchema,
    StandardResponseEnvelope,
)
from backend.app.services.mock_predictor import (
    generate_mock_prediction,
)

router = APIRouter()


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
):
    mock_result = generate_mock_prediction(request)

    return StandardResponseEnvelope(
        status="success",
        timestamp=datetime.now(timezone.utc),
        job_id=mock_result["job_id"],
        data=mock_result,
    )
