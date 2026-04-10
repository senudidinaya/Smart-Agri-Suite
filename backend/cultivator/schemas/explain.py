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

    # --- Phase-2 optional richer evidence ---
    recommendation: Optional[str] = Field(
        default=None,
        description="Pipeline recommendation text (e.g. 'Proceed to interview')",
    )
    trust_score: Optional[float] = Field(
        default=None,
        description="Overall trust score (0-100)",
    )
    risk_level: Optional[str] = Field(
        default=None,
        description="Risk level label (low / medium / high)",
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="Pipeline reasoning summary",
    )
    reasons: Optional[List[str]] = Field(
        default=None,
        description="List of reason strings from the pipeline",
    )
    deception_label: Optional[str] = Field(
        default=None,
        description="Deception model label (e.g. 'truthful', 'deceptive')",
    )
    deception_confidence: Optional[float] = Field(
        default=None,
        description="Deception model confidence (0-100)",
    )


class Gate2InsightRequest(BaseModel):
    """Request body for Gate-2 combined interview insight generation."""

    decision: str = Field(
        description="Combined Gate-2 final decision label (APPROVE / VERIFY / REJECT)",
        examples=["APPROVE"],
    )
    confidence: float = Field(
        description="Combined Gate-2 overall confidence as a percentage (0-100)",
        examples=[79.3],
    )
    dominant_emotion: str = Field(
        description="Raw emotion branch dominant facial emotion",
        examples=["happy"],
    )
    emotion_distribution: Dict[str, float] = Field(
        description="Raw emotion branch mapping of emotion names to percentages",
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

    # --- Phase-2 optional richer evidence ---
    combined_reasoning: Optional[List[str]] = Field(
        default=None,
        description="Reasoning strings from the combined assessment aggregator",
    )
    trust_score: Optional[float] = Field(
        default=None,
        description="Combined assessment trust score (0-100)",
    )
    risk_level: Optional[str] = Field(
        default=None,
        description="Combined assessment risk level (low / medium / high)",
    )
    raw_emotion: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Full raw emotion branch payload (decision, confidence, healthy, degraded, etc.)",
    )
    raw_deception: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Full raw deception branch payload (label, confidence, scores, etc.)",
    )
    safety_assessment: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Safety assessment payload (safety_score, risk_flags, admin_action, etc.)",
    )


class InsightResponse(BaseModel):
    """Response containing the AI-generated insight paragraph."""

    success: bool = Field(default=True, description="Whether insight generation succeeded")
    insight: str = Field(
        description="AI-generated professional paragraph explaining the analysis results",
    )


# ---------------------------------------------------------------------------
# Question generation for calls and interviews
# ---------------------------------------------------------------------------

class QuestionGenerationRequest(BaseModel):
    """Request body for generating interview/call questions."""

    job_title: str = Field(
        description="The type of work (e.g., Harvesting, Planting, Irrigation)",
        examples=["Harvesting"],
    )
    plantation_type: str = Field(
        description="The plantation type(s) requiring experience",
        examples=["Cinnamon, Cardamom"],
    )
    gate: str = Field(
        description="The gate type: 'gate1' for introductory call, 'gate2' for interview",
        examples=["gate1"],
    )
    num_questions: int = Field(
        default=5,
        description="Number of questions to generate (default: 5)",
        ge=3,
        le=10,
    )


class Question(BaseModel):
    """A single generated question."""

    question: str = Field(description="The question text")
    purpose: str = Field(description="Brief explanation of what this question assesses")
    follow_up_hint: Optional[str] = Field(
        default=None,
        description="Optional hint for follow-up if the answer is unclear",
    )


class QuestionGenerationResponse(BaseModel):
    """Response containing generated questions for the admin."""

    success: bool = Field(default=True, description="Whether question generation succeeded")
    gate: str = Field(description="The gate type (gate1 or gate2)")
    job_title: str = Field(description="The job title/work type")
    plantation_type: str = Field(description="The plantation type(s)")
    questions: List[Question] = Field(description="List of generated questions")
