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
        self.target_fps = 1  # Extract 1 frame per second
        self.max_frames = 60  # Maximum frames to process
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
