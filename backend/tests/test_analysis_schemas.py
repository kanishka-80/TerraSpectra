from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from backend.app.schemas.analysis import (
    AnalysisRequestSchema,
    PredictionMetricsSchema,
    StandardResponseEnvelope,
)


def test_analysis_request_defaults():
    request = AnalysisRequestSchema()

    assert request.dataset_id is None
    assert request.sensor_name is None
    assert request.bounding_box is None
    assert request.include_uncertainty is True


def test_valid_analysis_request():
    request = AnalysisRequestSchema(
        dataset_id="dataset_001",
        sensor_name="PRISMA",
        bounding_box=[75.5, 20.0, 76.5, 21.0],
        include_uncertainty=False,
    )

    assert request.dataset_id == "dataset_001"
    assert request.bounding_box == [75.5, 20.0, 76.5, 21.0]


def test_invalid_bounding_box_length():
    with pytest.raises(ValidationError):
        AnalysisRequestSchema(bounding_box=[75.5, 20.0, 76.5])


@pytest.mark.parametrize(
    "bounding_box",
    [
        [181, 20, 190, 21],
        [75, -91, 76, 21],
        [75, 20, 76, 91],
        [76, 20, 75, 21],
        [75, 21, 76, 20],
    ],
)
def test_invalid_bounding_box_coordinates(bounding_box):
    with pytest.raises(ValidationError):
        AnalysisRequestSchema(bounding_box=bounding_box)


def test_valid_prediction_metrics():
    metrics = PredictionMetricsSchema(
        dominant_class="TBD",
        class_distribution={"class_a": 0.6, "class_b": 0.4},
        mean_confidence=0.85,
        mean_uncertainty=0.15,
    )

    assert metrics.mean_confidence == 0.85
    assert metrics.mean_uncertainty == 0.15


@pytest.mark.parametrize("confidence", [-0.1, 1.1])
def test_invalid_mean_confidence(confidence):
    with pytest.raises(ValidationError):
        PredictionMetricsSchema(
            dominant_class="TBD",
            class_distribution={},
            mean_confidence=confidence,
        )


def test_invalid_mean_uncertainty():
    with pytest.raises(ValidationError):
        PredictionMetricsSchema(
            dominant_class="TBD",
            class_distribution={},
            mean_confidence=0.8,
            mean_uncertainty=1.5,
        )


def test_valid_response_envelope():
    response = StandardResponseEnvelope(
        timestamp=datetime.now(timezone.utc),
        job_id="job_001",
        data={"metrics": {"mean_confidence": 0.9}},
    )

    assert response.status == "success"
    assert response.job_id == "job_001"


def test_response_rejects_naive_timestamp():
    with pytest.raises(ValidationError):
        StandardResponseEnvelope(
            timestamp=datetime(2026, 11, 15, 10, 0, 0),
            job_id="job_001",
            data={},
        )
