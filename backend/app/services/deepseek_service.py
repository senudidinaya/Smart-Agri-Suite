"""
DeepSeek AI Integration Service.

Generates human-readable, professional explanations for Gate-1 (voice intent)
and Gate-2 (video interview) analysis results using the DeepSeek chat API.
Helps admins interpret ML predictions with actionable, contextual insights.
"""

import logging
from typing import Any, Dict, Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

GATE1_SYSTEM_PROMPT = (
    "You are an expert agricultural HR analytics advisor. Your role is to "
    "interpret voice-based intent analysis results from screening calls between "
    "an admin recruiter and a cultivator (farm worker) applicant. The system "
    "analyses paralinguistic vocal features and conversation content to predict "
    "the cultivator's genuine intention level.\n\n"
    "Provide a detailed, professional paragraph (4-6 sentences) that:\n"
    "1. Summarises the overall prediction and confidence level.\n"
    "2. Highlights which score dimensions drove the result.\n"
    "3. Offers a practical recommendation to the admin on next steps.\n"
    "Keep the tone informative yet accessible. Do NOT use bullet points — "
    "write a single cohesive paragraph."
)

GATE2_SYSTEM_PROMPT = (
    "You are an expert agricultural HR analytics advisor. Your role is to "
    "interpret video-based facial expression analysis results from an "
    "in-person interview with a cultivator (farm worker) applicant. The system "
    "analyses facial micro-expressions across video frames to assess emotional "
    "authenticity and engagement.\n\n"
    "Provide a detailed, professional paragraph (4-6 sentences) that:\n"
    "1. Summarises the overall decision and confidence level.\n"
    "2. Interprets the dominant emotion and emotion distribution.\n"
    "3. Comments on key signals detected.\n"
    "4. Offers a practical recommendation to the admin on next steps.\n"
    "Keep the tone informative yet accessible. Do NOT use bullet points — "
    "write a single cohesive paragraph."
)


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------

async def generate_gate1_insight(
    intent_label: str,
    confidence: float,
    scores: Dict[str, float],
) -> str:
    """
    Generate a DeepSeek-powered explanation for Gate-1 voice intent results.

    Args:
        intent_label: The predicted intent label (PROCEED / VERIFY / REJECT).
        confidence: Prediction confidence as a percentage (0-100).
        scores: Dictionary mapping score names to their values.

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

    user_content += (
        "\nPlease provide a professional interpretation of these results "
        "to help the admin recruiter make an informed decision."
    )

    return await _call_deepseek(GATE1_SYSTEM_PROMPT, user_content)


async def generate_gate2_insight(
    decision: str,
    confidence: float,
    dominant_emotion: str,
    emotion_distribution: Dict[str, float],
    top_signals: list,
    stats: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generate a DeepSeek-powered explanation for Gate-2 video interview results.

    Args:
        decision: The predicted decision (APPROVE / VERIFY / REJECT).
        confidence: Prediction confidence as a percentage (0-100).
        dominant_emotion: The most frequently detected emotion.
        emotion_distribution: Mapping of emotion names to percentages.
        top_signals: List of key behavioural signals detected.
        stats: Optional processing statistics (frames analysed, etc.).

    Returns:
        A 4-6 sentence professional paragraph explaining the result.
    """
    user_content = (
        f"Here are the Gate-2 video interview analysis results for a cultivator applicant:\n"
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

    user_content += (
        "\nPlease provide a professional interpretation of these results "
        "to help the admin make an informed hiring decision."
    )

    return await _call_deepseek(GATE2_SYSTEM_PROMPT, user_content)


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

async def _call_deepseek(system_prompt: str, user_content: str) -> str:
    """
    Call the DeepSeek Chat Completions API.

    Raises:
        RuntimeError: If the API call fails or the key is missing.
    """
    settings = get_settings()

    if not settings.deepseek_api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured in .env")

    url = f"{settings.deepseek_base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.7,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as exc:
        logger.error("DeepSeek API HTTP error: %s – %s", exc.response.status_code, exc.response.text)
        raise RuntimeError(f"DeepSeek API returned {exc.response.status_code}") from exc
    except Exception as exc:
        logger.error("DeepSeek API call failed: %s", exc)
        raise RuntimeError(f"DeepSeek API call failed: {exc}") from exc
