"""
Gate 2 Unified Video Intention Analyzer

Single method that analyzes video to detect:
1. Emotion (facial expressions)
2. Deception (visual cues)
3. Combined intention assessment

Usage:
    analyzer = Gate2UnifiedAnalyzer()
    result = analyzer.analyze_video("path/to/video.mp4")
    print(result.intention_score, result.recommendation)
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from cultivator.services.gate2_inference import Gate2InferenceService, get_gate2_inference_service
from cultivator.services.gate2_inference import Gate2DeceptionService, get_gate2_deception_service


@dataclass
class Gate2UnifiedResult:
    """Combined result of emotion + deception analysis."""
    
    # Emotion analysis
    dominant_emotion: str
    emotion_confidence: float
    emotion_distribution: Dict[str, float]
    emotional_stability: float
    
    # Deception analysis
    deception_label: str  # 'truthful' or 'deceptive'
    deception_confidence: float
    deception_signals: List[str]
    
    # Combined assessment
    intention_score: float  # 0.0 (high risk) to 1.0 (safe)
    recommendation: str  # APPROVE / VERIFY / REJECT
    combined_signals: List[str]
    risk_level: str  # LOW / MEDIUM / HIGH
    
    # Metadata
    frames_analyzed: int
    face_detection_rate: float
    model_version: str = "gate2-unified-v1"
    
    def to_dict(self) -> dict:
        return {
            # Emotion
            'dominant_emotion': self.dominant_emotion,
            'emotion_confidence': self.emotion_confidence,
            'emotion_distribution': self.emotion_distribution,
            'emotional_stability': self.emotional_stability,
            
            # Deception
            'deception_label': self.deception_label,
            'deception_confidence': self.deception_confidence,
            'deception_signals': self.deception_signals,
            
            # Combined
            'intention_score': self.intention_score,
            'recommendation': self.recommendation,
            'combined_signals': self.combined_signals,
            'risk_level': self.risk_level,
            
            # Metadata
            'frames_analyzed': self.frames_analyzed,
            'face_detection_rate': self.face_detection_rate,
            'model_version': self.model_version,
        }


class Gate2UnifiedAnalyzer:
    """
    Unified video analyzer combining emotion + deception detection.
    
    Single method analyzes video and returns comprehensive intention assessment.
    """
    
    def __init__(self):
        self.emotion_service = get_gate2_inference_service()
        self.deception_service = get_gate2_deception_service()
        
        # Risk weights
        self.EMOTION_WEIGHT = 0.5
        self.DECEPTION_WEIGHT = 0.5
        
        # Stable vs unstable emotions
        self.STABLE_EMOTIONS = {'neutral', 'happy', 'calm', 'content'}
        self.UNSTABLE_EMOTIONS = {'fear', 'anger', 'disgust', 'anxious', 'afraid'}
        
    def analyze_video(self, video_path: str) -> Gate2UnifiedResult:
        """
        🎯 UNIFIED METHOD: Analyze video for emotion + deception.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Gate2UnifiedResult with combined intention assessment
            
        Example:
            >>> analyzer = Gate2UnifiedAnalyzer()
            >>> result = analyzer.analyze_video("interview.mp4")
            >>> print(f"Intention Score: {result.intention_score:.2f}")
            >>> print(f"Recommendation: {result.recommendation}")
            >>> print(f"Risk Level: {result.risk_level}")
        """
        # Step 1: Emotion analysis
        emotion_result = self.emotion_service.predict(video_path)
        
        # Step 2: Deception analysis
        deception_result = self.deception_service.predict(video_path)
        
        # Step 3: Calculate emotional stability
        emotional_stability = self._calculate_emotional_stability(
            emotion_result.emotion_distribution,
            emotion_result.stats.get('consistency', 0.5)
        )
        
        # Step 4: Combine emotion + deception into intention score
        intention_score = self._calculate_intention_score(
            emotion_result=emotion_result,
            deception_result=deception_result,
            emotional_stability=emotional_stability
        )
        
        # Step 5: Generate recommendation (APPROVE/VERIFY/REJECT)
        recommendation, risk_level, combined_signals = self._generate_recommendation(
            emotion_result=emotion_result,
            deception_result=deception_result,
            intention_score=intention_score,
            emotional_stability=emotional_stability
        )
        
        # Step 6: Build unified result
        return Gate2UnifiedResult(
            # Emotion fields
            dominant_emotion=emotion_result.dominant_emotion,
            emotion_confidence=emotion_result.confidence,
            emotion_distribution=emotion_result.emotion_distribution,
            emotional_stability=emotional_stability,
            
            # Deception fields
            deception_label=deception_result.deception_label,
            deception_confidence=deception_result.deception_confidence,
            deception_signals=deception_result.signals,
            
            # Combined fields
            intention_score=intention_score,
            recommendation=recommendation,
            combined_signals=combined_signals,
            risk_level=risk_level,
            
            # Metadata
            frames_analyzed=emotion_result.stats.get('total_frames', 0),
            face_detection_rate=emotion_result.stats.get('face_detection_rate', 0.0),
        )
    
    def _calculate_emotional_stability(
        self, 
        emotion_distribution: Dict[str, float],
        consistency: float
    ) -> float:
        """
        Calculate emotional stability score (0.0 = unstable, 1.0 = stable).
        
        Factors:
        - Proportion of stable emotions (neutral, happy)
        - Low variance in emotion distribution
        - Temporal consistency
        """
        stable_ratio = sum(
            emotion_distribution.get(emotion, 0.0)
            for emotion in self.STABLE_EMOTIONS
        )
        
        unstable_ratio = sum(
            emotion_distribution.get(emotion, 0.0)
            for emotion in self.UNSTABLE_EMOTIONS
        )
        
        # Stability = stable_emotions - unstable_emotions + consistency
        stability = (stable_ratio - unstable_ratio + consistency) / 2.0
        
        return max(0.0, min(1.0, stability))
    
    def _calculate_intention_score(
        self,
        emotion_result,
        deception_result,
        emotional_stability: float
    ) -> float:
        """
        Calculate unified intention score (0.0 = high risk, 1.0 = safe).
        
        Formula:
            intention_score = (emotion_score * w1) + (deception_score * w2)
            
        Emotion score:
            - Happy/Neutral/Calm → High score (0.8-1.0)
            - Fear/Anger/Disgust → Low score (0.0-0.4)
            - Factor in stability
            
        Deception score:
            - Truthful → 1.0
            - Deceptive → 0.0 to 0.3 (based on confidence)
        """
        # 1. Emotion score (0-1)
        emotion_score = self._emotion_to_score(
            emotion_result.dominant_emotion,
            emotion_result.emotion_distribution,
            emotional_stability
        )
        
        # 2. Deception score (0-1)
        if deception_result.deception_label.lower() == 'truthful':
            deception_score = deception_result.deception_confidence
        else:
            # Deceptive: invert confidence (high deception confidence = low score)
            deception_score = 1.0 - deception_result.deception_confidence
        
        # 3. Weighted combination
        intention_score = (
            emotion_score * self.EMOTION_WEIGHT +
            deception_score * self.DECEPTION_WEIGHT
        )
        
        return max(0.0, min(1.0, intention_score))
    
    def _emotion_to_score(
        self,
        dominant_emotion: str,
        emotion_distribution: Dict[str, float],
        stability: float
    ) -> float:
        """Map emotion to safety score."""
        emotion_lower = dominant_emotion.lower()
        
        # High-risk emotions
        if any(risk in emotion_lower for risk in ['fear', 'afraid', 'anxious']):
            base_score = 0.2
        elif any(risk in emotion_lower for risk in ['anger', 'angry', 'disgust']):
            base_score = 0.3
        elif 'sad' in emotion_lower:
            base_score = 0.5
        # Safe emotions
        elif any(safe in emotion_lower for safe in ['neutral', 'calm']):
            base_score = 0.9
        elif 'happy' in emotion_lower:
            base_score = 0.95
        else:
            base_score = 0.6  # Neutral/unknown
        
        # Adjust by stability
        adjusted_score = base_score * (0.7 + 0.3 * stability)
        
        return adjusted_score
    
    def _generate_recommendation(
        self,
        emotion_result,
        deception_result,
        intention_score: float,
        emotional_stability: float
    ) -> tuple[str, str, List[str]]:
        """
        Generate admin recommendation (APPROVE/VERIFY/REJECT) and signals.
        
        Decision Matrix:
        ┌─────────────────┬──────────────┬──────────────┐
        │ Intention Score │ Deception    │ Recommendation│
        ├─────────────────┼──────────────┼──────────────┤
        │ 0.75-1.0        │ Truthful     │ APPROVE      │
        │ 0.75-1.0        │ Deceptive    │ VERIFY       │
        │ 0.50-0.75       │ Truthful     │ VERIFY       │
        │ 0.50-0.75       │ Deceptive    │ REJECT       │
        │ 0.0-0.50        │ Any          │ REJECT       │
        └─────────────────┴──────────────┴──────────────┘
        """
        signals = []
        is_deceptive = deception_result.deception_label.lower() == 'deceptive'
        deception_high_confidence = deception_result.deception_confidence >= 0.65
        
        # Extract emotion info
        dominant_emotion = emotion_result.dominant_emotion
        emotion_lower = dominant_emotion.lower()
        
        # Determine risk level
        if intention_score >= 0.75:
            risk_level = "LOW"
        elif intention_score >= 0.50:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"
        
        # Decision logic
        if intention_score >= 0.75:
            if is_deceptive and deception_high_confidence:
                recommendation = "VERIFY"
                signals.append(f"⚠️ High intention score ({intention_score:.2f}) but deception detected")
                signals.append(f"Deception confidence: {deception_result.deception_confidence:.1%}")
                signals.append("Manual review recommended to resolve inconsistency")
            else:
                recommendation = "APPROVE"
                signals.append(f"✅ High intention score: {intention_score:.2f}")
                signals.append(f"Emotional state: {dominant_emotion} (stability: {emotional_stability:.1%})")
                if not is_deceptive:
                    signals.append(f"Truthful indicators detected ({deception_result.deception_confidence:.1%})")
                    
        elif intention_score >= 0.50:
            if is_deceptive:
                recommendation = "REJECT"
                signals.append(f"❌ Moderate intention score with deception detected")
                signals.append(f"Intention: {intention_score:.2f}, Deception: {deception_result.deception_confidence:.1%}")
                signals.append(f"Emotional concerns: {dominant_emotion}")
            else:
                recommendation = "VERIFY"
                signals.append(f"⚠️ Moderate intention score: {intention_score:.2f}")
                signals.append(f"Emotional state: {dominant_emotion}")
                signals.append("Additional verification recommended")
                
        else:  # intention_score < 0.50
            recommendation = "REJECT"
            signals.append(f"❌ Low intention score: {intention_score:.2f}")
            signals.append(f"Emotional concerns: {dominant_emotion}")
            if is_deceptive:
                signals.append(f"Deception detected ({deception_result.deception_confidence:.1%})")
            signals.append("High risk indicators present")
        
        # Add specific emotion/deception signals
        if any(risk in emotion_lower for risk in ['fear', 'anxious', 'afraid']):
            signals.append(f"⚠️ Fear/anxiety indicators detected")
        if any(risk in emotion_lower for risk in ['anger', 'disgust']):
            signals.append(f"⚠️ Negative emotional state detected")
        
        if emotional_stability < 0.40:
            signals.append(f"⚠️ Low emotional stability ({emotional_stability:.1%})")
        
        # Add deception-specific signals
        if deception_result.signals:
            signals.extend([f"🔍 {s}" for s in deception_result.signals[:2]])  # Top 2
        
        return recommendation, risk_level, signals


# Singleton accessor
_unified_analyzer_instance: Optional[Gate2UnifiedAnalyzer] = None

def get_gate2_unified_analyzer() -> Gate2UnifiedAnalyzer:
    """Get singleton instance of unified analyzer."""
    global _unified_analyzer_instance
    if _unified_analyzer_instance is None:
        _unified_analyzer_instance = Gate2UnifiedAnalyzer()
    return _unified_analyzer_instance
