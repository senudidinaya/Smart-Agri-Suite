"""
LLM Explanation & Question-Generation Service.

Generates human-readable, professional explanations for Gate-1 (voice intent)
and Gate-2 (video interview) analysis results using the Groq chat API.
Helps admins interpret ML predictions with evidence-grounded insights.

The active provider is Groq (OpenAI-compatible).
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from cultivator.core.config import get_settings
from cultivator.core.database import get_db
from cultivator.core.middleware import get_correlation_id

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt version identifiers  (Phase 3 – auditability)
# ---------------------------------------------------------------------------

GATE1_EXPLANATION_PROMPT_VERSION = "v1"
GATE2_EXPLANATION_PROMPT_VERSION = "v1"
GATE1_QUESTIONS_PROMPT_VERSION = "v1"
GATE2_QUESTIONS_PROMPT_VERSION = "v1"

_PROVIDER = "groq"

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

GATE1_SYSTEM_PROMPT = (
    "You are an expert agricultural HR analytics advisor. Your role is to "
    "explain voice-based intent analysis results from screening calls between "
    "an admin recruiter and a cultivator (farm worker) applicant. The ML system "
    "has already analysed paralinguistic vocal features and conversation content "
    "to predict the cultivator's genuine intention level.\n\n"
    "IMPORTANT CONSTRAINTS:\n"
    "- You are an explanation layer ONLY. The decision has already been made by "
    "the ML pipeline. Do NOT override, upgrade, or downgrade it.\n"
    "- Base your explanation strictly on the evidence provided below. Do NOT "
    "invent facts, scores, or signals not present in the input.\n"
    "- Do NOT make a new decision or tell the admin what to do.\n\n"
    "Provide a detailed, professional paragraph (4-6 sentences) that:\n"
    "1. Summarises the prediction and confidence the model produced.\n"
    "2. Highlights which score dimensions drove the result.\n"
    "3. Notes any areas the admin may wish to explore further.\n"
    "Keep the tone informative yet accessible. Do NOT use bullet points — "
    "write a single cohesive paragraph."
)

GATE2_SYSTEM_PROMPT = (
    "You are an expert agricultural HR analytics advisor. Your role is to "
    "explain video-based facial expression analysis results from an "
    "in-person interview with a cultivator (farm worker) applicant. The ML system "
    "has already analysed facial micro-expressions across video frames to assess "
    "emotional authenticity and engagement.\n\n"
    "IMPORTANT CONSTRAINTS:\n"
    "- You are an explanation layer ONLY. The decision has already been made by "
    "the ML pipeline. Do NOT override, upgrade, or downgrade it.\n"
    "- Base your explanation strictly on the evidence provided below. Do NOT "
    "invent facts, scores, or signals not present in the input.\n"
    "- Do NOT make a new decision or tell the admin what to do.\n\n"
    "Provide a detailed, professional paragraph (4-6 sentences) that:\n"
    "1. Summarises the decision and confidence the model produced.\n"
    "2. Interprets the dominant emotion and emotion distribution.\n"
    "3. Comments on the key signals detected.\n"
    "4. Notes any areas the admin may wish to explore further.\n"
    "Keep the tone informative yet accessible. Do NOT use bullet points — "
    "write a single cohesive paragraph."
)

# ---------------------------------------------------------------------------
# Question Generation Prompts
# ---------------------------------------------------------------------------

GATE1_QUESTIONS_SYSTEM_PROMPT = (
    "You are an expert agricultural recruitment advisor. Your role is to help "
    "admin recruiters conduct effective introductory screening calls with "
    "cultivator (farm worker) applicants.\n\n"
    "For Gate-1 (introductory call), the goal is to:\n"
    "1. Verify the applicant's basic interest and availability\n"
    "2. Understand their relevant experience at a high level\n"
    "3. Assess communication skills and professionalism\n"
    "4. Determine if they should proceed to a formal interview\n\n"
    "Questions should be conversational, welcoming, and not too technical. "
    "This is a brief screening call, not a detailed interview.\n\n"
    "Generate questions in JSON format with this exact structure:\n"
    "[\n"
    '  {"question": "...", "purpose": "...", "follow_up_hint": "..."}\n'
    "]\n"
    "Each question object must have: question (the text), purpose (what it assesses), "
    "and follow_up_hint (optional clarification prompt)."
)

GATE2_QUESTIONS_SYSTEM_PROMPT = (
    "You are an expert agricultural recruitment advisor. Your role is to help "
    "admin recruiters conduct thorough in-person interviews with "
    "cultivator (farm worker) applicants.\n\n"
    "For Gate-2 (formal interview), the goal is to:\n"
    "1. Deeply assess technical knowledge and hands-on experience\n"
    "2. Evaluate problem-solving abilities in agricultural contexts\n"
    "3. Understand work ethic, reliability, and commitment\n"
    "4. Assess cultural fit and teamwork capabilities\n"
    "5. Verify specific skills relevant to the plantation type\n\n"
    "Questions should be detailed, scenario-based where appropriate, and "
    "designed to reveal practical expertise. This is a comprehensive interview.\n\n"
    "Generate questions in JSON format with this exact structure:\n"
    "[\n"
    '  {"question": "...", "purpose": "...", "follow_up_hint": "..."}\n'
    "]\n"
    "Each question object must have: question (the text), purpose (what it assesses), "
    "and follow_up_hint (optional clarification prompt)."
)


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------

async def generate_gate1_insight(
    intent_label: str,
    confidence: float,
    scores: Dict[str, float],
    *,
    recommendation: Optional[str] = None,
    trust_score: Optional[float] = None,
    risk_level: Optional[str] = None,
    reasoning: Optional[str] = None,
    reasons: Optional[List[str]] = None,
    deception_label: Optional[str] = None,
    deception_confidence: Optional[float] = None,
) -> str:
    """
    Generate an AI-powered explanation for Gate-1 voice intent results.

    Args:
        intent_label: The predicted intent label (PROCEED / VERIFY / REJECT).
        confidence: Prediction confidence as a percentage (0-100).
        scores: Dictionary mapping score names to their values.
        recommendation: Optional pipeline recommendation text.
        trust_score: Optional overall trust score (0-100).
        risk_level: Optional risk level label.
        reasoning: Optional pipeline reasoning summary.
        reasons: Optional list of reason strings.
        deception_label: Optional deception model label.
        deception_confidence: Optional deception model confidence (0-100).

    Returns:
        A 4-6 sentence professional paragraph explaining the result.
    """
    user_content = (
        f"Here are the Gate-1 voice intent analysis results for a cultivator applicant:\n"
        f"• Predicted Intent: {intent_label}\n"
        f"• Confidence: {confidence:.1f}%\n"
        f"• Score Breakdown:\n"
    )
    for name, value in scores.items():
        user_content += f"  - {name}: {value:.1f}%\n"

    # Phase-2 richer evidence (appended only when available)
    if trust_score is not None:
        user_content += f"• Trust Score: {trust_score:.1f}%\n"
    if risk_level:
        user_content += f"• Risk Level: {risk_level}\n"
    if recommendation:
        user_content += f"• Pipeline Recommendation: {recommendation}\n"
    if reasoning:
        user_content += f"• Pipeline Reasoning: {reasoning}\n"
    if reasons:
        user_content += f"• Key Reasons: {'; '.join(reasons)}\n"
    if deception_label:
        user_content += f"• Deception Assessment: {deception_label}"
        if deception_confidence is not None:
            user_content += f" ({deception_confidence:.1f}% confidence)"
        user_content += "\n"

    user_content += (
        "\nPlease provide a professional interpretation of these results "
        "to help the admin recruiter make an informed decision."
    )

    return await _call_llm(
        GATE1_SYSTEM_PROMPT,
        user_content,
        flow="gate1_explanation",
        prompt_version=GATE1_EXPLANATION_PROMPT_VERSION,
    )


async def generate_gate2_insight(
    decision: str,
    confidence: float,
    dominant_emotion: str,
    emotion_distribution: Dict[str, float],
    top_signals: list,
    stats: Optional[Dict[str, Any]] = None,
    *,
    combined_reasoning: Optional[List[str]] = None,
    trust_score: Optional[float] = None,
    risk_level: Optional[str] = None,
    raw_emotion: Optional[Dict[str, Any]] = None,
    raw_deception: Optional[Dict[str, Any]] = None,
    safety_assessment: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generate an AI-powered explanation for Gate-2 combined interview results.

    Args:
        decision: The combined Gate-2 decision (APPROVE / VERIFY / REJECT).
        confidence: Combined Gate-2 overall confidence as a percentage (0-100).
        dominant_emotion: The raw emotion branch's most frequently detected emotion.
        emotion_distribution: Raw emotion branch mapping of emotion names to percentages.
        top_signals: List of key behavioural signals detected.
        stats: Optional processing statistics (frames analysed, etc.).
        combined_reasoning: Optional reasoning strings from the aggregator.
        trust_score: Optional combined trust score (0-100).
        risk_level: Optional risk level label.
        raw_emotion: Optional full raw emotion branch payload.
        raw_deception: Optional full raw deception branch payload.
        safety_assessment: Optional safety assessment payload.

    Returns:
        A 4-6 sentence professional paragraph explaining the result.
    """
    user_content = (
        f"Here are the Gate-2 combined interview assessment results for a cultivator applicant:\n"
        f"Decision and confidence are the combined Gate-2 assessment; "
        f"dominant emotion and emotion distribution are raw emotion branch evidence.\n"
        f"• Decision: {decision}\n"
        f"• Confidence: {confidence:.1f}%\n"
        f"• Dominant Emotion: {dominant_emotion}\n"
        f"• Emotion Distribution:\n"
    )
    for emotion, pct in emotion_distribution.items():
        user_content += f"  - {emotion}: {pct:.1f}%\n"

    if top_signals:
        user_content += f"• Key Signals: {', '.join(top_signals)}\n"

    if stats:
        user_content += (
            f"• Processing Stats: {stats.get('frames_analyzed', 'N/A')} frames analysed, "
            f"faces detected in {stats.get('faces_detected_frames', 'N/A')} frames\n"
        )

    # Phase-2 richer evidence (appended only when available)
    if trust_score is not None:
        user_content += f"• Trust Score: {trust_score:.1f}%\n"
    if risk_level:
        user_content += f"• Risk Level: {risk_level}\n"
    if combined_reasoning:
        user_content += f"• Aggregator Reasoning: {'; '.join(combined_reasoning)}\n"
    if raw_deception:
        dec_label = raw_deception.get('label', 'N/A')
        dec_conf = raw_deception.get('confidence')
        user_content += f"• Deception Branch: {dec_label}"
        if dec_conf is not None:
            normalized = dec_conf * 100 if dec_conf <= 1 else dec_conf
            user_content += f" ({normalized:.1f}% confidence)"
        user_content += "\n"
        dec_signals = raw_deception.get('topSignals', [])
        if dec_signals:
            user_content += f"  Deception Signals: {', '.join(dec_signals)}\n"
    if raw_emotion and raw_emotion.get('degraded'):
        user_content += "• ⚠ Emotion branch was degraded (results may be less reliable).\n"
    if safety_assessment:
        score = safety_assessment.get('safety_score')
        action = safety_assessment.get('admin_action', 'N/A')
        user_content += f"• Safety Assessment: score {score}, recommended action {action}\n"
        flags = safety_assessment.get('risk_flags', [])
        if flags:
            user_content += f"  Risk Flags: {', '.join(flags)}\n"

    user_content += (
        "\nPlease provide a professional interpretation of these results "
        "to help the admin make an informed hiring decision."
    )

    return await _call_llm(
        GATE2_SYSTEM_PROMPT,
        user_content,
        flow="gate2_explanation",
        prompt_version=GATE2_EXPLANATION_PROMPT_VERSION,
    )


