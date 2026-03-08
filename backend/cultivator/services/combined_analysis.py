# ============================================================================
# COMBINED DECISION MATRIX: Intent × Truthfulness
# ============================================================================

def combine_intent_and_deception(
    intent_result: Dict[str, Any],
    deception_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Combine intent classification with deception analysis using 2D decision matrix.
    
    Scientific Basis:
    - Intent captures WHAT they claim (business legitimacy)
    - Deception captures IF they're honest (communication authenticity)  
    - Together = (legitimacy × honesty) = actual risk level
    
    Decision Matrix:
    - PROCEED + TRUTHFUL → APPROVE (Low risk)
    - PROCEED + DECEPTIVE → REJECT (High risk - lying about intent)
    - VERIFY + TRUTHFUL → VERIFY (Medium risk - honest uncertainty)
    - VERIFY + DECEPTIVE → REJECT (High risk - deception + uncertainty)
    - REJECT (any) → REJECT (No need to evaluate further)
    
    Args:
        intent_result: Dict with keys: predicted_intent, confidence, all_scores
        deception_result: Dict with keys: label, confidence, scores
        
    Returns:
        Combined decision dict with final recommendation and reasoning
    """
    intent_label = intent_result.get("predicted_intent", "UNKNOWN")
    intent_confidence = intent_result.get("confidence", 0.0)
    
    deception_label = deception_result.get("label", "unknown").lower()
    deception_confidence = deception_result.get("confidence", 0.5)
    
    # Calculate trust score: intent_confidence × (1 - deception_confidence)
    trust_score = intent_confidence * (1.0 - deception_confidence)
    
    # Combined confidence: minimum of both
    combined_confidence = min(intent_confidence, deception_confidence)
    
    # Decision rules based on intent × truthfulness matrix
    if intent_label == "REJECT":
        # REJECT overrides all other considerations
        final_decision = "REJECT"
        reasoning = "Cultivator explicitly rejected or indicated unwillingness to proceed"
        recommendation = "reject"
    
    elif intent_label == "PROCEED":
        if deception_label == "truthful":
            # PROCEED + TRUTHFUL = APPROVE
            if intent_confidence >= 0.75 and deception_confidence <= 0.40:
                final_decision = "APPROVE"
                reasoning = "Clear genuine intent with honest communication patterns. Ready to proceed with agreement."
                recommendation = "auto_approve"
            else:
                final_decision = "VERIFY"
                reasoning = "Positive intent with truthful signals but low confidence margins. Manual review recommended."
                recommendation = "manual_verify"
        else:  # deceptive
            # PROCEED + DECEPTIVE = REJECT
            final_decision = "REJECT"
            reasoning = f"HIGH-RISK: Cultivator claims readiness (PROCEED intent: {intent_confidence:.1%}) but shows deceptive speech patterns ({deception_confidence:.1%} confidence). Likely hiding concerns or misrepresenting intent."
            recommendation = "reject"
    
    elif intent_label == "VERIFY":
        if deception_label == "truthful":
            # VERIFY + TRUTHFUL = VERIFY (honest uncertainty)
            final_decision = "VERIFY"
            reasoning = "Genuine uncertainty detected but speech patterns truthful. Recommend follow-up call for clarification."
            recommendation = "manual_verify"
        else:  # deceptive
            # VERIFY + DECEPTIVE = REJECT (ambiguous + deceptive = red flag)
            final_decision = "REJECT"
            reasoning = f"MEDIUM-HIGH RISK: Cultivator shows uncertain intent ({intent_confidence:.1%} confidence on VERIFY) combined with deceptive speech patterns ({deception_confidence:.1%} confidence). Recommend rejection."
            recommendation = "reject"
    
    else:
        # Unknown intent
        final_decision = "VERIFY"
        reasoning = "Unable to classify intent clearly. Manual review required."
        recommendation = "manual_verify"
    
    # Determine risk level based on trust score
    if trust_score >= 0.70:
        risk_level = "LOW"
    elif trust_score >= 0.50:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"
    
    return {
        "finalDecision": final_decision,
        "recommendation": recommendation,
        "reasoning": reasoning,
        "riskLevel": risk_level,
        "trustScore": round(trust_score, 3),
        "combinedConfidence": round(combined_confidence, 3),
        "intentAnalysis": {
            "label": intent_label,
            "confidence": round(intent_confidence, 3),
            "scores": intent_result.get("all_scores", []),
        },
        "truthfulnessAnalysis": {
            "label": deception_label,
            "confidence": round(deception_confidence, 3),
            "scores": deception_result.get("scores", {}),
            "signals": deception_result.get("signals", []),
        },
    }
