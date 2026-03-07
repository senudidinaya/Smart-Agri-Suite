"""
Cultivator Intention Decision Engine.

Combines outputs from all 4 gates (Intent, Deception Audio, Emotion, Deception Video)
to provide justifiable recommendations for cultivator land use intent analysis.

Decision Framework:
- Gate-1: PROCEED / VERIFY / REJECT (based on Intent + Audio Deception)
- Gate-2: APPROVE / VERIFY / REJECT (based on Emotion + Video Deception)
"""

from typing import Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from app.core.logging import get_logger

logger = get_logger(__name__)


# =============================================================================
# DECISION ENUMS
# =============================================================================

class Gate1Decision(str, Enum):
    """Gate-1 decision outcomes based on intent + audio deception analysis."""
    PROCEED = "PROCEED"   # High intent, truthful, legitimate keywords
    VERIFY = "VERIFY"     # Medium intent OR mixed deception signals
    REJECT = "REJECT"     # Low/No intent OR high deception OR suspicious


class Gate2Decision(str, Enum):
    """Gate-2 decision outcomes based on emotion + video deception analysis."""
    APPROVE = "APPROVE"   # Truthful video, calm emotions, consistent behavior
    VERIFY = "VERIFY"     # Mixed signals OR some stress indicators
    REJECT = "REJECT"     # Deceptive video OR high stress emotions


# =============================================================================
# DECISION DATA CLASSES
# =============================================================================

@dataclass
class Gate1DecisionInfo:
    """Gate-1 decision information with justification."""
    decision: Gate1Decision
    confidence: float  # 0.0-1.0
    reasoning: str
    intent_label: str
    intent_confidence: float
    deception_label: str
    deception_confidence: float
    risk_factors: list  # List of detected risk factors
    positive_factors: list  # List of positive indicators


@dataclass
class Gate2DecisionInfo:
    """Gate-2 decision information with justification."""
    decision: Gate2Decision
    confidence: float  # 0.0-1.0
    reasoning: str
    emotion_label: str
    emotion_confidence: float
    deception_label: str
    deception_confidence: float
    risk_factors: list  # List of detected risk factors
    positive_factors: list  # List of positive indicators


# =============================================================================
# CULTIVATOR INTENTION DECISION ENGINE
# =============================================================================

