"""
Explain endpoints – DeepSeek AI-powered insight generation.

Provides human-readable, professional explanations for both Gate-1 (voice
intent) and Gate-2 (video interview) analysis results to help admins make
informed decisions. Also generates tailored questions for calls and interviews.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.explain import (
    Gate1InsightRequest,
    Gate2InsightRequest,
    InsightResponse,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
    Question,
)
from app.services.deepseek_service import (
    generate_gate1_insight,
    generate_gate2_insight,
    generate_questions,
)

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


@router.post(
    "/questions",
    response_model=QuestionGenerationResponse,
    summary="Generate Call/Interview Questions",
    description="Uses DeepSeek AI to generate tailored questions for admins to ask during Gate-1 calls or Gate-2 interviews.",
)
async def generate_interview_questions(body: QuestionGenerationRequest) -> QuestionGenerationResponse:
    """Generate AI-powered questions based on job type and plantation."""
    try:
        # Validate gate parameter
        gate = body.gate.lower()
        if gate not in ("gate1", "gate2"):
            raise HTTPException(
                status_code=400,
                detail="Invalid gate value. Must be 'gate1' or 'gate2'.",
            )

        questions_data = await generate_questions(
            job_title=body.job_title,
            plantation_type=body.plantation_type,
            gate=gate,
            num_questions=body.num_questions,
        )

        # Convert to Question objects
        questions = [
            Question(
                question=q["question"],
                purpose=q["purpose"],
                follow_up_hint=q.get("follow_up_hint"),
            )
            for q in questions_data
        ]

        return QuestionGenerationResponse(
            success=True,
            gate=gate,
            job_title=body.job_title,
            plantation_type=body.plantation_type,
            questions=questions,
        )

    except RuntimeError as exc:
        logger.error("Question generation failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected error generating questions: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate questions. Please try again.",
        ) from exc
        raise HTTPException(
            status_code=500,
            detail="Failed to generate insight. Please try again.",
        ) from exc
