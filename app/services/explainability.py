"""
DeepSeek Explainability Service for Intent Risk Predictions.

Smart Agri-Suite - Cultivator Intent Module V2

This module provides optional natural language explanations for
intent risk predictions using the DeepSeek API.

Usage:
    from app.services.explainability import get_prediction_explanation
    
    explanation = await get_prediction_explanation(
        prediction_result=result,
        prosodic_features=prosodic_features,
        text_features=text_features,
    )
"""

import os
from typing import Any, Dict, List, Optional

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)

# DeepSeek API configuration
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"


async def get_prediction_explanation(
    predicted_intent: str,
    confidence: float,
    all_scores: List[Dict[str, Any]],
    prosodic_features: Optional[Dict[str, float]] = None,
    text_features: Optional[Dict[str, int]] = None,
    model_version: str = "unknown",
    api_key: Optional[str] = None,
    timeout: float = 10.0,
) -> Optional[str]:
    """
    Generate a natural language explanation for the prediction.
    
    Args:
        predicted_intent: The predicted intent label (PROCEED/VERIFY/REJECT).
        confidence: Confidence score for the prediction.
        all_scores: List of all intent scores.
        prosodic_features: Prosodic features used in prediction.
        text_features: Text features used in prediction.
        model_version: Version of the model used.
        api_key: DeepSeek API key (falls back to env variable).
        timeout: Request timeout in seconds.
        
    Returns:
        Natural language explanation string, or None if failed.
    """
    # Get API key
    api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
    
    if not api_key:
        logger.debug("DeepSeek API key not configured, skipping explanation")
        return None
    
    # Build the prompt
    prompt = _build_explanation_prompt(
        predicted_intent=predicted_intent,
        confidence=confidence,
        all_scores=all_scores,
        prosodic_features=prosodic_features or {},
        text_features=text_features or {},
        model_version=model_version,
    )
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": DEEPSEEK_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an AI assistant that explains buyer intent "
                                "predictions in simple, actionable terms for agricultural "
                                "trade coordinators. Keep explanations concise (2-3 sentences) "
                                "and professional."
                            ),
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                    "max_tokens": 150,
                    "temperature": 0.7,
                },
            )
            
            response.raise_for_status()
            data = response.json()
            
            explanation = data["choices"][0]["message"]["content"].strip()
            
            logger.info(
                "DeepSeek explanation generated",
                extra={
                    "extra_data": {
                        "predicted_intent": predicted_intent,
                        "explanation_length": len(explanation),
                    }
                },
            )
            
            return explanation
            
    except httpx.TimeoutException:
        logger.warning("DeepSeek API timeout, skipping explanation")
        return None
    except httpx.HTTPStatusError as e:
        logger.warning(f"DeepSeek API error: {e.response.status_code}")
        return None
    except Exception as e:
        logger.error(f"Failed to generate explanation: {e}")
        return None


def _build_explanation_prompt(
    predicted_intent: str,
    confidence: float,
    all_scores: List[Dict[str, Any]],
    prosodic_features: Dict[str, float],
    text_features: Dict[str, int],
    model_version: str,
) -> str:
    """Build the explanation prompt."""
    
    # Format scores
    scores_str = ", ".join(
        f"{s.get('label', s.get('intent', 'unknown'))}: {s.get('score', 0):.1%}"
        for s in all_scores
    )
    
    # Key prosodic indicators
    prosodic_summary = []
    
    pitch_std = prosodic_features.get("pitch_std", 0)
    if pitch_std > 35:
        prosodic_summary.append("high vocal stress")
    elif pitch_std < 22:
        prosodic_summary.append("steady, confident voice")
    
    pause_ratio = prosodic_features.get("pause_ratio", 0)
    if pause_ratio > 0.22:
        prosodic_summary.append("many pauses/hesitations")
    elif pause_ratio < 0.12:
        prosodic_summary.append("fluent speech")
    
    speech_rate = prosodic_features.get("speech_rate", 0)
    if speech_rate > 3.2:
        prosodic_summary.append("fast speech rate")
    elif speech_rate < 2.7:
        prosodic_summary.append("slow speech rate")
    
    # Key text indicators
    text_summary = []
    
    positive = text_features.get("positive_word_count", 0)
    negative = text_features.get("negative_word_count", 0)
    if positive > negative * 2:
        text_summary.append("predominantly positive language")
    elif negative > positive * 2:
        text_summary.append("predominantly negative language")
    
    hesitation = text_features.get("hesitation_count", 0)
    if hesitation >= 5:
        text_summary.append("frequent hesitation markers")
    elif hesitation <= 1:
        text_summary.append("minimal hesitation")
    
    questions = text_features.get("question_count", 0)
    if questions >= 6:
        text_summary.append("many questions (uncertainty)")
    
    # Build prompt
    indicators = prosodic_summary + text_summary
    indicators_str = "; ".join(indicators) if indicators else "standard conversation patterns"
    
    prompt = f"""Explain this buyer intent prediction for an agricultural produce call:

Prediction: {predicted_intent} (confidence: {confidence:.1%})
All Scores: {scores_str}
Model Version: {model_version}

Key Indicators Detected:
{indicators_str}

Provide a brief, actionable explanation of why this prediction was made and what the coordinator should consider."""

    return prompt


def get_fallback_explanation(
    predicted_intent: str,
    confidence: float,
    prosodic_features: Optional[Dict[str, float]] = None,
    text_features: Optional[Dict[str, int]] = None,
) -> str:
    """
    Generate a simple rule-based explanation when DeepSeek is unavailable.
    
    Args:
        predicted_intent: The predicted intent label.
        confidence: Confidence score.
        prosodic_features: Prosodic features used.
        text_features: Text features used.
        
    Returns:
        Simple explanation string.
    """
    prosodic_features = prosodic_features or {}
    text_features = text_features or {}
    
    # Base explanation by intent
    explanations = {
        "PROCEED": (
            f"This caller shows strong buying intent ({confidence:.0%} confidence). "
            "Voice patterns indicate confidence and engagement. "
            "Recommend proceeding with the transaction."
        ),
        "VERIFY": (
            f"This caller shows moderate intent ({confidence:.0%} confidence). "
            "Some uncertainty detected in speech patterns. "
            "Recommend verifying key details before proceeding."
        ),
        "REJECT": (
            f"This caller shows low buying intent ({confidence:.0%} confidence). "
            "Voice analysis indicates hesitation or disengagement. "
            "Consider following up or deprioritizing this lead."
        ),
    }
    
    return explanations.get(
        predicted_intent,
        f"Prediction: {predicted_intent} with {confidence:.0%} confidence."
    )