async def generate_questions(
    job_title: str,
    plantation_type: str,
    gate: str,
    num_questions: int = 5,
) -> list:
    """
    Generate AI-powered questions for admin to ask during calls/interviews.

    Args:
        job_title: The type of work (e.g., Harvesting, Planting).
        plantation_type: The plantation type(s) (e.g., Cinnamon, Cardamom).
        gate: Either 'gate1' (introductory call) or 'gate2' (formal interview).
        num_questions: Number of questions to generate (default: 5).

    Returns:
        A list of question objects with question, purpose, and follow_up_hint.
    """
    import json

    # Select the appropriate prompt based on gate
    if gate.lower() == "gate1":
        system_prompt = GATE1_QUESTIONS_SYSTEM_PROMPT
        context = "introductory screening call"
    else:
        system_prompt = GATE2_QUESTIONS_SYSTEM_PROMPT
        context = "formal in-person interview"

    user_content = (
        f"Generate {num_questions} questions for a {context} with a cultivator applicant.\n\n"
        f"Job Details:\n"
        f"• Work Type: {job_title}\n"
        f"• Plantation Experience Required: {plantation_type}\n\n"
        f"The questions should be tailored to assess the applicant's suitability "
        f"for {job_title} work in {plantation_type} plantations.\n\n"
        f"Return ONLY a valid JSON array with {num_questions} question objects. "
        f"No additional text or explanation."
    )

    qp_version = (
        GATE1_QUESTIONS_PROMPT_VERSION if gate.lower() == "gate1"
        else GATE2_QUESTIONS_PROMPT_VERSION
    )

    response_text = await _call_llm(
        system_prompt,
        user_content,
        flow="question_generation",
        prompt_version=qp_version,
    )

    # Parse the JSON response
    try:
        # Clean up response - remove markdown code blocks if present
        clean_response = response_text.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        clean_response = clean_response.strip()

        questions = json.loads(clean_response)

        # Validate structure
        validated_questions = []
        for q in questions:
            validated_questions.append({
                "question": q.get("question", ""),
                "purpose": q.get("purpose", ""),
                "follow_up_hint": q.get("follow_up_hint"),
            })

        return validated_questions

    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM question response: %s", exc)
        logger.debug("Raw response: %s", response_text)
        raise RuntimeError("Failed to parse AI-generated questions") from exc


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

