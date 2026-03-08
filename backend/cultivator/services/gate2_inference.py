"""
Gate 2 Video Interview Inference Service (scikit-learn version)

Analyzes video interviews to assess safety/trust risk based on facial expressions.
Uses HOG features + RandomForest classifier (no TensorFlow required).

Output classification: APPROVE / VERIFY / REJECT with confidence + signals.

Components:
1. Model loading (sklearn .pkl files, cached singleton)
2. Video frame extraction (OpenCV)
3. Face detection (Haar cascade)
4. Emotion prediction (per-frame with HOG features)
5. Aggregation and risk decision mapping
"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np


@dataclass
class Gate2InferenceResult:
    """Result of Gate 2 video interview analysis."""
    
    decision_label: str  # APPROVE, VERIFY, REJECT
    confidence: float
    emotion_distribution: Dict[str, float]
    dominant_emotion: str
    top_signals: List[str]
    stats: Dict[str, any]
    model_version: str = "gate2-sklearn-v1"
    
    def to_dict(self) -> dict:
        return {
            'decision_label': self.decision_label,
            'confidence': self.confidence,
            'emotion_distribution': self.emotion_distribution,
            'dominant_emotion': self.dominant_emotion,
            'top_signals': self.top_signals,
            'stats': self.stats,
            'model_version': self.model_version,
        }


class Gate2InferenceService:
    """
    Singleton service for Gate 2 video interview analysis.
    
    Uses scikit-learn RandomForest with HOG features.
    """
    
    _instance: Optional['Gate2InferenceService'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.model = None
        self.scaler = None
        self.class_names: List[str] = []
        self.metadata: dict = {}
        self.is_loaded = False
        self.face_cascade = None
        
        # Paths
        self.model_dir = Path(__file__).parent.parent.parent / "models" / "gate2"
        self.model_path = self.model_dir / "gate2_expression_model.pkl"
        self.scaler_path = self.model_dir / "gate2_scaler.pkl"
        self.class_names_path = self.model_dir / "gate2_class_names.json"
        self.metadata_path = self.model_dir / "gate2_model_metadata.json"
        
        # Configuration
        self.target_fps = 0.5  # Extract 1 frame every 2 seconds
        self.max_frames = 15  # Maximum frames to process (was 60)
        self.hog_size = (64, 64)
        self.pixel_size = (48, 48)
        
        # Initialize
        self._load_model()
        self._init_face_detector()
        self._initialized = True
    
    def _load_model(self):
        """Load the sklearn model, scaler, and class names."""
        try:
            import joblib
            
            if not self.model_path.exists():
                print(f"[WARN] Gate 2 model not found: {self.model_path}")
                self.is_loaded = False
                return
            
            if not self.scaler_path.exists():
                print(f"[WARN] Gate 2 scaler not found: {self.scaler_path}")
                self.is_loaded = False
                return
            
            if not self.class_names_path.exists():
                print(f"[WARN] Gate 2 class names not found: {self.class_names_path}")
                self.is_loaded = False
                return
            
            print(f"[INFO] Loading Gate 2 model from: {self.model_path}")
            self.model = joblib.load(str(self.model_path))
            
            print(f"[INFO] Loading scaler from: {self.scaler_path}")
            self.scaler = joblib.load(str(self.scaler_path))
            
            # Load class names
            with open(self.class_names_path, 'r') as f:
                self.class_names = json.load(f)
            
            # Load metadata if exists
            if self.metadata_path.exists():
                with open(self.metadata_path, 'r') as f:
                    self.metadata = json.load(f)
            
            self.is_loaded = True
            print(f"[INFO] Gate 2 model loaded successfully. Classes: {self.class_names}")
            
        except Exception as e:
            print(f"[ERROR] Failed to load Gate 2 model: {e}")
            import traceback
            traceback.print_exc()
            self.is_loaded = False
    
    def _init_face_detector(self):
        """Initialize Haar cascade face detector."""
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            if self.face_cascade.empty():
                print("[ERROR] Failed to load Haar cascade")
                self.face_cascade = None
            else:
                print("[INFO] Face detector: Haar cascade loaded")
                
        except Exception as e:
            print(f"[ERROR] Face detector initialization failed: {e}")
            self.face_cascade = None
    
    def _extract_frames(self, video_path: str) -> List[np.ndarray]:
        """
        Extract frames from video at target FPS.
        
        Args:
            video_path: Path to video file
        
        Returns:
            List of BGR frame arrays
        """
        frames = []
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"[ERROR] Cannot open video: {video_path}")
            return frames
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        print(f"[INFO] Video: {duration:.1f}s, {fps:.1f} FPS, {total_frames} frames")
        
        # Calculate frame interval
        frame_interval = int(fps / self.target_fps) if fps > self.target_fps else 1
        
        frame_idx = 0
        extracted_count = 0
        
        while cap.isOpened() and extracted_count < self.max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_idx % frame_interval == 0:
                frames.append(frame)  # Keep as BGR
                extracted_count += 1
            
            frame_idx += 1
        
        cap.release()
        print(f"[INFO] Extracted {len(frames)} frames")
        
        return frames
    
    def _detect_face(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect and crop face using Haar cascade.
        
        Args:
            frame: BGR frame
        
        Returns:
            Cropped face image (BGR) or None
        """
        if self.face_cascade is None:
            return None
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60)
        )
        
        if len(faces) == 0:
            return None
        
        # Use largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face = frame[y:y+h, x:x+w]
        
        return face
    
    def _extract_hog_features(self, image: np.ndarray) -> np.ndarray:
        """Extract HOG features from image."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        resized = cv2.resize(gray, self.hog_size)
        
        win_size = self.hog_size
        block_size = (16, 16)
        block_stride = (8, 8)
        cell_size = (8, 8)
        nbins = 9
        
        hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
        features = hog.compute(resized)
        
        return features.flatten()
    
    def _extract_pixel_features(self, image: np.ndarray) -> np.ndarray:
        """Extract flattened grayscale pixel features."""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        resized = cv2.resize(gray, self.pixel_size)
        return resized.flatten().astype(np.float32) / 255.0
    
    def _extract_features(self, image: np.ndarray) -> np.ndarray:
        """Extract combined features from image."""
        hog_features = self._extract_hog_features(image)
        pixel_features = self._extract_pixel_features(image)
        return np.concatenate([hog_features, pixel_features])
    
    def _predict_emotion(self, face: np.ndarray) -> Tuple[str, float, Dict[str, float]]:
        """
        Predict emotion from face image.
        
        Args:
            face: Face image (BGR)
        
        Returns:
            predicted_emotion, confidence, all_scores
        """
        # Extract features
        features = self._extract_features(face)
        features_scaled = self.scaler.transform(features.reshape(1, -1))
        
        # Predict
        prediction = self.model.predict(features_scaled)[0]
        probabilities = self.model.predict_proba(features_scaled)[0]
        
        predicted_emotion = self.class_names[prediction]
        confidence = float(probabilities[prediction])
        
        all_scores = {
            self.class_names[i]: float(probabilities[i])
            for i in range(len(self.class_names))
        }
        
        return predicted_emotion, confidence, all_scores
    
    def _aggregate_predictions(
        self, 
        predictions: List[Tuple[str, float, Dict[str, float]]]
    ) -> Tuple[Dict[str, float], str, float]:
        """
        Aggregate frame-level predictions.
        
        Returns:
            emotion_distribution, dominant_emotion, stability
        """
        if not predictions:
            return {}, "unknown", 0.0
        
        # Calculate average distribution
        all_scores = [p[2] for p in predictions]
        emotion_distribution = {}
        
        for emotion in self.class_names:
            scores = [s.get(emotion, 0.0) for s in all_scores]
            emotion_distribution[emotion] = sum(scores) / len(scores)
        
        # Find dominant emotion
        dominant_emotion = max(emotion_distribution, key=emotion_distribution.get)
        
        # Calculate stability (how consistent predictions are)
        predicted_emotions = [p[0] for p in predictions]
        dominant_count = predicted_emotions.count(dominant_emotion)
        stability = dominant_count / len(predictions)
        
        return emotion_distribution, dominant_emotion, stability
    
    def _map_to_decision(
        self,
        emotion_distribution: Dict[str, float],
        face_detection_rate: float,
        stability: float,
        avg_confidence: float
    ) -> Tuple[str, float, List[str]]:
        """
        Map emotion analysis to Gate 2 decision.
        
        Decision rules:
        - If face_detection_rate < 0.30 => VERIFY (insufficient evidence)
        - If fear_ratio >= 0.55 and confidence >= 0.60 => REJECT
        - If fear_ratio >= 0.35 OR confidence in [0.45..0.60] OR low stability => VERIFY
        - Else => APPROVE
        """
        signals = []
        
        # Rule 1: Insufficient face detection
        if face_detection_rate < 0.30:
            signals.append(f"Low face visibility ({face_detection_rate*100:.0f}% frames)")
            signals.append("Manual verification recommended")
            return "VERIFY", 0.5, signals
        
        # Get fear ratio
        fear_emotions = ['fear', 'afraid', 'scared', 'anxious']
        fear_ratio = sum(
            emotion_distribution.get(e, 0.0) 
            for e in fear_emotions 
            if e in emotion_distribution
        )
        
        for emotion, score in emotion_distribution.items():
            if 'fear' in emotion.lower():
                fear_ratio = max(fear_ratio, score)
        
        # Negative emotion aggregation
        negative_emotions = ['angry', 'anger', 'disgust', 'fear', 'sad', 'sadness']
        negative_ratio = sum(
            emotion_distribution.get(e, 0.0)
            for e in negative_emotions
            if e in emotion_distribution
        )
        
        for emotion, score in emotion_distribution.items():
            emotion_lower = emotion.lower()
            for neg in ['angry', 'fear', 'sad', 'disgust']:
                if neg in emotion_lower:
                    negative_ratio = max(negative_ratio, score)
        
        # Positive emotions
        positive_emotions = ['happy', 'happiness', 'neutral', 'calm', 'surprise']
        positive_ratio = sum(
            emotion_distribution.get(e, 0.0)
            for e in positive_emotions
            if e in emotion_distribution
        )
        
        # Rule 2: High fear/negative => REJECT
        if fear_ratio >= 0.55 and avg_confidence >= 0.60:
            signals.append(f"High fear indicators ({fear_ratio*100:.0f}%)")
            signals.append(f"Model confidence: {avg_confidence*100:.0f}%")
            signals.append("Significant stress/anxiety detected")
            return "REJECT", avg_confidence, signals
        
        if negative_ratio >= 0.60 and avg_confidence >= 0.55:
            signals.append(f"Elevated negative emotions ({negative_ratio*100:.0f}%)")
            signals.append(f"Model confidence: {avg_confidence*100:.0f}%")
            return "REJECT", avg_confidence * 0.9, signals
        
        # Rule 3: Moderate concerns => VERIFY
        if fear_ratio >= 0.35:
            signals.append(f"Moderate fear indicators ({fear_ratio*100:.0f}%)")
            signals.append("Additional verification recommended")
            return "VERIFY", avg_confidence * 0.85, signals
        
        if 0.45 <= avg_confidence <= 0.60:
            signals.append(f"Moderate model confidence ({avg_confidence*100:.0f}%)")
            signals.append("Consider additional interview")
            return "VERIFY", avg_confidence, signals
        
        if stability < 0.40:
            signals.append(f"Variable emotional state ({stability*100:.0f}% consistency)")
            signals.append("Expression patterns inconsistent")
            return "VERIFY", avg_confidence * 0.8, signals
        
        if negative_ratio >= 0.35:
            signals.append(f"Some negative indicators ({negative_ratio*100:.0f}%)")
            return "VERIFY", avg_confidence * 0.85, signals
        
        # Rule 4: Low risk => APPROVE
        signals.append(f"Stable emotional presentation ({stability*100:.0f}%)")
        signals.append(f"Positive/neutral: {positive_ratio*100:.0f}%")
        
        if avg_confidence >= 0.75:
            signals.append("High confidence in assessment")
        
        return "APPROVE", min(avg_confidence, 0.95), signals
    
    def predict(self, video_path: str) -> Gate2InferenceResult:
        """
        Analyze video and return Gate 2 decision.
        
        Args:
            video_path: Path to video file
        
        Returns:
            Gate2InferenceResult with decision, confidence, and signals
        """
        # Fallback if model not loaded
        if not self.is_loaded:
            return Gate2InferenceResult(
                decision_label="VERIFY",
                confidence=0.5,
                emotion_distribution={},
                dominant_emotion="unknown",
                top_signals=[
                    "Gate 2 ML model not loaded",
                    "Manual verification required",
                    f"Expected model at: {self.model_path}"
                ],
                stats={
                    'frames_used': 0,
                    'faces_detected': 0,
                    'face_detection_rate': 0.0,
                    'stability': 0.0,
                    'model_loaded': False
                },
                model_version="gate2-fallback-v1"
            )
        
        # Extract frames
        frames = self._extract_frames(video_path)
        
        if not frames:
            return Gate2InferenceResult(
                decision_label="VERIFY",
                confidence=0.5,
                emotion_distribution={},
                dominant_emotion="unknown",
                top_signals=[
                    "Could not extract frames from video",
                    "Video may be corrupted or unsupported format",
                    "Manual review required"
                ],
                stats={
                    'frames_used': 0,
                    'faces_detected': 0,
                    'face_detection_rate': 0.0,
                    'stability': 0.0
                }
            )
        
        # Process frames
        predictions = []
        faces_detected = 0
        
        for frame in frames:
            face = self._detect_face(frame)
            
            if face is not None and face.size > 0:
                faces_detected += 1
                try:
                    emotion, confidence, scores = self._predict_emotion(face)
                    predictions.append((emotion, confidence, scores))
                except Exception as e:
                    print(f"[WARN] Prediction failed for frame: {e}")
                    continue
        
        face_detection_rate = faces_detected / len(frames) if frames else 0.0
        
        print(f"[INFO] Face detection: {faces_detected}/{len(frames)} frames "
              f"({face_detection_rate*100:.0f}%)")
        
        # Aggregate predictions
        if predictions:
            emotion_distribution, dominant_emotion, stability = \
                self._aggregate_predictions(predictions)
            avg_confidence = sum(p[1] for p in predictions) / len(predictions)
        else:
            emotion_distribution = {}
            dominant_emotion = "unknown"
            stability = 0.0
            avg_confidence = 0.0
        
        # Map to decision
        decision_label, confidence, top_signals = self._map_to_decision(
            emotion_distribution,
            face_detection_rate,
            stability,
            avg_confidence
        )
        
        return Gate2InferenceResult(
            decision_label=decision_label,
            confidence=confidence,
            emotion_distribution=emotion_distribution,
            dominant_emotion=dominant_emotion,
            top_signals=top_signals,
            stats={
                'frames_used': len(frames),
                'faces_detected': faces_detected,
                'face_detection_rate': round(face_detection_rate, 3),
                'stability': round(stability, 3),
                'avg_model_confidence': round(avg_confidence, 3) if predictions else 0.0,
                'predictions_count': len(predictions)
            }
        )


# Singleton accessor
_gate2_service: Optional[Gate2InferenceService] = None


def get_gate2_inference_service() -> Gate2InferenceService:
    """Get the Gate 2 inference service singleton."""
    global _gate2_service
    if _gate2_service is None:
        _gate2_service = Gate2InferenceService()
    return _gate2_service


# ============================================================================
# GATE 2 DECEPTION DETECTION (Visual/Frame-based Truth/Lie Detection)
# ============================================================================


@dataclass
class Gate2DeceptionResult:
    """Result of Gate 2 visual deception analysis."""

    deception_label: str  # truthful, deceptive
    deception_confidence: float
    deception_scores: Dict[str, float]
    frame_predictions: List[str]
    signals: List[str]
    stats: Dict[str, any]
    model_version: str = "gate2-deception-sklearn-v1"

    def to_dict(self) -> dict:
        return {
            "deception_label": self.deception_label,
            "deception_confidence": self.deception_confidence,
            "deception_scores": self.deception_scores,
            "frame_predictions": self.frame_predictions,
            "signals": self.signals,
            "stats": self.stats,
            "model_version": self.model_version,
        }


class Gate2DeceptionService:
    """
    Visual deception detection service for Gate 2.

    Analyzes video frames to classify facial expressions as truthful or
    deceptive using HOG + pixel features and a trained RandomForest model.

    When the ML model is not available, uses rules-based analysis combining
    emotion detection results with deception-correlated features.
    """

    _instance: Optional["Gate2DeceptionService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.model = None
        self.scaler = None
        self.class_names: List[str] = []
        self.metadata: dict = {}
        self.is_loaded = False
        self.face_cascade = None

        # Paths
        self.model_dir = Path(__file__).parent.parent.parent / "models" / "gate2"
        self.model_path = self.model_dir / "gate2_deception_model.pkl"
        self.scaler_path = self.model_dir / "gate2_deception_scaler.pkl"
        self.class_names_path = self.model_dir / "gate2_deception_class_names.json"
        self.metadata_path = self.model_dir / "gate2_deception_metadata.json"

        # Configuration (same as emotion model for feature compatibility)
        self.target_fps = 0.5
        self.max_frames = 15
        self.hog_size = (64, 64)
        self.pixel_size = (48, 48)

        self._load_model()
        self._init_face_detector()
        self._initialized = True

    def _load_model(self):
        """Load the deception detection model."""
        try:
            import joblib

            if not self.model_path.exists():
                print(f"[WARN] Gate 2 deception model not found: {self.model_path}")
                self.is_loaded = False
                return

            self.model = joblib.load(str(self.model_path))

            if self.scaler_path.exists():
                self.scaler = joblib.load(str(self.scaler_path))

            if self.class_names_path.exists():
                with open(self.class_names_path, "r") as f:
                    self.class_names = json.load(f)

            if self.metadata_path.exists():
                with open(self.metadata_path, "r") as f:
                    self.metadata = json.load(f)

            self.is_loaded = True
            print(
                f"[INFO] Gate 2 deception model loaded. Classes: {self.class_names}"
            )

        except Exception as e:
            print(f"[ERROR] Failed to load Gate 2 deception model: {e}")
            self.is_loaded = False

    def _init_face_detector(self):
        """Initialize Haar cascade face detector."""
        try:
            cascade_path = (
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            if self.face_cascade.empty():
                self.face_cascade = None
        except Exception:
            self.face_cascade = None

    def _extract_frames(self, video_path: str) -> List[np.ndarray]:
        """Extract frames from video at target FPS."""
        frames = []
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return frames

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_interval = max(1, int(fps / self.target_fps))
        frame_idx = 0
        extracted = 0

        while cap.isOpened() and extracted < self.max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % frame_interval == 0:
                frames.append(frame)
                extracted += 1
            frame_idx += 1

        cap.release()
        return frames

    def _detect_face(self, frame: np.ndarray) -> Optional[np.ndarray]:
        """Detect and crop face from frame."""
        if self.face_cascade is None:
            return None

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
        )

        if len(faces) == 0:
            return None

        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        return frame[y : y + h, x : x + w]

    def _extract_features(self, image: np.ndarray) -> np.ndarray:
        """Extract HOG + pixel features (same pipeline as emotion model)."""
        # HOG
        gray = (
            cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            if len(image.shape) == 3
            else image
        )
        resized_hog = cv2.resize(gray, self.hog_size)
        hog = cv2.HOGDescriptor(
            self.hog_size, (16, 16), (8, 8), (8, 8), 9
        )
        hog_features = hog.compute(resized_hog).flatten()

        # Pixel
        resized_px = cv2.resize(gray, self.pixel_size)
        pixel_features = resized_px.flatten().astype(np.float32) / 255.0

        return np.concatenate([hog_features, pixel_features])

    def predict(self, video_path: str) -> Gate2DeceptionResult:
        """
        Analyze video for visual deception cues.

        Args:
            video_path: Path to video file

        Returns:
            Gate2DeceptionResult with deception assessment
        """
        # Fallback if model not loaded — use rules-based with emotion service
        if not self.is_loaded:
            return self._rules_based_predict(video_path)

        frames = self._extract_frames(video_path)
        if not frames:
            return Gate2DeceptionResult(
                deception_label="unknown",
                deception_confidence=0.0,
                deception_scores={},
                frame_predictions=[],
                signals=["Could not extract frames from video"],
                stats={"frames_used": 0, "faces_detected": 0},
            )

        frame_labels = []
        frame_scores_list = []
        faces_detected = 0

        for frame in frames:
            face = self._detect_face(frame)
            if face is None or face.size == 0:
                continue

            faces_detected += 1
            features = self._extract_features(face)
            scaled = self.scaler.transform(features.reshape(1, -1))

            pred = self.model.predict(scaled)[0]
            probs = self.model.predict_proba(scaled)[0]

            label = self.class_names[pred]
            frame_labels.append(label)
            frame_scores_list.append(
                {self.class_names[i]: float(probs[i]) for i in range(len(self.class_names))}
            )

        if not frame_labels:
            return Gate2DeceptionResult(
                deception_label="unknown",
                deception_confidence=0.0,
                deception_scores={},
                frame_predictions=[],
                signals=["No faces detected in video frames"],
                stats={
                    "frames_used": len(frames),
                    "faces_detected": 0,
                    "face_detection_rate": 0.0,
                },
            )

        # Aggregate frame predictions
        avg_scores = {}
        for cls in self.class_names:
            scores = [s.get(cls, 0.0) for s in frame_scores_list]
            avg_scores[cls] = sum(scores) / len(scores)

        dominant = max(avg_scores, key=avg_scores.get)
        confidence = avg_scores[dominant]

        # Consistency measure
        dominant_count = frame_labels.count(dominant)
        consistency = dominant_count / len(frame_labels)

        signals = self._generate_deception_signals(
            dominant, confidence, consistency, faces_detected, len(frames)
        )

        return Gate2DeceptionResult(
            deception_label=dominant,
            deception_confidence=round(confidence, 4),
            deception_scores={k: round(v, 4) for k, v in avg_scores.items()},
            frame_predictions=frame_labels,
            signals=signals,
            stats={
                "frames_used": len(frames),
                "faces_detected": faces_detected,
                "face_detection_rate": round(faces_detected / len(frames), 3),
                "consistency": round(consistency, 3),
                "frame_count_per_label": {
                    lbl: frame_labels.count(lbl) for lbl in set(frame_labels)
                },
            },
        )

    def _rules_based_predict(self, video_path: str) -> Gate2DeceptionResult:
        """
        Rules-based deception detection using the emotion model as proxy.

        Uses emotion distribution patterns correlated with deception:
        - High fear/anxiety → deception indicator
        - Micro-expression inconsistency → deception indicator
        - Forced smile (high happy but quick transitions) → deception
        - Neutral with sudden negative → suppression → deception
        """
        # Use the emotion service as feature extractor
        emotion_service = get_gate2_inference_service()
        emotion_result = emotion_service.predict(video_path)

        ed = emotion_result.emotion_distribution
        stability = emotion_result.stats.get("stability", 0.0)

        deception_score = 0.0
        total_weight = 0.0
        signals = []

        # Fear → deception indicator (weight: 0.3)
        fear_ratio = sum(ed.get(e, 0) for e in ["fear", "afraid"] if e in ed)
        if fear_ratio > 0.3:
            deception_score += 0.3
            signals.append(
                f"Fear indicators ({fear_ratio*100:.0f}%) — anxiety/deception cue"
            )
        total_weight += 0.3

        # Anger suppression → deception (weight: 0.2)
        anger_ratio = sum(ed.get(e, 0) for e in ["angry", "anger"] if e in ed)
        if anger_ratio > 0.2:
            deception_score += 0.15
            signals.append(f"Anger signals ({anger_ratio*100:.0f}%)")
        total_weight += 0.2

        # Low stability → inconsistent expressions → deception (weight: 0.25)
        if stability < 0.4:
            deception_score += 0.2
            signals.append(
                f"Inconsistent expressions ({stability*100:.0f}% stability) — "
                "possible deception"
            )
        total_weight += 0.25

        # Negative emotion dominance (weight: 0.25)
        negative = sum(
            ed.get(e, 0)
            for e in ["angry", "fear", "sad", "disgust"]
            if e in ed
        )
        if negative > 0.5:
            deception_score += 0.2
            signals.append(
                f"Negative emotion dominance ({negative*100:.0f}%)"
            )
        total_weight += 0.25

        deception_prob = deception_score / total_weight if total_weight > 0 else 0.5
        deception_prob = min(max(deception_prob, 0.05), 0.95)
        truth_prob = 1.0 - deception_prob

        if deception_prob > 0.5:
            label = "deceptive"
            confidence = deception_prob
        else:
            label = "truthful"
            confidence = truth_prob
            if not signals:
                signals.append("Expression patterns consistent with truthful behavior")

        return Gate2DeceptionResult(
            deception_label=label,
            deception_confidence=round(confidence, 4),
            deception_scores={
                "truthful": round(truth_prob, 4),
                "deceptive": round(deception_prob, 4),
            },
            frame_predictions=[],
            signals=signals,
            stats={
                "method": "rules_based_via_emotion",
                "emotion_dominant": emotion_result.dominant_emotion,
                "emotion_stability": stability,
                **emotion_result.stats,
            },
            model_version="gate2-deception-rules-v1",
        )

    def _generate_deception_signals(
        self,
        label: str,
        confidence: float,
        consistency: float,
        faces_detected: int,
        total_frames: int,
    ) -> List[str]:
        """Generate human-readable deception signals."""
        signals = []

        face_rate = faces_detected / total_frames if total_frames > 0 else 0

        if face_rate < 0.3:
            signals.append(
                f"Low face visibility ({face_rate*100:.0f}%) — "
                "insufficient data for reliable assessment"
            )

        if label == "deceptive":
            signals.append(
                f"Deceptive facial patterns detected "
                f"(confidence: {confidence*100:.0f}%)"
            )
            if consistency > 0.7:
                signals.append("Consistent deceptive cues across frames")
            else:
                signals.append(
                    f"Mixed signals ({consistency*100:.0f}% consistency) — "
                    "some deceptive frames detected"
                )
        else:
            signals.append(
                f"Facial expressions consistent with truthful behavior "
                f"(confidence: {confidence*100:.0f}%)"
            )
            if consistency > 0.8:
                signals.append("Stable truthful expression pattern")

        return signals


_gate2_deception_service: Optional[Gate2DeceptionService] = None


def get_gate2_deception_service() -> Gate2DeceptionService:
    """Get the Gate 2 deception detection service singleton."""
    global _gate2_deception_service
    if _gate2_deception_service is None:
        _gate2_deception_service = Gate2DeceptionService()
    return _gate2_deception_service
