from typing import Callable

from backend.app.schemas.analysis import AnalysisRequestSchema
from backend.app.services.mock_inference import generate_mock_prediction


class InferenceService:
    """
    Coordinates prediction execution through a replaceable inference adapter.

    The default adapter is mock-only. No real ML model is executed.
    """

    def __init__(
        self,
        predictor: Callable[[AnalysisRequestSchema], dict] = generate_mock_prediction,
    ):
        self.predictor = predictor

    def predict(self, request: AnalysisRequestSchema) -> dict:
        """
        Execute prediction using the configured inference adapter.
        """
        return self.predictor(request)


inference_service = InferenceService()
