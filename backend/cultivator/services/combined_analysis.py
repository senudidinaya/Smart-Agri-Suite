# ============================================================================
# COMBINED DECISION MATRIX: Commitment × Truthfulness
# Cultivator Safety Screening for Private Land Work
# ============================================================================

from typing import Dict, Any

def combine_intent_and_deception(
    intent_result: Dict[str, Any],
    deception_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Combine commitment analysis with deception detection for cultivator safety screening.
    
    Scientific Basis:
    - Commitment Level captures WHAT they claim (willingness to work, reliability)
    - Truthfulness captures IF they're honest (communication authenticity)  
    - Together = (commitment × honesty) = actual safety/trustworthiness
    
    Decision Matrix:
    - PROCEED + TRUTHFUL → APPROVE (Trustworthy, strong commitment)
    - PROCEED + DECEPTIVE → REJECT (Claims commitment but shows deception - safety risk)
    - VERIFY + TRUTHFUL → VERIFY (Moderate commitment, needs verification)
    - VERIFY + DECEPTIVE → REJECT (Uncertain + deceptive - safety risk)
    - REJECT (any) → REJECT (Low commitment or unwilling)
    
    Args:
        intent_result: Dict with keys: predicted_intent (PROCEED/VERIFY/REJECT), confidence, all_scores
        deception_result: Dict with keys: label (truthful/deceptive), confidence, scores
        
    Returns:
        Combined decision dict with final safety recommendation and reasoning
    """
    intent_label = intent_result.get("predicted_intent", "UNKNOWN")
    intent_confidence = intent_result.get("confidence", 0.0)
    
    deception_label = deception_result.get("label", "unknown").lower()
    deception_confidence = deception_result.get("confidence", 0.5)
    
    # Calculate trust score: commitment_confidence × (1 - deception_confidence)
    # Higher score = more trustworthy (strong commitment + low deception)
    trust_score = intent_confidence * (1.0 - deception_confidence)
    
    # Combined confidence: minimum of both
    combined_confidence = min(intent_confidence, deception_confidence)
    
    # Decision rules based on intent × truthfulness matrix
    if intent_label == "REJECT":
        # REJECT overrides all other considerations
        final_decision = "REJECT"
        reasoning = "Cultivator shows low commitment or unwillingness to work. Not recommended for private land employment."
        recommendation = "reject"
    
    elif intent_label == "PROCEED":
        if deception_label == "truthful":
            # PROCEED + TRUTHFUL = APPROVE
            if intent_confidence >= 0.75 and deception_confidence <= 0.40:
                final_decision = "APPROVE"
                reasoning = "Cultivator shows strong commitment with honest communication. Trustworthy candidate for private land work."
                recommendation = "auto_approve"
            else:
                final_decision = "VERIFY"
                reasoning = "Cultivator shows commitment with truthful signals but confidence margins require manual verification."
                recommendation = "manual_verify"
        else:  # deceptive
            # PROCEED + DECEPTIVE = REJECT
            final_decision = "REJECT"
            reasoning = f"HIGH-RISK: Cultivator claims commitment ({intent_confidence:.1%}) but shows deceptive speech patterns ({deception_confidence:.1%} confidence). Safety concern - likely misrepresenting intentions or hiding information."
            recommendation = "reject"
    
    elif intent_label == "VERIFY":
        if deception_label == "truthful":
            # VERIFY + TRUTHFUL = VERIFY (honest uncertainty)
            final_decision = "VERIFY"
            reasoning = "Cultivator shows moderate commitment with truthful communication. Recommend follow-up interview for safety confirmation."
            recommendation = "manual_verify"
        else:  # deceptive
            # VERIFY + DECEPTIVE = REJECT (ambiguous + deceptive = red flag)
            final_decision = "REJECT"
            reasoning = f"MEDIUM-HIGH RISK: Cultivator shows uncertain commitment ({intent_confidence:.1%}) combined with deceptive speech patterns ({deception_confidence:.1%}). Safety concern - not recommended for private land work."
            recommendation = "reject"
    
    else:
        # Unknown intent
        final_decision = "VERIFY"
        reasoning = "Unable to assess cultivator's commitment and safety indicators clearly. Manual interview required."
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
