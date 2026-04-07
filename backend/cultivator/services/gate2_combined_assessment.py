"""
Conservative Gate-2 combined assessment.

This module keeps raw emotion and raw visual-deception evidence separate, then
adds a small business-facing verdict that is explicit about degraded branches.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


AGGREGATION_VERSION = "gate2-combined-v1"
VALID_FINAL_DECISIONS = {"APPROVE", "VERIFY", "REJECT"}


def build_raw_emotion(emotion_result: Any) -> Dict[str, Any]:
    """Normalize Gate-2 emotion output into the explicit rawEmotion contract."""
    stats = getattr(emotion_result, "stats", None) or {}
    model_version = getattr(emotion_result, "model_version", None)
    dominant = getattr(emotion_result, "dominant_emotion", None)
    decision = getattr(emotion_result, "decision_label", None)

    fallback_reason = stats.get("fallback_reason")
    degraded = (
        model_version == "gate2-fallback-v1"
        or dominant in (None, "", "unknown")
        or stats.get("model_loaded") is False
        or stats.get("frames_used", 0) == 0
        or stats.get("predictions_count", 0) == 0
    )

    return {
        "decision": decision if decision in VALID_FINAL_DECISIONS else "VERIFY",
        "confidence": float(getattr(emotion_result, "confidence", 0.0) or 0.0),
        "dominantEmotion": dominant or "unknown",
        "emotionDistribution": getattr(emotion_result, "emotion_distribution", None) or {},
        "topSignals": getattr(emotion_result, "top_signals", None) or [],
        "stats": stats,
        "modelVersion": model_version,
        "fallbackReason": fallback_reason,
        "healthy": not degraded,
        "degraded": degraded,
    }


def build_raw_deception(
    deception_result: Optional[Any],
    model_type: Optional[str] = None,
    fallback_reason: Optional[str] = None,
) -> Dict[str, Any]:
    """Normalize Gate-2 deception output into the explicit rawDeception contract."""
    if deception_result is None:
        return {
            "label": "unknown",
            "confidence": 0.0,
            "scores": {},
            "topSignals": [fallback_reason] if fallback_reason else [],
            "stats": {},
            "modelVersion": None,
            "modelType": model_type,
            "fallbackReason": fallback_reason or "Gate-2 deception branch unavailable",
            "healthy": False,
            "degraded": True,
        }

    label = getattr(deception_result, "deception_label", "unknown")
    confidence = float(getattr(deception_result, "deception_confidence", 0.0) or 0.0)
    model_version = getattr(deception_result, "model_version", None)
    stats = getattr(deception_result, "stats", None) or {}

    degraded = (
        label in (None, "", "unknown")
        or confidence <= 0.0
        or model_type == "rules"
        or model_version == "gate2-deception-rules-v1"
        or stats.get("frames_used", 1) == 0
        or stats.get("faces_detected", 1) == 0
    )

    derived_fallback_reason = fallback_reason
    if derived_fallback_reason is None and model_type == "rules":
        derived_fallback_reason = "Gate-2 deception ML artifacts unavailable; rules fallback used"

    return {
        "label": label or "unknown",
        "confidence": confidence,
        "scores": getattr(deception_result, "deception_scores", None) or {},
        "topSignals": getattr(deception_result, "signals", None) or [],
        "stats": stats,
        "modelVersion": model_version,
        "modelType": model_type,
        "fallbackReason": derived_fallback_reason,
        "healthy": not degraded,
        "degraded": degraded,
    }


def combine_gate2_assessment(
    raw_emotion: Dict[str, Any],
    raw_deception: Dict[str, Any],
) -> Dict[str, Any]:
    """Combine raw Gate-2 branches using deterministic conservative rules."""
    degraded_branches: List[str] = []
    if raw_emotion.get("degraded"):
        degraded_branches.append("emotion")
    if raw_deception.get("degraded"):
        degraded_branches.append("deception")

    emotion_decision = raw_emotion.get("decision") or "VERIFY"
    emotion_confidence = float(raw_emotion.get("confidence") or 0.0)
    deception_label = (raw_deception.get("label") or "unknown").lower()
    deception_confidence = float(raw_deception.get("confidence") or 0.0)

    emotion_healthy = raw_emotion.get("healthy") is True
    deception_healthy = raw_deception.get("healthy") is True

    reasoning: List[str] = []
    rule_path = "verify_default"
    final_decision = "VERIFY"
    risk_level = "medium"
    overall_confidence = 0.5
    recommendation = "Manual review recommended before making a Gate-2 decision."

    if raw_emotion.get("fallbackReason"):
        reasoning.append(f"Emotion branch degraded: {raw_emotion['fallbackReason']}")
    elif raw_emotion.get("degraded"):
        reasoning.append("Emotion branch degraded or insufficient for confident use")

    if raw_deception.get("fallbackReason"):
        reasoning.append(f"Deception branch degraded: {raw_deception['fallbackReason']}")
    elif raw_deception.get("degraded"):
        reasoning.append("Deception branch degraded or insufficient for confident use")

    if (
        deception_healthy
        and deception_label == "deceptive"
        and deception_confidence >= 0.75
    ):
        final_decision = "REJECT"
        risk_level = "high"
        overall_confidence = round(min(deception_confidence * 0.9, 0.95), 3)
        rule_path = "healthy_high_deception_reject"
        reasoning.append(
            f"Healthy deception branch detected high-risk deceptive cues ({deception_confidence:.0%})"
        )
        recommendation = "Reject or escalate: high-confidence visual deception indicators were detected."

    elif emotion_healthy and emotion_decision == "REJECT" and emotion_confidence >= 0.70:
        if deception_healthy and deception_label == "truthful" and deception_confidence >= 0.75:
            final_decision = "VERIFY"
            risk_level = "medium"
            overall_confidence = 0.6
            rule_path = "branch_disagreement_verify"
            reasoning.append(
                "Emotion branch shows high risk, but deception branch is confidently truthful"
            )
            recommendation = "Manual review required because Gate-2 branches disagree."
        else:
            final_decision = "REJECT"
            risk_level = "high"
            overall_confidence = round(min(emotion_confidence * 0.85, 0.9), 3)
            rule_path = "healthy_emotion_reject"
            reasoning.append(
                f"Healthy emotion branch produced REJECT with {emotion_confidence:.0%} confidence"
            )
            recommendation = "Reject or escalate: healthy emotion branch shows high-risk signals."

    elif degraded_branches:
        final_decision = "VERIFY"
        risk_level = "medium"
        overall_confidence = 0.5
        rule_path = "degraded_branch_verify"
        reasoning.append(
            "One or more Gate-2 branches are degraded; unknown evidence is not treated as approval"
        )
        recommendation = "Manual verification required because Gate-2 evidence is incomplete."

    elif deception_healthy and deception_label == "deceptive" and deception_confidence >= 0.60:
        final_decision = "VERIFY"
        risk_level = "medium"
        overall_confidence = round(min(deception_confidence * 0.8, 0.75), 3)
        rule_path = "moderate_deception_verify"
        reasoning.append(
            f"Deception branch detected elevated deceptive cues ({deception_confidence:.0%})"
        )
        recommendation = "Manual review recommended due to elevated visual deception indicators."

    elif emotion_healthy and emotion_decision == "VERIFY":
        final_decision = "VERIFY"
        risk_level = "medium"
        overall_confidence = round(min(max(emotion_confidence, 0.5), 0.75), 3)
        rule_path = "emotion_verify"
        reasoning.append("Emotion branch recommended VERIFY")
        recommendation = "Manual review recommended due to emotion-analysis uncertainty."

    elif (
        emotion_healthy
        and deception_healthy
        and emotion_decision == "APPROVE"
        and deception_label == "truthful"
        and deception_confidence >= 0.60
    ):
        final_decision = "APPROVE"
        risk_level = "low"
        overall_confidence = round(min(emotion_confidence, deception_confidence, 0.9), 3)
        rule_path = "both_healthy_low_risk_approve"
        reasoning.append("Both Gate-2 branches are healthy and low-risk")
        recommendation = "Approve Gate-2 result; raw evidence remains available for review."

    else:
        reasoning.append("Gate-2 evidence did not satisfy strict approval criteria")

    return {
        "finalDecision": final_decision,
        "recommendation": recommendation,
        "overallConfidence": overall_confidence,
        "trustScore": overall_confidence,
        "reasoning": reasoning,
        "riskLevel": risk_level,
        "degradedBranches": degraded_branches,
        "rulePath": rule_path,
        "aggregationVersion": AGGREGATION_VERSION,
    }

