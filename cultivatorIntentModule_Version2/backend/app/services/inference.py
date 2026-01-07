"""
Inference service for buyer intent risk prediction.

Smart Agri-Suite - Cultivator Intent Module V2

This module provides intent risk classification using either:
1. A trained ML model (if available)
2. Rules-based fallback (when model not available)

The service automatically detects whether a trained model exists
and uses it for predictions, falling back to heuristic rules otherwise.
"""

import json
import random
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.prediction import IntentScore, PredictionResult

logger = get_logger(__name__)


# ============================================================================
# FEATURE DEFINITIONS (must match training script and dataset generator)
# ============================================================================

AUDIO_FEATURES = [
    "duration_seconds",
    "rms_mean",
    "rms_std",
    "f0_mean",
    "f0_std",
    "zcr_mean",
    "spectral_centroid_mean",
    "tempo_proxy",
]

TEXT_FEATURES = [
    "transcript_char_len",
    "transcript_word_count",
    "urgency_count",
    "money_count",
    "secrecy_count",
    "pressure_count",
    "id_avoidance_count",
    "otp_pin_count",
]

ALL_FEATURES = AUDIO_FEATURES + TEXT_FEATURES

# Intent labels for the buyer intent classification task
INTENT_LABELS: List[str] = ["PROCEED", "VERIFY", "REJECT"]


