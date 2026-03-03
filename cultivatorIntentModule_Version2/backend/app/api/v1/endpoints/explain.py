"""
Explain endpoints – DeepSeek AI-powered insight generation.

Provides human-readable, professional explanations for both Gate-1 (voice
intent) and Gate-2 (video interview) analysis results to help admins make
informed decisions.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.explain import Gate1InsightRequest, Gate2InsightRequest, InsightResponse
from app.services.deepseek_service import generate_gate1_insight, generate_gate2_insight

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/explain", tags=["Explain"])


@router.post(
    "/gate1",
    response_model=InsightResponse,
    summary="Generate Gate-1 Voice Intent Insight",
    description="Uses DeepSeek AI to produce a professional paragraph explaining Gate-1 voice intent analysis results.",
)
async def explain_gate1(body: Gate1InsightRequest) -> InsightResponse:
    """Generate an AI insight for Gate-1 voice intent results."""
    try:
        insight = await generate_gate1_insight(
            intent_label=body.intent_label,
            confidence=body.confidence,
            scores=body.scores,
        )
        return InsightResponse(success=True, insight=insight)
    except RuntimeError as exc:
        logger.error("Gate-1 insight generation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected error generating Gate-1 insight: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate insight. Please try again.",
        ) from exc


@router.post(
    "/gate2",
    response_model=InsightResponse,
    summary="Generate Gate-2 Video Interview Insight",
    description="Uses DeepSeek AI to produce a professional paragraph explaining Gate-2 video interview analysis results.",
)
async def explain_gate2(body: Gate2InsightRequest) -> InsightResponse:
    """Generate an AI insight for Gate-2 video interview results."""
    try:
        insight = await generate_gate2_insight(
            decision=body.decision,
            confidence=body.confidence,
            dominant_emotion=body.dominant_emotion,
            emotion_distribution=body.emotion_distribution,
            top_signals=body.top_signals,
            stats=body.stats,
        )
        return InsightResponse(success=True, insight=insight)
    except RuntimeError as exc:
        logger.error("Gate-2 insight generation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected error generating Gate-2 insight: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate insight. Please try again.",
        ) from exc
