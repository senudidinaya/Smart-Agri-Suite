"""
Schemas for DeepSeek AI-powered insight explanations.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Gate-1 (voice intent) insight
# ---------------------------------------------------------------------------

class Gate1InsightRequest(BaseModel):
    """Request body for Gate-1 voice intent insight generation."""

    intent_label: str = Field(
        description="Predicted intent label (PROCEED / VERIFY / REJECT)",
        examples=["PROCEED"],
    )
    confidence: float = Field(
        description="Prediction confidence as a percentage (0-100)",
        examples=[87.5],
    )
    scores: Dict[str, float] = Field(
        description="Mapping of score dimension names to percentages",
        examples=[{"Engagement": 82.0, "Clarity": 74.5, "Tone Positivity": 91.0}],
    )


class Gate2InsightRequest(BaseModel):
    """Request body for Gate-2 video interview insight generation."""

    decision: str = Field(
        description="Predicted decision label (APPROVE / VERIFY / REJECT)",
        examples=["APPROVE"],
    )
    confidence: float = Field(
        description="Prediction confidence as a percentage (0-100)",
        examples=[79.3],
    )
    dominant_emotion: str = Field(
        description="The most frequently detected facial emotion",
        examples=["happy"],
    )
    emotion_distribution: Dict[str, float] = Field(
        description="Mapping of emotion names to percentages",
        examples=[{"happy": 45.0, "neutral": 30.0, "surprise": 15.0, "sad": 10.0}],
    )
    top_signals: List[str] = Field(
        default=[],
        description="Key behavioural signals detected during the interview",
        examples=[["Consistent positive expressions", "Good eye contact"]],
    )
    stats: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Processing statistics (frames_analyzed, faces_detected_frames, etc.)",
    )


class InsightResponse(BaseModel):
    """Response containing the AI-generated insight paragraph."""

    success: bool = Field(default=True, description="Whether insight generation succeeded")
    insight: str = Field(
        description="AI-generated professional paragraph explaining the analysis results",
    )