class IntentRiskClassifier:
    """
    Intent risk classifier with ML model and rules-based fallback.
    
    This classifier automatically loads a trained sklearn model if available,
    otherwise uses a rules-based approach for predictions.
    
    Attributes:
        model: Loaded sklearn model (None if not available).
        scaler: Feature scaler (None if not available).
        label_encoder: Label encoder for classes (None if not available).
        metadata: Model training metadata (None if not available).
        use_ml_model: Whether ML model is loaded and ready.
        model_version: Version string for predictions.
    """

    def __init__(self, models_dir: Optional[Path] = None) -> None:
        """
        Initialize the intent risk classifier.
        
        Args:
            models_dir: Path to models directory. Uses default if None.
        """
        settings = get_settings()
        self.models_dir = models_dir or Path(settings.model_path).parent
        
        # ML model components (loaded lazily)
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.metadata: Dict[str, Any] = {}
        
        # State
        self.use_ml_model = False
        self.model_version = "rules-1.0.0"
        self.is_loaded = False
        
        logger.info(
            "IntentRiskClassifier initialized",
            extra={"extra_data": {"models_dir": str(self.models_dir)}},
        )

    def load_model(self) -> bool:
        """
        Attempt to load the trained ML model.
        
        Falls back to rules-based mode if model files are not found.
        
        Returns:
            True if ML model loaded, False if using rules-based fallback.
        """
        try:
            model_path = self.models_dir / "intent_risk_model.pkl"
            scaler_path = self.models_dir / "intent_risk_scaler.pkl"
            encoder_path = self.models_dir / "intent_risk_label_encoder.pkl"
            metadata_path = self.models_dir / "model_metadata.json"
            
            # Check if model files exist
            if not model_path.exists():
                logger.warning(
                    f"ML model not found at {model_path}, using rules-based fallback"
                )
                self.use_ml_model = False
                self.model_version = "rules-1.0.0"
                self.is_loaded = True
                return False
            
            # Load model components
            import joblib
            
            logger.info(f"Loading ML model from {model_path}")
            self.model = joblib.load(model_path)
            
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
                logger.info("Feature scaler loaded")
            
            if encoder_path.exists():
                self.label_encoder = joblib.load(encoder_path)
                logger.info("Label encoder loaded")
            
            if metadata_path.exists():
                with open(metadata_path, "r") as f:
                    self.metadata = json.load(f)
                self.model_version = f"ml-{self.metadata.get('version', '1.0.0')}"
                logger.info(f"Model metadata loaded: v{self.metadata.get('version')}")
            
            self.use_ml_model = True
            self.is_loaded = True
            
            logger.info(
                "ML model loaded successfully",
                extra={
                    "extra_data": {
                        "model_type": self.metadata.get("model_type"),
                        "test_accuracy": self.metadata.get("test_accuracy"),
                        "trained_at": self.metadata.get("trained_at"),
                    }
                },
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}, using rules-based fallback")
            self.use_ml_model = False
            self.model_version = "rules-1.0.0"
            self.is_loaded = True
            return False

    def unload_model(self) -> None:
        """Unload the model and free resources."""
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.metadata = {}
        self.use_ml_model = False
        self.is_loaded = False
        logger.info("Model unloaded")

    def _extract_audio_features(self, audio_data: bytes) -> np.ndarray:
        """
        Extract audio features from raw bytes using librosa.
        
        Args:
            audio_data: Raw audio bytes (WAV format).
            
        Returns:
            Feature array matching the training format.
        """
        import io
        import warnings
        
        try:
            import librosa
            import soundfile as sf
        except ImportError:
            logger.warning("librosa/soundfile not installed, using placeholder features")
            return np.zeros((1, len(ALL_FEATURES)))
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            
            # Load audio from bytes
            audio_buffer = io.BytesIO(audio_data)
            try:
                y, sr = sf.read(audio_buffer)
                # Resample to 16kHz if needed
                if sr != 16000:
                    y = librosa.resample(y, orig_sr=sr, target_sr=16000)
                    sr = 16000
            except Exception:
                # Fallback to librosa
                audio_buffer.seek(0)
                y, sr = librosa.load(audio_buffer, sr=16000, mono=True)
            
            if len(y) == 0:
                return np.zeros((1, len(ALL_FEATURES)))
            
            # Convert to mono if stereo
            if len(y.shape) > 1:
                y = np.mean(y, axis=1)
            
            duration = len(y) / sr
            
            # RMS energy
            rms = librosa.feature.rms(y=y)[0]
            rms_mean = float(np.mean(rms)) if len(rms) > 0 else 0.0
            rms_std = float(np.std(rms)) if len(rms) > 0 else 0.0
            
            # Fundamental frequency (F0)
            try:
                f0, voiced_flag, _ = librosa.pyin(
                    y,
                    fmin=librosa.note_to_hz("C2"),
                    fmax=librosa.note_to_hz("C7"),
                    sr=sr,
                )
                f0_voiced = f0[~np.isnan(f0)] if f0 is not None else []
                f0_mean = float(np.mean(f0_voiced)) if len(f0_voiced) > 0 else 0.0
                f0_std = float(np.std(f0_voiced)) if len(f0_voiced) > 0 else 0.0
            except Exception:
                f0_mean = 0.0
                f0_std = 0.0
            
            # Zero crossing rate
            zcr = librosa.feature.zero_crossing_rate(y)[0]
            zcr_mean = float(np.mean(zcr)) if len(zcr) > 0 else 0.0
            
            # Spectral centroid
            spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spectral_centroid_mean = float(np.mean(spec_cent)) if len(spec_cent) > 0 else 0.0
            
            # Tempo proxy
            try:
                onset_env = librosa.onset.onset_strength(y=y, sr=sr)
                tempo = librosa.feature.tempo(onset_envelope=onset_env, sr=sr)[0]
                tempo_proxy = float(tempo) if tempo else 0.0
            except Exception:
                tempo_proxy = 0.0
            
            # Audio features
            audio_features = [
                duration,
                rms_mean,
                rms_std,
                f0_mean,
                f0_std,
                zcr_mean,
                spectral_centroid_mean,
                tempo_proxy,
            ]
            
            # Text features (default to 0 since we don't have transcript here)
            text_features = [0] * len(TEXT_FEATURES)
            
            features = audio_features + text_features
            return np.array(features).reshape(1, -1)

    def _extract_text_features(self, transcript: str) -> Dict[str, int]:
        """
        Extract text-based red flag features from a transcript.
        
        Args:
            transcript: The transcript text.
            
        Returns:
            Dictionary of text feature counts.
        """
        if not transcript:
            return {feat: 0 for feat in TEXT_FEATURES}
        
        text_lower = transcript.lower()
        
        # Red flag keyword lists
        urgency_kw = ["urgent", "immediately", "hurry", "right now", "today only", "limited time"]
        money_kw = ["send money", "transfer", "payment", "fee", "deposit", "prize", "won", "lottery"]
        secrecy_kw = ["don't tell", "secret", "keep this between", "confidential"]
        pressure_kw = ["you must", "have to", "no choice", "final warning", "legal action"]
        id_avoid_kw = ["i am", "this is", "calling from", "representative"]
        otp_pin_kw = ["otp", "pin", "password", "code", "verification"]
        
        def count_keywords(text: str, keywords: list) -> int:
            return sum(1 for kw in keywords if kw in text)
        
        return {
            "transcript_char_len": len(transcript),
            "transcript_word_count": len(transcript.split()),
            "urgency_count": count_keywords(text_lower, urgency_kw),
            "money_count": count_keywords(text_lower, money_kw),
            "secrecy_count": count_keywords(text_lower, secrecy_kw),
            "pressure_count": count_keywords(text_lower, pressure_kw),
            "id_avoidance_count": count_keywords(text_lower, id_avoid_kw),
            "otp_pin_count": count_keywords(text_lower, otp_pin_kw),
        }


    def extract_features(
        self,
        audio_data: Optional[bytes] = None,
        transcript: Optional[str] = None,
        audio_features: Optional[Dict[str, float]] = None,
        text_features: Optional[Dict[str, int]] = None,
    ) -> np.ndarray:
        """
        Extract or prepare features for prediction.
        
        Args:
            audio_data: Raw audio bytes (for librosa extraction).
            transcript: Transcript text (for text feature extraction).
            audio_features: Pre-extracted audio features dict.
            text_features: Pre-extracted text features dict.
            
        Returns:
            Feature array matching the training format.
        """
        # If features are pre-computed, use them
        if audio_features is not None and text_features is not None:
            features = []
            
            # Audio features
            for feat in AUDIO_FEATURES:
                features.append(audio_features.get(feat, 0.0))
            
            # Text features
            for feat in TEXT_FEATURES:
                features.append(text_features.get(feat, 0))
            
            return np.array(features).reshape(1, -1)
        
        # Extract features from raw audio and transcript
        if audio_data is not None:
            try:
                audio_feats = self._extract_audio_features(audio_data)
                
                # If transcript provided, add text features
                if transcript:
                    text_feats = self._extract_text_features(transcript)
                    # Replace text portion of features (last 8 values)
                    audio_array = audio_feats[0, :len(AUDIO_FEATURES)].tolist()
                    text_array = [text_feats.get(feat, 0) for feat in TEXT_FEATURES]
                    features = audio_array + text_array
                    return np.array(features).reshape(1, -1)
                
                return audio_feats
            except Exception as e:
                logger.warning(f"Audio feature extraction failed: {e}, using defaults")
        
        # If only transcript provided, extract text features with zero audio
        if transcript:
            text_feats = self._extract_text_features(transcript)
            audio_array = [0.0] * len(AUDIO_FEATURES)
            text_array = [text_feats.get(feat, 0) for feat in TEXT_FEATURES]
            return np.array(audio_array + text_array).reshape(1, -1)
        
        logger.warning("No features provided, using defaults")
        return np.zeros((1, len(ALL_FEATURES)))

    def predict_with_ml(
        self,
        features: np.ndarray,
    ) -> Tuple[str, float, List[Tuple[str, float]]]:
        """
        Make prediction using the ML model.
        
        Args:
            features: Feature array (1, n_features).
            
        Returns:
            Tuple of (predicted_label, confidence, all_scores).
        """
        # Scale features
        if self.scaler is not None:
            features_scaled = self.scaler.transform(features)
        else:
            features_scaled = features
        
        # Get prediction probabilities
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(features_scaled)[0]
        else:
            # For models without predict_proba, use hard prediction
            pred_idx = self.model.predict(features_scaled)[0]
            probs = np.zeros(len(INTENT_LABELS))
            probs[pred_idx] = 1.0
        
        # Get predicted class
        pred_idx = np.argmax(probs)
        
        # Decode label
        if self.label_encoder is not None:
            predicted_label = self.label_encoder.inverse_transform([pred_idx])[0]
            all_labels = self.label_encoder.inverse_transform(range(len(probs)))
        else:
            predicted_label = INTENT_LABELS[pred_idx]
            all_labels = INTENT_LABELS
        
        confidence = float(probs[pred_idx])
        all_scores = [(label, float(prob)) for label, prob in zip(all_labels, probs)]
        
        return predicted_label, confidence, all_scores

    def predict_with_rules(
        self,
        prosodic_features: Dict[str, float],
        text_features: Dict[str, int],
    ) -> Tuple[str, float, List[Tuple[str, float]]]:
        """
        Make prediction using rules-based heuristics.
        
        This is the fallback when no ML model is available.
        
        Args:
            prosodic_features: Prosodic feature dict.
            text_features: Text feature dict.
            
        Returns:
            Tuple of (predicted_label, confidence, all_scores).
        """
        # Initialize scores
        proceed_score = 0.0
        verify_score = 0.0
        reject_score = 0.0
        
        # ============================
        # Prosodic Rules
        # ============================
        
        # Pitch variability (higher = more stress = negative)
        pitch_std = prosodic_features.get("pitch_std", 25.0)
        if pitch_std < 22:
            proceed_score += 0.15
        elif pitch_std > 35:
            reject_score += 0.15
        else:
            verify_score += 0.10
        
        # Pause ratio (higher = more hesitation = negative)
        pause_ratio = prosodic_features.get("pause_ratio", 0.15)
        if pause_ratio < 0.12:
            proceed_score += 0.15
        elif pause_ratio > 0.22:
            reject_score += 0.15
        else:
            verify_score += 0.10
        
        # Speech rate (higher = more confident = positive)
        speech_rate = prosodic_features.get("speech_rate", 3.0)
        if speech_rate > 3.2:
            proceed_score += 0.10
        elif speech_rate < 2.7:
            reject_score += 0.10
        else:
            verify_score += 0.05
        
        # ============================
        # Text Rules
        # ============================
        
        # Sentiment balance
        positive_count = text_features.get("positive_word_count", 0)
        negative_count = text_features.get("negative_word_count", 0)
        
        if positive_count > negative_count * 2:
            proceed_score += 0.20
        elif negative_count > positive_count * 2:
            reject_score += 0.20
        else:
            verify_score += 0.15
        
        # Hesitation markers
        hesitation_count = text_features.get("hesitation_count", 0)
        if hesitation_count <= 1:
            proceed_score += 0.10
        elif hesitation_count >= 5:
            reject_score += 0.15
        else:
            verify_score += 0.10
        
        # Question count (more questions = uncertainty)
        question_count = text_features.get("question_count", 0)
        if question_count <= 2:
            proceed_score += 0.10
        elif question_count >= 6:
            reject_score += 0.10
            verify_score += 0.05
        else:
            verify_score += 0.10
        
        # Word count (very short = disengaged)
        word_count = text_features.get("text_word_count", 100)
        if word_count >= 150:
            proceed_score += 0.10
        elif word_count < 70:
            reject_score += 0.10
        
        # ============================
        # Normalize scores
        # ============================
        
        # Add base scores to ensure reasonable distribution
        proceed_score += 0.1
        verify_score += 0.15
        reject_score += 0.1
        
        total = proceed_score + verify_score + reject_score
        
        scores = {
            "PROCEED": proceed_score / total,
            "VERIFY": verify_score / total,
            "REJECT": reject_score / total,
        }
        
        # Find prediction
        predicted_label = max(scores, key=scores.get)
        confidence = scores[predicted_label]
        
        all_scores = [(label, score) for label, score in scores.items()]
        all_scores.sort(key=lambda x: x[1], reverse=True)
        
        return predicted_label, confidence, all_scores

    def predict(
        self,
        audio_data: Optional[bytes] = None,
        transcript: Optional[str] = None,
        audio_features: Optional[Dict[str, float]] = None,
        text_features: Optional[Dict[str, int]] = None,
        sample_rate: int = 16000,
    ) -> Tuple[PredictionResult, float, str]:
        """
        Predict intent risk from features or audio.
        
        Args:
            audio_data: Raw audio bytes (optional).
            transcript: Transcript text (optional).
            audio_features: Pre-extracted audio features.
            text_features: Pre-extracted text features.
            sample_rate: Audio sample rate.
            
        Returns:
            Tuple of (PredictionResult, processing_time_ms, model_version).
        """
        start_time = time.time()
        
        # Ensure defaults
        if audio_features is None:
            audio_features = {}
        if text_features is None:
            text_features = {}
        
        # Make prediction
        if self.use_ml_model and self.model is not None:
            logger.debug("Using ML model for prediction")
            features = self.extract_features(
                audio_data=audio_data,
                transcript=transcript,
                audio_features=audio_features if audio_features else None,
                text_features=text_features if text_features else None,
            )
            predicted_label, confidence, all_scores = self.predict_with_ml(features)
        else:
            logger.debug("Using rules-based prediction")
            # Fallback: use text features from transcript if available
            if transcript and not text_features:
                text_features = self._extract_text_features(transcript)
            predicted_label, confidence, all_scores = self.predict_with_rules(
                prosodic_features=audio_features,
                text_features=text_features,
            )
        
        # Build result
        intent_scores = [
            IntentScore(label=label, score=round(score, 4))
            for label, score in all_scores
        ]
        
        result = PredictionResult(
            predicted_intent=predicted_label,
            confidence=round(confidence, 4),
            all_scores=intent_scores,
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info(
            f"Prediction: {predicted_label} (confidence: {confidence:.2%})",
            extra={
                "extra_data": {
                    "model_version": self.model_version,
                    "processing_time_ms": round(processing_time, 2),
                }
            },
        )
        
        return result, processing_time, self.model_version


# ============================================================================
# LEGACY COMPATIBILITY - IntentClassifier wrapper
# ============================================================================

class IntentClassifier:
    """
    Legacy wrapper for backward compatibility.
    
    Maps the old IntentClassifier interface to the new IntentRiskClassifier.
    """
    
    INTENT_LABELS = INTENT_LABELS

    def __init__(
        self,
        model_path: Optional[Path] = None,
        device: Optional[str] = None,
    ) -> None:
        """Initialize with legacy parameters."""
        models_dir = model_path.parent if model_path else None
        self._classifier = IntentRiskClassifier(models_dir=models_dir)
        self.model_path = model_path
        self.device = device
        self.model = None
        self.is_loaded = False

    def load_model(self) -> bool:
        """Load model (delegates to IntentRiskClassifier)."""
        result = self._classifier.load_model()
        self.is_loaded = self._classifier.is_loaded
        self.model = self._classifier.model
        return result

    def unload_model(self) -> None:
        """Unload model."""
        self._classifier.unload_model()
        self.is_loaded = False
        self.model = None

    def preprocess_audio(
        self,
        audio_data: bytes,
        sample_rate: int = 16000,
    ) -> Tuple[Any, float]:
        """Preprocess audio (placeholder)."""
        estimated_duration = len(audio_data) / 16000.0
        return None, estimated_duration

    def predict(
        self,
        audio_data: bytes,
        sample_rate: int = 16000,
        transcript: Optional[str] = None,
    ) -> Tuple[PredictionResult, float]:
        """
        Predict from audio data.
        
        Uses real audio feature extraction with librosa.
        
        Args:
            audio_data: Raw audio bytes.
            sample_rate: Audio sample rate (default 16000).
            transcript: Optional transcript text for text features.
            
        Returns:
            Tuple of (PredictionResult, audio_duration).
        """
        _, audio_duration = self.preprocess_audio(audio_data, sample_rate)
        
        # Extract real features from audio and transcript
        features = self._classifier.extract_features(
            audio_data=audio_data,
            transcript=transcript,
        )
        
        # Use ML model if available
        if self._classifier.use_ml_model and self._classifier.is_loaded:
            label, confidence, all_scores = self._classifier.predict_with_ml(features)
            
            result = PredictionResult(
                intent_label=label,
                confidence=confidence,
                intent_scores=dict(all_scores),
                risk_level=RiskLevel.HIGH if label == "REJECT" else (
                    RiskLevel.MEDIUM if label == "VERIFY" else RiskLevel.LOW
                ),
                is_suspicious=label in ("VERIFY", "REJECT"),
                model_version=self._classifier.metadata.get("model_version", "1.0.0"),
            )
            return result, audio_duration
        
        # Fallback to rule-based prediction
        result, _, _ = self._classifier.predict(
            audio_data=audio_data,
            transcript=transcript,
        )
        
        return result, audio_duration


# ============================================================================
# GLOBAL SINGLETON INSTANCES
# ============================================================================

_classifier_instance: Optional[IntentClassifier] = None
_risk_classifier_instance: Optional[IntentRiskClassifier] = None


def get_classifier() -> IntentClassifier:
    """
    Get the global legacy classifier instance.
    
    Creates and loads the classifier on first access.
    
    Returns:
        IntentClassifier instance.
    """
    global _classifier_instance
    
    if _classifier_instance is None:
        _classifier_instance = IntentClassifier()
        _classifier_instance.load_model()
    
    return _classifier_instance


def get_risk_classifier() -> IntentRiskClassifier:
    """
    Get the global intent risk classifier instance.
    
    Creates and loads the classifier on first access.
    
    Returns:
        IntentRiskClassifier instance.
    """
    global _risk_classifier_instance
    
    if _risk_classifier_instance is None:
        _risk_classifier_instance = IntentRiskClassifier()
        _risk_classifier_instance.load_model()
    
    return _risk_classifier_instance


def reset_classifier() -> None:
    """Reset all global classifier instances (useful for testing)."""
    global _classifier_instance, _risk_classifier_instance
    
    if _classifier_instance is not None:
        _classifier_instance.unload_model()
    _classifier_instance = None
    
    if _risk_classifier_instance is not None:
        _risk_classifier_instance.unload_model()
    _risk_classifier_instance = None
