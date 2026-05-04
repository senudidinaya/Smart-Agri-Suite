"""
Smoke test for Gate 2 deception artifacts.

Loads the saved .pkl files directly and replays the EXACT feature pipeline
from `cultivator/services/gate2_inference.py` (HOG 64x64 + pixel 48x48,
Haar face detection, frame sampling at 0.5 fps, max 15 frames, predict_proba
averaged across frames per clip → argmax).

This bypasses the cultivator package import (which transitively pulls in
config / FastAPI deps that may not be installed in the system Python) but
exercises the same on-disk model contract that production uses.

Picks one deceptive and one truthful clip from the Real-Life Trial dataset
and prints the prediction. Pass = artifacts load and produce a label.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List

import cv2
import joblib
import numpy as np

MODEL_DIR = Path(
    "c:/Projects/Senudi/Merged-Project/Smart-Agri-Suite/backend/models/"
    "intent_prediction/gate2"
)
DATASET = Path(
    "c:/Projects/Senudi/Merged-Project/RealLifeDeceptionDetection.2016/"
    "Real-life_Deception_Detection_2016/Clips"
)

TARGET_FPS = 0.5
MAX_FRAMES = 15
HOG_SIZE = (64, 64)
PIXEL_SIZE = (48, 48)
_HOG = cv2.HOGDescriptor(HOG_SIZE, (16, 16), (8, 8), (8, 8), 9)


def load_artifacts():
    model = joblib.load(MODEL_DIR / "gate2_deception_model.pkl")
    scaler = joblib.load(MODEL_DIR / "gate2_deception_scaler.pkl")
    class_names = json.loads(
        (MODEL_DIR / "gate2_deception_class_names.json").read_text()
    )
    return model, scaler, class_names


def init_face_detector() -> cv2.CascadeClassifier:
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if cascade.empty():
        raise RuntimeError("Haar cascade load failed")
    return cascade


def extract_frames(video_path: Path) -> List[np.ndarray]:
    cap = cv2.VideoCapture(str(video_path))
    frames: List[np.ndarray] = []
    if not cap.isOpened():
        return frames
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    interval = max(1, int(fps / TARGET_FPS))
    idx = 0
    n = 0
    while cap.isOpened() and n < MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % interval == 0:
            frames.append(frame)
            n += 1
        idx += 1
    cap.release()
    return frames


def detect_face(frame, cascade):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return frame[y : y + h, x : x + w]


def extract_features(face) -> np.ndarray:
    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    hog_feat = _HOG.compute(cv2.resize(gray, HOG_SIZE)).flatten()
    pixel_feat = (
        cv2.resize(gray, PIXEL_SIZE).flatten().astype(np.float32) / 255.0
    )
    return np.concatenate([hog_feat, pixel_feat])


def predict_clip(video_path: Path, model, scaler, class_names, cascade) -> Dict:
    frames = extract_frames(video_path)
    feats = []
    faces = 0
    for f in frames:
        face = detect_face(f, cascade)
        if face is None or face.size == 0:
            continue
        faces += 1
        feats.append(extract_features(face))
    if not feats:
        return {
            "label": "unknown",
            "confidence": 0.0,
            "scores": {},
            "frames_used": len(frames),
            "faces_detected": 0,
        }
    feats = np.asarray(feats)
    feats_s = scaler.transform(feats)
    probs = model.predict_proba(feats_s)
    avg = probs.mean(axis=0)
    idx = int(np.argmax(avg))
    return {
        "label": class_names[idx],
        "confidence": round(float(avg[idx]), 4),
        "scores": {class_names[i]: round(float(avg[i]), 4) for i in range(len(class_names))},
        "frames_used": len(frames),
        "faces_detected": faces,
        "frame_predictions": [class_names[int(np.argmax(p))] for p in probs],
    }


def run_one(label: str, clip_path: Path, model, scaler, class_names, cascade):
    print(f"\n--- {label}: {clip_path.name} ---")
    result = predict_clip(clip_path, model, scaler, class_names, cascade)
    for k, v in result.items():
        print(f"  {k} = {v}")


def main() -> None:
    print(f"[INIT] loading artifacts from {MODEL_DIR}")
    model, scaler, class_names = load_artifacts()
    print(f"[INIT] model={type(model).__name__} classes={class_names}")
    cascade = init_face_detector()

    decept = DATASET / "Deceptive" / "trial_lie_001.mp4"
    truth = DATASET / "Truthful" / "trial_truth_001.mp4"
    if not decept.exists() or not truth.exists():
        print(f"[FAIL] sample clips missing")
        sys.exit(1)
    run_one("DECEPTIVE-CLIP (label=deceptive)", decept, model, scaler, class_names, cascade)
    run_one("TRUTHFUL-CLIP  (label=truthful)", truth, model, scaler, class_names, cascade)
    print("\n[OK] inference contract validated end-to-end")


if __name__ == "__main__":
    main()
