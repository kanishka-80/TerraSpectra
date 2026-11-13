from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator


class AnalysisRequestSchema(BaseModel):
    """Validation schema for incoming inference requests."""

    dataset_id: str | None = Field(
        default=None,
        description="Identifier of a pre-registered dataset",
    )

    sensor_name: str | None = Field(
        default=None,
        description="Target hyperspectral sensor name; exact supported sensors TBD",
    )

    bounding_box: list[float] | None = Field(
        default=None,
        min_length=4,
        max_length=4,
        description="Bounding box [min_lon, min_lat, max_lon, max_lat] in EPSG:4326",
    )

    include_uncertainty: bool = Field(
        default=True,
        description="Whether uncertainty estimation should be included",
    )

    @field_validator("bounding_box")
    @classmethod
    def validate_bounding_box_coordinates(cls, value):
        if value is None:
            return value

        min_lon, min_lat, max_lon, max_lat = value

        if not -180 <= min_lon <= 180:
            raise ValueError("Longitude must be between -180 and 180")

        if not -180 <= max_lon <= 180:
            raise ValueError("Longitude must be between -180 and 180")

        if not -90 <= min_lat <= 90:
            raise ValueError("Latitude must be between -90 and 90")

        if not -90 <= max_lat <= 90:
            raise ValueError("Latitude must be between -90 and 90")

        if min_lon >= max_lon:
            raise ValueError("min_lon must be less than max_lon")

        if min_lat >= max_lat:
            raise ValueError("min_lat must be less than max_lat")

        return value


class PredictionMetricsSchema(BaseModel):
    """Validation schema for prediction summary metrics."""

    dominant_class: str = Field(
        ...,
        description="Dominant predicted category; classification taxonomy TBD",
    )

    class_distribution: dict[str, float] = Field(
        ...,
        description="Coverage distribution across predicted classes",
    )

    mean_confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Mean prediction confidence",
    )

    mean_uncertainty: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Mean estimated prediction uncertainty",
    )


class StandardResponseEnvelope(BaseModel):
    """Standard envelope for successful API responses."""

    status: str = Field(
        default="success",
        description="Response status",
    )

    timestamp: datetime = Field(
        ...,
        description="ISO 8601 timestamp in UTC",
    )

    job_id: str = Field(
        ...,
        min_length=1,
        description="Unique analysis task identifier",
    )

    data: dict[str, Any] = Field(
        ...,
        description="Validated response payload",
    )

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp_timezone(cls, value):
        if value.tzinfo is None or value.utcoffset() != timezone.utc.utcoffset(value):
            raise ValueError("Timestamp must include a UTC timezone")
        return value
