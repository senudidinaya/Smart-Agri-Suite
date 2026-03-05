"""
Prediction request and response schemas.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class IntentScore(BaseModel):
    """Individual intent score."""

    label: str = Field(
        description="Intent label/class name",
        examples=["high_intent", "medium_intent", "low_intent"],
    )
    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Probability score for this intent",
        examples=[0.85],
    )


class PredictionResult(BaseModel):
    """Core prediction result from the model."""

    predicted_intent: str = Field(
        description="Predicted intent label with highest confidence",
        examples=["high_intent"],
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score for the predicted intent",
        examples=[0.92],
    )
    all_scores: List[IntentScore] = Field(
        description="Scores for all possible intents",
    )


class PredictionResponse(BaseModel):
    """Response model for prediction endpoint."""

    success: bool = Field(
        default=True,
        description="Whether prediction was successful",
    )
    prediction: PredictionResult = Field(
        description="Prediction results",
    )
    processing_time_ms: float = Field(
        description="Total processing time in milliseconds",
        examples=[123.45],
    )
    audio_duration_seconds: Optional[float] = Field(
        default=None,
        description="Duration of the processed audio in seconds",
        examples=[5.2],
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Request correlation ID for tracing",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "prediction": {
                    "predicted_intent": "high_intent",
                    "confidence": 0.92,
                    "all_scores": [
                        {"label": "high_intent", "score": 0.92},
                        {"label": "medium_intent", "score": 0.06},
                        {"label": "low_intent", "score": 0.02},
                    ],
                },
                "processing_time_ms": 123.45,
                "audio_duration_seconds": 5.2,
                "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
            }
        }
    }


class Base64AudioRequest(BaseModel):
    """Request model for base64-encoded audio prediction."""

    audio_base64: str = Field(
        description="Base64-encoded audio data",
        min_length=1,
    )
    audio_format: str = Field(
        default="wav",
        description="Audio format/extension",
        examples=["wav", "mp3", "ogg"],
    )
    sample_rate: Optional[int] = Field(
        default=None,
        description="Audio sample rate (if known)",
        examples=[16000, 44100],
    )

    @field_validator("audio_format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        """Normalize audio format to lowercase."""
        return v.lower().strip()

    model_config = {
        "json_schema_extra": {
            "example": {
                "audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA...",
                "audio_format": "wav",
                "sample_rate": 16000,
            }
        }
    }


class ErrorDetail(BaseModel):
    """Error detail model."""

    code: str = Field(description="Error code", examples=["INVALID_AUDIO"])
    message: str = Field(description="Error message")
    field: Optional[str] = Field(
        default=None,
        description="Field that caused the error",
    )


class ErrorResponse(BaseModel):
    """Standard error response model."""

    success: bool = Field(default=False)
    error: ErrorDetail = Field(description="Error details")
    correlation_id: Optional[str] = Field(
        default=None,
        description="Request correlation ID for tracing",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": False,
                "error": {
                    "code": "INVALID_AUDIO",
                    "message": "The uploaded file is not a valid audio file",
                    "field": "audio_file",
                },
                "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
            }
        }
    }
