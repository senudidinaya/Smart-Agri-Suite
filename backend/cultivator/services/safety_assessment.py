"""
Safety/Trustworthiness Assessment Service

Synthesizes intent signals and deception detection results to produce a
combined safety assessment for cultivators. Helps admins decide:
- Gate 1: PROCEED / VERIFY / REJECT
- Gate 2: APPROVE / VERIFY / REJECT
"""

from typing import Dict, List, Optional, Tuple
from cultivator.schemas.interview import SafetyAssessment


class SafetyAssessmentService:
    """
    Combines intent + deception signals to assess trustworthiness.
    
    Used to help admins determine if a cultivator is safe to recommend
    for work on a stranger's land.
    """

    # Intent score mapping
    INTENT_SCORES = {
        "HIGH_INTENT": 0.9,
        "MEDIUM_INTENT": 0.6,
        "LOW_INTENT": 0.3,
        "NO_INTENT": 0.0,
    }

    # Deception confidence threshold
    DECEPTION_THRESHOLD = 0.60
    HIGH_DECEPTION_THRESHOLD = 0.75

    # Emotional stability levels (Gate 2)
    STABLE_EMOTIONS = {"neutral", "happy", "calm"}
    UNSTABLE_EMOTIONS = {"fear", "anger", "surprise", "disgust"}

    @staticmethod
    def assess_gate1_safety(
        intent: str,
        intent_confidence: float,
        deception_label: Optional[str] = None,
        deception_confidence: Optional[float] = None,
    ) -> SafetyAssessment:
        """
        Gate 1: Audio-based safety assessment.

        Decision matrix:
        - HIGH_INTENT + TRUTHFUL → PROCEED
        - HIGH_INTENT + DECEPTIVE → VERIFY
        - MEDIUM_INTENT + TRUTHFUL → PROCEED
        - MEDIUM_INTENT + DECEPTIVE → VERIFY
        - LOW_INTENT + TRUTHFUL → VERIFY
        - LOW_INTENT + DECEPTIVE → REJECT
        - NO_INTENT → REJECT
        """
        intent_score = SafetyAssessmentService.INTENT_SCORES.get(intent, 0.0)
        is_deceptive = (
            deception_confidence is not None
            and deception_confidence >= SafetyAssessmentService.DECEPTION_THRESHOLD
        )

        primary_signals = []
        risk_flags = []
        admin_action = "VERIFY"
        admin_recommendation = ""

        # High intent case
        if intent == "HIGH_INTENT":
            if is_deceptive:
                safety_score = 0.55
                admin_action = "VERIFY"
                primary_signals.append(
                    f"HIGH_INTENT detected but DECEPTIVE speech patterns "
                    f"(confidence: {deception_confidence:.1%})"
                )
                risk_flags.append("deception_detected")
                risk_flags.append("intent_deception_mismatch")
                admin_recommendation = (
                    "Cultivator shows high interest but voice analysis detected deception indicators. "
                    "Manual review recommended to verify authenticity."
                )
            else:
                safety_score = 0.90
                admin_action = "PROCEED"
                primary_signals.append("HIGH_INTENT with truthful delivery")
                admin_recommendation = (
                    "Voice analysis shows strong, authentic interest. "
                    "Safe to proceed with cultivation recommendation."
                )

        # Medium intent case
        elif intent == "MEDIUM_INTENT":
            if is_deceptive:
                safety_score = 0.50
                admin_action = "VERIFY"
                primary_signals.append(
                    f"MEDIUM_INTENT with DECEPTIVE speech patterns "
                    f"(confidence: {deception_confidence:.1%})"
                )
                risk_flags.append("deception_detected")
                risk_flags.append("inconsistent_signals")
                admin_recommendation = (
                    "Moderate interest detected but voice patterns suggest inconsistency. "
                    "Admin review required to clarify intentions."
                )
            else:
                safety_score = 0.75
                admin_action = "PROCEED"
                primary_signals.append("MEDIUM_INTENT with truthful delivery")
                admin_recommendation = (
                    "Voice analysis shows authentic moderate interest. "
                    "Acceptable for cultivation recommendation."
                )

        # Low intent case
        elif intent == "LOW_INTENT":
            if is_deceptive:
                safety_score = 0.20
                admin_action = "REJECT"
                primary_signals.append(
                    f"LOW_INTENT combined with DECEPTIVE patterns "
                    f"(confidence: {deception_confidence:.1%})"
                )
                risk_flags.append("deception_detected")
                risk_flags.append("low_interest_with_deception")
                admin_recommendation = (
                    "Low interest combined with deception indicators. "
                    "High risk - NOT recommended for land cultivation work."
                )
            else:
                safety_score = 0.40
                admin_action = "VERIFY"
                primary_signals.append("LOW_INTENT but truthful")
                admin_recommendation = (
                    "Low interest detected but genuine. "
                    "May be shy/reserved - admin verification recommended."
                )

        # No intent case
        else:  # NO_INTENT
            safety_score = 0.05
            admin_action = "REJECT"
            primary_signals.append("NO_INTENT detected")
            risk_flags.append("no_genuine_interest")
            admin_recommendation = (
                "No genuine interest expressed. "
                "NOT suitable for cultivation recommendation."
            )

        return SafetyAssessment(
            safety_score=round(safety_score, 3),
            primary_signals=primary_signals,
            risk_flags=risk_flags,
            admin_action=admin_action,
            admin_recommendation=admin_recommendation,
        )

    @staticmethod
    def assess_gate2_safety(
        dominant_emotion: Optional[str] = None,
        emotion_distribution: Optional[Dict[str, float]] = None,
        deception_label: Optional[str] = None,
        deception_confidence: Optional[float] = None,
    ) -> SafetyAssessment:
        """
        Gate 2: Video/emotion-based safety assessment.

        Decision matrix based on emotional stability + deception:
        - Calm/Positive + TRUTHFUL → APPROVE
        - Calm/Positive + DECEPTIVE → VERIFY
        - Neutral + TRUTHFUL → VERIFY (acceptable)
        - Neutral + DECEPTIVE → VERIFY (review)
        - High Stress/Fear + TRUTHFUL → VERIFY (may be legitimate stress)
        - High Stress/Fear + DECEPTIVE → REJECT
        """
        is_deceptive = (
            deception_confidence is not None
            and deception_confidence >= SafetyAssessmentService.DECEPTION_THRESHOLD
        )

        primary_signals = []
        risk_flags = []
        admin_action = "VERIFY"
        admin_recommendation = ""

        # Determine emotional stability
        emotion_lower = (dominant_emotion or "").lower()
        is_stable = emotion_lower in SafetyAssessmentService.STABLE_EMOTIONS
        is_unstable = emotion_lower in SafetyAssessmentService.UNSTABLE_EMOTIONS

        # Calculate baseline score from emotion
        if is_stable:
            base_score = 0.85
            emotion_signal = f"Calm/stable demeanor ({emotion_lower})"
        elif is_unstable:
            base_score = 0.40
            emotion_signal = f"Stressed/emotional expression ({emotion_lower})"
        else:  # neutral or unknown
            base_score = 0.65
            emotion_signal = f"Neutral expression ({emotion_lower or 'unknown'})"

        # Apply deception modifier
        if is_deceptive:
            if is_stable:
                # Calm but deceptive = suspicious
                safety_score = 0.55
                admin_action = "VERIFY"
                primary_signals.append(
                    f"{emotion_signal} but DECEPTIVE facial cues "
                    f"(confidence: {deception_confidence:.1%})"
                )
                risk_flags.append("deception_detected")
                risk_flags.append("emotion_deception_mismatch")
                admin_recommendation = (
                    "Facial expressions appear calm but deception indicators detected. "
                    "Inconsistency warrants manual review."
                )
            elif is_unstable:
                # Stressed AND deceptive = high risk
                safety_score = 0.15
                admin_action = "REJECT"
                primary_signals.append(
                    f"{emotion_signal} combined with DECEPTIVE patterns "
                    f"(confidence: {deception_confidence:.1%})"
                )
                risk_flags.append("deception_detected")
                risk_flags.append("high_stress_with_deception")
                admin_recommendation = (
                    "Emotional stress combined with deception indicators. "
                    "High risk - NOT recommended for land work."
                )
            else:
                # Neutral but deceptive
                safety_score = 0.45
                admin_action = "VERIFY"
                primary_signals.append(
                    f"{emotion_signal} but with DECEPTIVE cues "
                    f"(confidence: {deception_confidence:.1%})"
                )
                risk_flags.append("deception_detected")
                admin_recommendation = (
                    "Neutral expression but deception cues detected. "
                    "Recommend admin review before proceeding."
                )
        else:
            # Truthful (no deception)
            if is_stable:
                safety_score = 0.90
                admin_action = "APPROVE"
                primary_signals.append(f"{emotion_signal} with truthful pattern")
                admin_recommendation = (
                    "Facial expressions show stable, honest demeanor. "
                    "Safe to approve for cultivation work."
                )
            elif is_unstable:
                safety_score = 0.50
                admin_action = "VERIFY"
                primary_signals.append(
                    f"{emotion_signal} but patterns appear genuine"
                )
                risk_flags.append("emotional_stress")
                admin_recommendation = (
                    "Emotional stress detected but appears genuine. "
                    "May have legitimate concerns - admin review recommended."
                )
            else:
                safety_score = 0.70
                admin_action = "VERIFY"
                primary_signals.append(f"{emotion_signal} with truthful pattern")
                admin_recommendation = (
                    "Neutral but honest expression. "
                    "Acceptable for consideration."
                )

        return SafetyAssessment(
            safety_score=round(safety_score, 3),
            primary_signals=primary_signals,
            risk_flags=risk_flags,
            admin_action=admin_action,
            admin_recommendation=admin_recommendation,
        )

    @staticmethod
    def combine_gate_assessments(
        gate1_assessment: SafetyAssessment,
        gate2_assessment: SafetyAssessment,
    ) -> SafetyAssessment:
        """
        Combine Gate 1 and Gate 2 assessments into a unified safety verdict.

        Logic:
        - If either gate is REJECT → REJECT
        - If both gates are APPROVE/PROCEED → PROCEED/APPROVE
        - Otherwise → VERIFY
        """
        gate1_action = gate1_assessment.admin_action
        gate2_action = gate2_assessment.admin_action

        # Combine risk flags
        combined_flags = list(set(gate1_assessment.risk_flags + gate2_assessment.risk_flags))

        # Combine signals
        combined_signals = gate1_assessment.primary_signals + gate2_assessment.primary_signals

        # Average safety scores
        combined_score = (gate1_assessment.safety_score + gate2_assessment.safety_score) / 2

        # Decision logic
        if gate1_action == "REJECT" or gate2_action == "REJECT":
            final_action = "REJECT"
            recommendation = (
                f"One or both gates detected significant risk. "
                f"NOT recommended. {gate1_assessment.admin_recommendation if gate1_action == 'REJECT' else gate2_assessment.admin_recommendation}"
            )
        elif gate1_action == "PROCEED" and gate2_action == "APPROVE":
            final_action = "PROCEED"
            recommendation = (
                f"Both audio and visual analysis confirm trustworthy behavior. "
                f"Safe to recommend for land cultivation work."
            )
        else:
            final_action = "VERIFY"
            recommendation = (
                f"Mixed signals across audio/visual analysis. "
                f"Admin review recommended to confirm intentions and assess risk. "
                f"Gate 1: {gate1_assessment.admin_recommendation} "
                f"Gate 2: {gate2_assessment.admin_recommendation}"
            )

        return SafetyAssessment(
            safety_score=round(combined_score, 3),
            primary_signals=combined_signals,
            risk_flags=combined_flags,
            admin_action=final_action,
            admin_recommendation=recommendation,
        )


def get_safety_assessment_service() -> SafetyAssessmentService:
    """Get singleton instance of safety assessment service."""
    return SafetyAssessmentService()
