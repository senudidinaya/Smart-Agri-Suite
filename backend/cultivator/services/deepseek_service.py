"""
DeepSeek AI Integration Service.

Generates human-readable, professional explanations for Gate-1 (voice intent)
and Gate-2 (video interview) analysis results using the DeepSeek chat API.
Helps admins interpret ML predictions with actionable, contextual insights.
"""

import logging
from typing import Any, Dict, Optional

import httpx

from cultivator.core.config import get_settings

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

    response_text = await _call_deepseek(system_prompt, user_content)

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
        logger.error("Failed to parse DeepSeek question response: %s", exc)
        logger.debug("Raw response: %s", response_text)
        raise RuntimeError("Failed to parse AI-generated questions") from exc


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