class CultivatorIntentionDecisionEngine:
    """
    Justifiable decision engine for cultivator land use intent analysis.
    
    Combines all 4 model outputs to make recommendations that are:
    1. Explainable - each decision includes clear reasoning
    2. Defensible - based on research-backed behavioral indicators
    3. Actionable - provides clear next steps (proceed/verify/reject)
    """

    # Thresholds for decision making
    HIGH_INTENT_THRESHOLD = 0.70
    MEDIUM_INTENT_THRESHOLD = 0.40
    
    TRUTHFUL_CONFIDENCE_THRESHOLD = 0.60
    DECEPTIVE_CONFIDENCE_THRESHOLD = 0.60
    
    CALM_EMOTION_THRESHOLD = 0.60  # Neutral + Happy + Surprise
    STRESS_EMOTION_THRESHOLD = 0.50  # Fear + Anger + Disgust

    # Legitimate cultivation keywords (indicate real intent)
    CULTIVATION_KEYWORDS = {
        'farm', 'cultivate', 'crop', 'soil', 'land',
        'agriculture', 'plant', 'harvest', 'irrigation',
        'fertilizer', 'organic', 'yield', 'rent',
        'lease', 'contract', 'growing season'
    }

    # Suspicious fraud keywords
    FRAUD_KEYWORDS = {
        'emergency', 'urgent', 'quick', 'fast money',
        'otp', 'pin', 'password', 'account',
        'loan shark', 'interest', 'hidden',
    }

    def __init__(self):
        """Initialize the decision engine."""
        logger.info("Cultivator Intention Decision Engine initialized")

    # =========================================================================
    # GATE 1: INTENT + AUDIO DECEPTION ANALYSIS
    # =========================================================================

    def decide_gate1(
        self,
        intent_label: str,
        intent_confidence: float,
        deception_label: str,
        deception_confidence: float,
        transcript: str = "",
        text_features: Optional[Dict] = None,
    ) -> Gate1DecisionInfo:
        """
        Make Gate-1 decision (PROCEED/VERIFY/REJECT).
        
        Combines intent classification with audio deception signals.
        
        Args:
            intent_label: Predicted intent ('HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT', 'NO_INTENT')
            intent_confidence: Confidence score for intent (0-1)
            deception_label: Audio deception prediction ('truthful' or 'deceptive')
            deception_confidence: Confidence in deception prediction (0-1)
            transcript: Full transcript of speech
            text_features: Dictionary of text-based features
            
        Returns:
            Gate1DecisionInfo with decision, confidence, and reasoning
        """
        risk_factors = []
        positive_factors = []
        
        # ===== ANALYZE INTENT =====
        intent_score = intent_confidence
        is_high_intent = intent_label in ['HIGH_INTENT'] and intent_confidence >= self.HIGH_INTENT_THRESHOLD
        is_medium_intent = intent_label in ['MEDIUM_INTENT', 'HIGH_INTENT'] and self.MEDIUM_INTENT_THRESHOLD <= intent_confidence < self.HIGH_INTENT_THRESHOLD
        is_low_intent = intent_label in ['LOW_INTENT', 'NO_INTENT'] or intent_confidence < self.MEDIUM_INTENT_THRESHOLD
        
        if is_high_intent:
            positive_factors.append(f"✓ High cultivation intent ({intent_confidence:.0%})")
        elif is_low_intent:
            risk_factors.append(f"✗ Low/No cultivation intent ({intent_confidence:.0%})")
        else:
            risk_factors.append(f"⚠ Medium cultivation intent ({intent_confidence:.0%})")
        
        # ===== ANALYZE AUDIO DECEPTION =====
        is_truthful = deception_label.lower() == 'truthful' and deception_confidence >= self.TRUTHFUL_CONFIDENCE_THRESHOLD
        is_deceptive = deception_label.lower() == 'deceptive' and deception_confidence >= self.DECEPTIVE_CONFIDENCE_THRESHOLD
        is_mixed_deception = (not is_truthful) and (not is_deceptive)
        
        if is_truthful:
            positive_factors.append(f"✓ Truthful audio signals ({deception_confidence:.0%})")
        elif is_deceptive:
            risk_factors.append(f"✗ Deceptive audio indicators ({deception_confidence:.0%})")
        else:
            risk_factors.append(f"⚠ Mixed/ambiguous audio signals ({deception_confidence:.0%})")
        
        # ===== ANALYZE KEYWORDS =====
        transcript_lower = transcript.lower() if transcript else ""
        
        cultivation_count = sum(1 for kw in self.CULTIVATION_KEYWORDS if kw in transcript_lower)
        fraud_count = sum(1 for kw in self.FRAUD_KEYWORDS if kw in transcript_lower)
        
        if cultivation_count > 0:
            positive_factors.append(f"✓ Legitimate cultivation keywords detected ({cultivation_count})")
        
        if fraud_count > 0:
            risk_factors.append(f"✗ Suspicious/fraud keywords detected ({fraud_count})")
        
        # ===== MAKE DECISION =====
        # Priority: Deception > Intent Level > Keywords
        
        if is_deceptive or fraud_count > 1:
            # Clear deception or multiple fraud indicators
            decision = Gate1Decision.REJECT
            reasoning = "Deceptive audio signals or suspicious behavior detected. Cannot proceed with land use approval."
            confidence = min(1.0, deception_confidence + (0.1 * fraud_count))
            
        elif is_high_intent and is_truthful and cultivation_count > 0:
            # Strong legitimate intent with truthful signals and relevant keywords
            decision = Gate1Decision.PROCEED
            reasoning = "Strong cultivation intent with truthful audio. Legitimate farming keywords detected. Ready to proceed."
            confidence = min(1.0, (intent_confidence + deception_confidence) / 2)
            
        elif is_medium_intent and is_truthful:
            # Medium intent but truthful signals - needs verification
            decision = Gate1Decision.VERIFY
            reasoning = "Moderate cultivation intent with truthful audio. Additional verification recommended to assess true commitment."
            confidence = min(1.0, (intent_confidence + deception_confidence) / 2)
            
        elif is_mixed_deception:
            # Ambiguous deception signals - verify
            decision = Gate1Decision.VERIFY
            reasoning = "Intent is present but audio deception signals are ambiguous. Manual verification recommended."
            confidence = (intent_confidence + deception_confidence) / 2 * 0.8  # Reduce confidence for mixed signals
            
        else:
            # Low intent regardless of deception
            decision = Gate1Decision.REJECT
            reasoning = "Insufficient cultivation intent. Cannot justify land use approval."
            confidence = 1.0 - intent_confidence
        
        return Gate1DecisionInfo(
            decision=decision,
            confidence=confidence,
            reasoning=reasoning,
            intent_label=intent_label,
            intent_confidence=intent_confidence,
            deception_label=deception_label,
            deception_confidence=deception_confidence,
            risk_factors=risk_factors,
            positive_factors=positive_factors,
        )

    # =========================================================================
    # GATE 2: EMOTION + VIDEO DECEPTION ANALYSIS
    # =========================================================================

    def decide_gate2(
        self,
        emotion_label: str,
        emotion_confidence: float,
        deception_label: str,
        deception_confidence: float,
    ) -> Gate2DecisionInfo:
        """
        Make Gate-2 decision (APPROVE/VERIFY/REJECT).
        
        Combines emotion recognition with video deception signals.
        
        Args:
            emotion_label: Detected emotion ('happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral')
            emotion_confidence: Confidence in emotion prediction (0-1)
            deception_label: Video deception prediction ('truthful' or 'deceptive')
            deception_confidence: Confidence in deception prediction (0-1)
            
        Returns:
            Gate2DecisionInfo with decision, confidence, and reasoning
        """
        risk_factors = []
        positive_factors = []
        
        # ===== ANALYZE VIDEO DECEPTION =====
        is_truthful = deception_label.lower() == 'truthful' and deception_confidence >= self.TRUTHFUL_CONFIDENCE_THRESHOLD
        is_deceptive = deception_label.lower() == 'deceptive' and deception_confidence >= self.DECEPTIVE_CONFIDENCE_THRESHOLD
        is_mixed_deception = (not is_truthful) and (not is_deceptive)
        
        if is_truthful:
            positive_factors.append(f"✓ Truthful behavioral signals ({deception_confidence:.0%})")
        elif is_deceptive:
            risk_factors.append(f"✗ Deceptive behavioral indicators ({deception_confidence:.0%})")
        else:
            risk_factors.append(f"⚠ Mixed/ambiguous behavioral signals ({deception_confidence:.0%})")
        
        # ===== ANALYZE EMOTIONS =====
        emotion_lower = emotion_label.lower()
        
        # Categorize emotions
        calm_emotions = ['neutral', 'happy', 'surprise']  # Positive or neutral
        stress_emotions = ['fear', 'anger', 'disgust', 'sad']  # Negative/stress
        
        is_calm = emotion_lower in calm_emotions
        is_stressed = emotion_lower in stress_emotions
        
        if is_calm:
            positive_factors.append(f"✓ Calm/composed demeanor ({emotion_label} - {emotion_confidence:.0%})")
        elif is_stressed:
            risk_factors.append(f"✗ Stress/anxiety indicators ({emotion_label} - {emotion_confidence:.0%})")
        
        # ===== MAKE DECISION =====
        # Priority: Deception > Emotion > Consistency
        
        if is_deceptive or (is_stressed and emotion_confidence > self.STRESS_EMOTION_THRESHOLD):
            # Clear deceptive signals OR high stress with negative emotion
            decision = Gate2Decision.REJECT
            reasoning = "Deceptive behavioral signals or significant stress indicators detected. Cannot approve land use agreement."
            confidence = min(1.0, max(deception_confidence, emotion_confidence))
            
        elif is_truthful and is_calm and emotion_confidence >= self.CALM_EMOTION_THRESHOLD:
            # Strong truthful signals with calm demeanor
            decision = Gate2Decision.APPROVE
            reasoning = "Truthful behavioral signals with calm, composed demeanor. Indicates genuine commitment to land use agreement."
            confidence = min(1.0, (deception_confidence + emotion_confidence) / 2)
            
        elif is_truthful and is_calm:
            # Truthful but less confident in emotion
            decision = Gate2Decision.APPROVE
            reasoning = "Truthful behavioral signals and stable demeanor observed. Approval recommended."
            confidence = min(1.0, (deception_confidence + emotion_confidence) / 2 * 0.95)
            
        elif is_mixed_deception or (is_calm and emotion_confidence < 0.7):
            # Ambiguous deception or calm but low confidence
            decision = Gate2Decision.VERIFY
            reasoning = "Behavioral signals are mixed or emotion confidence is low. Manual review recommended before approval."
            confidence = min(1.0, deception_confidence * 0.7 + emotion_confidence * 0.3)
            
        elif is_stressed and emotion_confidence < self.STRESS_EMOTION_THRESHOLD:
            # Stressed but not confident
            decision = Gate2Decision.VERIFY
            reasoning = "Some stress indicators present but confidence is moderate. Additional assessment needed."
            confidence = min(1.0, emotion_confidence)
            
        else:
            # Default to verify
            decision = Gate2Decision.VERIFY
            reasoning = "Mixed or unclear behavioral signals. Recommend additional assessment."
            confidence = 0.5
        
        return Gate2DecisionInfo(
            decision=decision,
            confidence=confidence,
            reasoning=reasoning,
            emotion_label=emotion_label,
            emotion_confidence=emotion_confidence,
            deception_label=deception_label,
            deception_confidence=deception_confidence,
            risk_factors=risk_factors,
            positive_factors=positive_factors,
        )

    # =========================================================================
    # COMBINED ANALYSIS (Both Gates)
    # =========================================================================

    def combine_decisions(
        self,
        gate1_decision: Gate1DecisionInfo,
        gate2_decision: Gate2DecisionInfo,
    ) -> Dict:
        """
        Combine Gate-1 and Gate-2 decisions for final recommendation.
        
        Args:
            gate1_decision: Gate-1 decision info (intent + audio deception)
            gate2_decision: Gate-2 decision info (emotion + video deception)
            
        Returns:
            Dictionary with combined analysis and final recommendation
        """
        # Count positive and risk factors
        total_positive = len(gate1_decision.positive_factors) + len(gate2_decision.positive_factors)
        total_risk = len(gate1_decision.risk_factors) + len(gate2_decision.risk_factors)
        
        # Determine overall confidence
        combined_confidence = (gate1_decision.confidence + gate2_decision.confidence) / 2
        
        # Determine priority decision
        # REJECT takes precedence over VERIFY, which takes precedence over PROCEED/APPROVE
        if Gate1Decision.REJECT in [gate1_decision.decision] or Gate2Decision.REJECT in [gate2_decision.decision]:
            overall_recommendation = "REJECT"
            overall_reason = "At least one gate shows clear rejection signals."
        elif Gate1Decision.VERIFY in [gate1_decision.decision] or Gate2Decision.VERIFY in [gate2_decision.decision]:
            overall_recommendation = "VERIFY"
            overall_reason = "At least one gate requires additional verification."
        else:
            overall_recommendation = "PROCEED"
            overall_reason = "Both gates indicate positive signals for proceeding."
        
        return {
            "overall_recommendation": overall_recommendation,
            "overall_reason": overall_reason,
            "combined_confidence": combined_confidence,
            "gate1": {
                "decision": gate1_decision.decision.value,
                "confidence": gate1_decision.confidence,
                "reasoning": gate1_decision.reasoning,
                "positive_factors": gate1_decision.positive_factors,
                "risk_factors": gate1_decision.risk_factors,
            },
            "gate2": {
                "decision": gate2_decision.decision.value,
                "confidence": gate2_decision.confidence,
                "reasoning": gate2_decision.reasoning,
                "positive_factors": gate2_decision.positive_factors,
                "risk_factors": gate2_decision.risk_factors,
            },
            "summary": {
                "total_positive_indicators": total_positive,
                "total_risk_indicators": total_risk,
                "risk_level": "HIGH" if total_risk > total_positive else ("MEDIUM" if total_risk == total_positive else "LOW"),
            }
        }


# Global engine instance
_decision_engine: Optional[CultivatorIntentionDecisionEngine] = None


def get_decision_engine() -> CultivatorIntentionDecisionEngine:
    """Get or create the global decision engine instance."""
    global _decision_engine
    if _decision_engine is None:
        _decision_engine = CultivatorIntentionDecisionEngine()
    return _decision_engine