async def _call_llm(
    system_prompt: str,
    user_content: str,
    *,
    flow: str = "unknown",
    prompt_version: str = "unknown",
) -> str:
    """
    Call the Groq Chat Completions API (OpenAI-compatible).

    The active provider for this service path is Groq.

    Phase 3 additions:
    - Structured audit logging (provider, model, prompt_version, flow,
      correlation_id, latency, success/failure).
    - Optional MongoDB persistence to ``explanation_audits`` collection.

    Raises:
        RuntimeError: If the API call fails or the key is missing.
    """
    settings = get_settings()

    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured in .env")

    correlation_id = get_correlation_id()
    model = settings.groq_model

    # Common audit fields shared by success and failure paths
    audit_base = {
        "provider": _PROVIDER,
        "model": model,
        "prompt_version": prompt_version,
        "flow": flow,
        "correlation_id": correlation_id,
    }

    logger.info(
        "LLM call started",
        extra={"extra_data": {**audit_base, "event": "llm_call_start"}},
    )

    url = f"{settings.groq_base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.7,
        "max_tokens": 512,
    }

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            generated_text = data["choices"][0]["message"]["content"].strip()

        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        usage = data.get("usage", {})

        logger.info(
            "LLM call succeeded",
            extra={"extra_data": {
                **audit_base,
                "event": "llm_call_success",
                "latency_ms": latency_ms,
                "prompt_tokens": usage.get("prompt_tokens"),
                "completion_tokens": usage.get("completion_tokens"),
                "total_tokens": usage.get("total_tokens"),
            }},
        )

        # --- Persist audit record (non-blocking, best-effort) ---
        if settings.explanation_audit_persist:
            await _persist_audit(
                audit_base=audit_base,
                success=True,
                latency_ms=latency_ms,
                user_content=user_content,
                generated_text=generated_text,
                usage=usage,
            )

        return generated_text

    except httpx.HTTPStatusError as exc:
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        logger.error(
            "LLM call HTTP error",
            extra={"extra_data": {
                **audit_base,
                "event": "llm_call_failure",
                "latency_ms": latency_ms,
                "http_status": exc.response.status_code,
            }},
        )
        if settings.explanation_audit_persist:
            await _persist_audit(
                audit_base=audit_base,
                success=False,
                latency_ms=latency_ms,
                user_content=user_content,
                error=f"HTTP {exc.response.status_code}",
            )
        raise RuntimeError(f"Groq API returned {exc.response.status_code}") from exc
    except Exception as exc:
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        logger.error(
            "LLM call failed",
            extra={"extra_data": {
                **audit_base,
                "event": "llm_call_failure",
                "latency_ms": latency_ms,
                "error": str(exc)[:200],
            }},
        )
        if settings.explanation_audit_persist:
            await _persist_audit(
                audit_base=audit_base,
                success=False,
                latency_ms=latency_ms,
                user_content=user_content,
                error=str(exc)[:200],
            )
        raise RuntimeError(f"Groq API call failed: {exc}") from exc


async def _persist_audit(
    *,
    audit_base: dict,
    success: bool,
    latency_ms: float,
    user_content: str,
    generated_text: str = "",
    usage: dict | None = None,
    error: str = "",
) -> None:
    """Best-effort write to the ``explanation_audits`` MongoDB collection."""
    try:
        db = get_db()
        if db is None:
            return
        doc = {
            **audit_base,
            "success": success,
            "latency_ms": latency_ms,
            "evidence_payload": user_content,
            "generated_text": generated_text,
            "generated_at": datetime.now(timezone.utc),
            "error": error,
        }
        if usage:
            doc["usage"] = usage
        await db.explanation_audits.insert_one(doc)
    except Exception:
        logger.warning("Failed to persist explanation audit record", exc_info=True)
