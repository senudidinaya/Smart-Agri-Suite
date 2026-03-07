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


# =============================================================================
# DECEPTION & TRUTHFULNESS ANALYSIS SCHEMAS
# =============================================================================

class DeceptionSignal(BaseModel):
    """Individual deception signal indicator."""
    
    signal_name: str = Field(
        description="Name of the prosodic signal",
        examples=["pitch_variability", "pause_ratio", "jitter", "vocal_stress"],
    )
    value: float = Field(
        description="Measured value of the signal",
        examples=[45.2, 0.28, 0.035],
    )
    interpretation: str = Field(
        description="What this signal suggests",
        examples=["High pitch variability indicates elevated stress", "High jitter suggests vocal tension"],
    )
    risk_level: str = Field(
        description="Risk indicator: normal, elevated, or high",
        examples=["normal", "elevated", "high"],
    )


class TruthnessAnalysis(BaseModel):
    """Deception/Truthfulness analysis results."""
    
    label: str = Field(
        description="Predicted truthfulness label",
        examples=["truthful", "deceptive", "uncertain"],
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score for the truthfulness prediction",
        examples=[0.72],
    )
    scores: Dict[str, float] = Field(
        description="Probability score for each truthfulness class",
        examples={"truthful": 0.72, "deceptive": 0.28},
    )
    signals: List[DeceptionSignal] = Field(
        description="Individual prosodic signals analyzed",
        examples=[{
            "signal_name": "pitch_variability",
            "value": 45.2,
            "interpretation": "High pitch variability indicates elevated cognitive load",
            "risk_level": "elevated",
        }],
    )
    summary: str = Field(
        description="Human-readable summary of truthfulness assessment",
        examples=["Audio shows moderate deception signals: elevated pitch variability and jitter suggesting vocal stress"],
    )


class CombinedAnalysisResult(BaseModel):
    """Combined Intent + Truthfulness analysis."""
    
    intent_analysis: Dict = Field(
        description="Intent classification result (PROCEED/VERIFY/REJECT)",
    )
    truthfulness_analysis: TruthnessAnalysis = Field(
        description="Deception/truthfulness detection result",
    )
    combined_decision: str = Field(
        description="Final decision integrating both analyses",
        examples=["APPROVE", "VERIFY", "REJECT"],
    )
    trust_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Combined trust score: intent_confidence × (1 - deception_confidence)",
        examples=[0.63],
    )
    combined_confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Min confidence of intent and truthfulness analyses",
        examples=[0.72],
    )
    reasoning: str = Field(
        description="Explanation of the combined decision",
        examples=["PROCEED intent (87%) + TRUTHFUL speech (72%) = APPROVE with high confidence"],
    )
    recommendation: str = Field(
        description="Recommended action",
        examples=["auto_approve", "manual_verify", "reject"],
    )


# =============================================================================
# CULTIVATOR INTENTION DECISION SCHEMAS
# =============================================================================

class GateDecisionDetail(BaseModel):
    """Single gate decision detail with justification."""
    
    decision: str = Field(
        description="Gate decision outcome",
        examples=["PROCEED", "VERIFY", "REJECT"],
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence in this decision (0-1)",
        examples=[0.85],
    )
    reasoning: str = Field(
        description="Justification for the decision",
        examples=["High cultivation intent with truthful audio detected"],
    )
    positive_factors: List[str] = Field(
        description="List of positive behavioral indicators",
        examples=["✓ High cultivation intent (85%)", "✓ Legitimate farming keywords detected"],
    )
    risk_factors: List[str] = Field(
        description="List of risk or concern indicators",
        examples=["✗ Low cultivation intent (25%)", "⚠ Mixed audio deception signals"],
    )


class CultivatorDecisionResponse(BaseModel):
    """Cultivator intention analysis decision response."""
    
    success: bool = Field(
        default=True,
        description="Whether analysis was successful",
    )
    overall_recommendation: str = Field(
        description="Final recommendation: PROCEED/VERIFY/REJECT",
        examples=["PROCEED"],
    )
    overall_reason: str = Field(
        description="Explanation of the final recommendation",
        examples=["Both gates indicate positive signals for proceeding with land use agreement"],
    )
    combined_confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Overall confidence in the recommendation",
        examples=[0.87],
    )
    gate1: GateDecisionDetail = Field(
        description="Gate-1 result: Audio Intent + Deception Analysis",
    )
    gate2: GateDecisionDetail = Field(
        description="Gate-2 result: Emotion + Video Deception Analysis",
    )
    summary: Dict = Field(
        description="Summary statistics",
        examples=[{
            "total_positive_indicators": 6,
            "total_risk_indicators": 1,
            "risk_level": "LOW",
        }],
    )
    processing_time_ms: float = Field(
        description="Total processing time in milliseconds",
        examples=[456.78],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "overall_recommendation": "PROCEED",
                "overall_reason": "Both gates indicate positive signals for proceeding with land use agreement",
                "combined_confidence": 0.87,
                "gate1": {
                    "decision": "PROCEED",
                    "confidence": 0.89,
                    "reasoning": "Strong cultivation intent with truthful audio. Legitimate farming keywords detected. Ready to proceed.",
                    "positive_factors": [
                        "✓ High cultivation intent (89%)",
                        "✓ Truthful audio signals (85%)",
                        "✓ Legitimate cultivation keywords detected (3)",
                    ],
                    "risk_factors": [],
                },
                "gate2": {
                    "decision": "APPROVE",
                    "confidence": 0.85,
                    "reasoning": "Truthful behavioral signals with calm, composed demeanor. Indicates genuine commitment to land use agreement.",
                    "positive_factors": [
                        "✓ Truthful behavioral signals (84%)",
                        "✓ Calm/composed demeanor (neutral - 92%)",
                    ],
                    "risk_factors": [],
                },
                "summary": {
                    "total_positive_indicators": 6,
                    "total_risk_indicators": 0,
                    "risk_level": "LOW",
                },
                "processing_time_ms": 456.78,
            }
        }
    }

