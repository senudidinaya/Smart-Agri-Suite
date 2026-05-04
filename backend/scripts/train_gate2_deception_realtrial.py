"""
Train Gate 2 visual deception model on the Real-Life Trial Deception Detection
Dataset (Perez-Rosas et al., 2015 / ICMI '15).

Mirrors the runtime feature contract used by Gate2DeceptionService in
`cultivator/services/gate2_inference.py`:
    - Frame sampling at target_fps = 0.5, max 15 frames per clip
    - Haar-cascade frontal face detection, largest-face crop
    - HOG (64x64 win, 16/8/8/9) + raw pixel (48x48, normalised) concatenated
    - StandardScaler -> RandomForestClassifier
    - class_names = ["deceptive", "truthful"]

Outputs (overwriting prior artifacts; pre-existing files have been backed up
to `<gate2>/_backup_pre_realtrial/` already):
    gate2_deception_model.pkl
    gate2_deception_scaler.pkl
    gate2_deception_class_names.json
    gate2_deception_metadata.json

Reports two held-out evaluations:
  (1) Subject-independent split  (test speakers unseen during training)
  (2) Clip-level stratified split (random clips, frames within those clips)

Subject-independent is the headline number for the viva because the dataset
contains the same speakers in both classes and naive splits leak identity.
"""

from __future__ import annotations

import json
import random
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import cv2
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

DATASET_ROOT = Path(
    "c:/Projects/Senudi/Merged-Project/RealLifeDeceptionDetection.2016/"
    "Real-life_Deception_Detection_2016"
)
README_PATH = DATASET_ROOT / "README.txt"
DECEPTIVE_DIR = DATASET_ROOT / "Clips" / "Deceptive"
TRUTHFUL_DIR = DATASET_ROOT / "Clips" / "Truthful"

MODEL_DIR = Path(
    "c:/Projects/Senudi/Merged-Project/Smart-Agri-Suite/backend/models/"
    "intent_prediction/gate2"
)
MODEL_PATH = MODEL_DIR / "gate2_deception_model.pkl"
SCALER_PATH = MODEL_DIR / "gate2_deception_scaler.pkl"
CLASS_NAMES_PATH = MODEL_DIR / "gate2_deception_class_names.json"
METADATA_PATH = MODEL_DIR / "gate2_deception_metadata.json"

# ---------------------------------------------------------------------------
# Feature pipeline parameters (must match runtime in gate2_inference.py)
# ---------------------------------------------------------------------------

TARGET_FPS = 0.5
MAX_FRAMES = 15
HOG_SIZE = (64, 64)
PIXEL_SIZE = (48, 48)

CLASS_NAMES = ["deceptive", "truthful"]
CLASS_INDEX = {name: idx for idx, name in enumerate(CLASS_NAMES)}

# Reproducibility
RANDOM_SEED = 42

# ---------------------------------------------------------------------------
# Speaker mapping from README (clip filename -> "Role / trial name")
# ---------------------------------------------------------------------------

ROW_RE = re.compile(
    r"\|\s*(trial_(?:lie|truth)_\d+\.mp4)\s*\|\s*([^|]+?)\s*\|"
)


def build_speaker_map() -> Dict[str, str]:
    """Parse README.txt to produce {clip_filename: speaker_key}."""
    text = README_PATH.read_text(encoding="utf-8", errors="ignore")
    mapping: Dict[str, str] = {}
    for clip, role_name in ROW_RE.findall(text):
        # Speaker key = the part after the slash, lowercased and stripped.
        # e.g. "Defendant / Jodi Arias" -> "jodi arias"
        if "/" in role_name:
            speaker = role_name.split("/", 1)[1].strip().lower()
        else:
            speaker = role_name.strip().lower()
        # Normalise whitespace
        speaker = re.sub(r"\s+", " ", speaker)
        mapping[clip] = speaker
    return mapping


# ---------------------------------------------------------------------------
# Feature extraction (mirrors gate2_inference.py exactly)
# ---------------------------------------------------------------------------


def init_face_detector() -> cv2.CascadeClassifier:
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    if cascade.empty():
        raise RuntimeError("Failed to load Haar cascade")
    return cascade


def extract_frames(video_path: Path) -> List[np.ndarray]:
    cap = cv2.VideoCapture(str(video_path))
    frames: List[np.ndarray] = []
    if not cap.isOpened():
        return frames
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = max(1, int(fps / TARGET_FPS))
    idx = 0
    extracted = 0
    while cap.isOpened() and extracted < MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % frame_interval == 0:
            frames.append(frame)
            extracted += 1
        idx += 1
    cap.release()
    return frames


def detect_face(frame: np.ndarray, cascade: cv2.CascadeClassifier):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return frame[y : y + h, x : x + w]


_HOG = cv2.HOGDescriptor(HOG_SIZE, (16, 16), (8, 8), (8, 8), 9)


def extract_features(face_bgr: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    resized_hog = cv2.resize(gray, HOG_SIZE)
    hog_feat = _HOG.compute(resized_hog).flatten()
    resized_px = cv2.resize(gray, PIXEL_SIZE)
    pixel_feat = resized_px.flatten().astype(np.float32) / 255.0
    return np.concatenate([hog_feat, pixel_feat])


# ---------------------------------------------------------------------------
# Build dataset
# ---------------------------------------------------------------------------


def build_dataset() -> Tuple[np.ndarray, np.ndarray, List[str], List[str]]:
    """
    Returns:
        X            - (N, n_features) feature matrix
        y            - (N,) integer labels (0=deceptive, 1=truthful)
        clip_ids     - (N,) clip filename per row (for clip-level grouping)
        speaker_ids  - (N,) speaker key per row (for subject-independent split)
    """
    cascade = init_face_detector()
    speaker_map = build_speaker_map()

    feats: List[np.ndarray] = []
    labels: List[int] = []
    clip_ids: List[str] = []
    speakers: List[str] = []

    sources = [
        ("deceptive", DECEPTIVE_DIR),
        ("truthful", TRUTHFUL_DIR),
    ]

    total_videos = 0
    total_frames_extracted = 0
    total_faces = 0

    for label_name, folder in sources:
        label_idx = CLASS_INDEX[label_name]
        clips = sorted(folder.glob("*.mp4"))
        for clip_path in clips:
            total_videos += 1
            clip_name = clip_path.name
            speaker = speaker_map.get(clip_name, f"unknown::{clip_name}")
            frames = extract_frames(clip_path)
            total_frames_extracted += len(frames)
            faces_for_clip = 0
            for frame in frames:
                face = detect_face(frame, cascade)
                if face is None or face.size == 0:
                    continue
                faces_for_clip += 1
                feats.append(extract_features(face))
                labels.append(label_idx)
                clip_ids.append(clip_name)
                speakers.append(speaker)
            total_faces += faces_for_clip
            print(
                f"  [{label_name:9s}] {clip_name:20s} "
                f"frames={len(frames):2d} faces={faces_for_clip:2d} "
                f"speaker={speaker}"
            )

    print(
        f"\n[DATASET] videos={total_videos} "
        f"frames_extracted={total_frames_extracted} "
        f"face_samples={total_faces}"
    )

    X = np.asarray(feats, dtype=np.float32)
    y = np.asarray(labels, dtype=np.int64)
    return X, y, clip_ids, speakers


# ---------------------------------------------------------------------------
# Splits
# ---------------------------------------------------------------------------


def subject_independent_split(
    speakers: List[str], y: np.ndarray, test_frac: float = 0.20
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Hold out ~test_frac of unique speakers as the test set, balancing across
    classes so both deceptive and truthful speakers are represented.
    """
    rng = random.Random(RANDOM_SEED)
    speakers_arr = np.asarray(speakers)

    # Map speaker -> set of class labels they appear in.
    speaker_classes: Dict[str, set] = defaultdict(set)
    for spk, lbl in zip(speakers_arr, y):
        speaker_classes[spk].add(int(lbl))

    # Speakers per "primary" class (use the first class they appear in).
    by_class: Dict[int, List[str]] = defaultdict(list)
    for spk, cls_set in speaker_classes.items():
        for c in sorted(cls_set):
            by_class[c].append(spk)
            break

    test_speakers: set = set()
    for c, spk_list in by_class.items():
        rng.shuffle(spk_list)
        n_test = max(1, int(round(len(spk_list) * test_frac)))
        test_speakers.update(spk_list[:n_test])

    test_mask = np.array([s in test_speakers for s in speakers_arr])
    train_mask = ~test_mask
    return train_mask, test_mask


def clip_stratified_split(
    clip_ids: List[str], y: np.ndarray, test_frac: float = 0.20
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Hold out ~test_frac of clips per class, then map to frame rows.
    """
    rng = random.Random(RANDOM_SEED + 1)
    clip_arr = np.asarray(clip_ids)

    # Map clip -> single class label
    clip_label: Dict[str, int] = {}
    for c, lbl in zip(clip_arr, y):
        clip_label[c] = int(lbl)

    by_class: Dict[int, List[str]] = defaultdict(list)
    for clip, lbl in clip_label.items():
        by_class[lbl].append(clip)

    test_clips: set = set()
    for lbl, clips in by_class.items():
        rng.shuffle(clips)
        n_test = max(1, int(round(len(clips) * test_frac)))
        test_clips.update(clips[:n_test])

    test_mask = np.array([c in test_clips for c in clip_arr])
    train_mask = ~test_mask
    return train_mask, test_mask


# ---------------------------------------------------------------------------
# Train + evaluate
# ---------------------------------------------------------------------------


def train_and_evaluate(
    X: np.ndarray,
    y: np.ndarray,
    clip_ids_arr: np.ndarray,
    train_mask: np.ndarray,
    test_mask: np.ndarray,
    label: str,
) -> Dict:
    print(f"\n[EVAL: {label}]")
    print(
        f"  train_frames={train_mask.sum()} (decept={int((y[train_mask] == 0).sum())}, "
        f"truth={int((y[train_mask] == 1).sum())})"
    )
    print(
        f"  test_frames ={test_mask.sum()} (decept={int((y[test_mask] == 0).sum())}, "
        f"truth={int((y[test_mask] == 1).sum())})"
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X[train_mask])
    X_test = scaler.transform(X[test_mask])
    y_train = y[train_mask]
    y_test = y[test_mask]

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=RANDOM_SEED,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)

    # ---- Frame-level metrics (per-frame accuracy) ----
    frame_acc = float(accuracy_score(y_test, y_pred))
    frame_f1 = float(f1_score(y_test, y_pred, average="macro"))
    frame_cm = confusion_matrix(y_test, y_pred).tolist()
    frame_report = classification_report(
        y_test, y_pred, target_names=CLASS_NAMES, output_dict=True, zero_division=0
    )

    print(f"  [frame-level]   accuracy={frame_acc:.4f}  macro_f1={frame_f1:.4f}")
    print(f"  [frame-level]   confusion_matrix: {frame_cm}")

    # ---- Clip-level metrics (production behaviour: average probs across
    # frames of each test clip, then argmax) ----
    test_clips = clip_ids_arr[test_mask]
    clip_truth: Dict[str, int] = {}
    clip_prob_sum: Dict[str, np.ndarray] = {}
    clip_count: Dict[str, int] = {}
    for clip, true_lbl, probs in zip(test_clips, y_test, y_proba):
        clip_truth[clip] = int(true_lbl)
        if clip not in clip_prob_sum:
            clip_prob_sum[clip] = np.zeros_like(probs, dtype=np.float64)
            clip_count[clip] = 0
        clip_prob_sum[clip] += probs
        clip_count[clip] += 1

    clip_y_true = []
    clip_y_pred = []
    for clip, total in clip_prob_sum.items():
        avg = total / clip_count[clip]
        clip_y_true.append(clip_truth[clip])
        clip_y_pred.append(int(np.argmax(avg)))
    clip_y_true_arr = np.asarray(clip_y_true)
    clip_y_pred_arr = np.asarray(clip_y_pred)

    clip_acc = float(accuracy_score(clip_y_true_arr, clip_y_pred_arr))
    clip_f1 = float(f1_score(clip_y_true_arr, clip_y_pred_arr, average="macro"))
    clip_cm = confusion_matrix(clip_y_true_arr, clip_y_pred_arr).tolist()
    clip_report = classification_report(
        clip_y_true_arr,
        clip_y_pred_arr,
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )

    print(
        f"  [clip-level]    accuracy={clip_acc:.4f}  macro_f1={clip_f1:.4f}  "
        f"(n_clips={len(clip_y_true_arr)})"
    )
    print(f"  [clip-level]    confusion_matrix: {clip_cm}")
    print(
        "  [clip-level]    per-class: "
        + ", ".join(
            f"{name}: P={clip_report[name]['precision']:.2f} "
            f"R={clip_report[name]['recall']:.2f} F1={clip_report[name]['f1-score']:.2f}"
            for name in CLASS_NAMES
        )
    )

    return {
        "evaluation": label,
        "train_n_frames": int(train_mask.sum()),
        "test_n_frames": int(test_mask.sum()),
        "test_n_clips": int(len(clip_y_true_arr)),
        "frame_level": {
            "accuracy": round(frame_acc, 4),
            "macro_f1": round(frame_f1, 4),
            "confusion_matrix": frame_cm,
            "per_class": {
                name: {
                    "precision": round(frame_report[name]["precision"], 4),
                    "recall": round(frame_report[name]["recall"], 4),
                    "f1_score": round(frame_report[name]["f1-score"], 4),
                    "support": int(frame_report[name]["support"]),
                }
                for name in CLASS_NAMES
            },
        },
        "clip_level_aggregated": {
            "accuracy": round(clip_acc, 4),
            "macro_f1": round(clip_f1, 4),
            "confusion_matrix": clip_cm,
            "aggregation": "mean of predict_proba over frames per clip, then argmax (matches gate2_inference.py runtime)",
            "per_class": {
                name: {
                    "precision": round(clip_report[name]["precision"], 4),
                    "recall": round(clip_report[name]["recall"], 4),
                    "f1_score": round(clip_report[name]["f1-score"], 4),
                    "support": int(clip_report[name]["support"]),
                }
                for name in CLASS_NAMES
            },
        },
    }


def fit_final_model(
    X: np.ndarray, y: np.ndarray
) -> Tuple[RandomForestClassifier, StandardScaler]:
    """Fit the final model on ALL frames (this is the deployed artifact)."""
    print("\n[FINAL MODEL] fitting on all frames")
    scaler = StandardScaler()
    X_all = scaler.fit_transform(X)
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=RANDOM_SEED,
        class_weight="balanced",
    )
    clf.fit(X_all, y)
    return clf, scaler


# ---------------------------------------------------------------------------
# Save artifacts
# ---------------------------------------------------------------------------


def save_artifacts(
    clf: RandomForestClassifier,
    scaler: StandardScaler,
    metadata: Dict,
) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    CLASS_NAMES_PATH.write_text(json.dumps(CLASS_NAMES, indent=2))
    METADATA_PATH.write_text(json.dumps(metadata, indent=2))
    print(f"\n[SAVED] {MODEL_PATH}")
    print(f"[SAVED] {SCALER_PATH}")
    print(f"[SAVED] {CLASS_NAMES_PATH}")
    print(f"[SAVED] {METADATA_PATH}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    t0 = time.time()
    print(f"[START] training Gate 2 deception model on Real-Life Trial dataset")
    print(f"[DATASET ROOT] {DATASET_ROOT}")
    print(f"[OUTPUT DIR]   {MODEL_DIR}\n")

    X, y, clip_ids, speakers = build_dataset()

    if len(X) == 0:
        raise RuntimeError("No face frames extracted — check dataset paths")

    n_features = int(X.shape[1])
    print(f"[FEATURES] feature_vector_dim={n_features}")

    # Two evaluations
    si_train, si_test = subject_independent_split(speakers, y, test_frac=0.20)
    cl_train, cl_test = clip_stratified_split(clip_ids, y, test_frac=0.20)

    clip_ids_arr = np.asarray(clip_ids)

    eval_subject = train_and_evaluate(
        X, y, clip_ids_arr, si_train, si_test, "subject_independent"
    )
    eval_clip = train_and_evaluate(
        X, y, clip_ids_arr, cl_train, cl_test, "clip_stratified"
    )

    # Final deployed model trained on all frames
    final_clf, final_scaler = fit_final_model(X, y)

    metadata = {
        "model_name": "gate2_deception_model",
        "version": "v2.0.0",
        "model_type": "RandomForest + HOG + Pixel",
        "task": "visual_deception_detection",
        "gate": "gate2",
        "hog_size": list(HOG_SIZE),
        "pixel_size": list(PIXEL_SIZE),
        "feature_vector_dim": n_features,
        "n_estimators": 200,
        "min_samples_leaf": 2,
        "class_weight": "balanced",
        "num_classes": len(CLASS_NAMES),
        "class_names": CLASS_NAMES,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "name": "Real-Life Trial Deception Detection Dataset",
            "version": "1.0 (January 2016)",
            "source": (
                "Perez-Rosas, V., Abouelenien, M., Mihalcea, R., Burzo, M. "
                "(2015). Deception Detection Using Real-Life Trial Data. "
                "ICMI '15, ACM. doi:10.1145/2818346.2820758"
            ),
            "videos_total": 121,
            "videos_deceptive": 61,
            "videos_truthful": 60,
            "unique_speakers": 56,
            "avg_clip_seconds": 28.0,
            "local_path": str(DATASET_ROOT),
            "frames_extracted": int(X.shape[0]),
        },
        "feature_pipeline": {
            "frame_sampling_fps": TARGET_FPS,
            "max_frames_per_clip": MAX_FRAMES,
            "face_detection": "OpenCV Haar cascade (frontalface_default)",
            "hog": {
                "win_size": list(HOG_SIZE),
                "block_size": [16, 16],
                "block_stride": [8, 8],
                "cell_size": [8, 8],
                "nbins": 9,
            },
            "pixel": {"size": list(PIXEL_SIZE), "normalisation": "/255.0"},
            "feature_concat_order": ["hog", "pixel"],
            "scaler": "StandardScaler (fit on training fold)",
        },
        "evaluations": [eval_subject, eval_clip],
        "headline_metric": {
            "name": "subject_independent_clip_level_accuracy",
            "value": eval_subject["clip_level_aggregated"]["accuracy"],
            "rationale": (
                "Clip-level aggregation matches how the deployed system makes "
                "decisions: gate2_inference.py averages predict_proba across "
                "all frames of a clip and returns one label per clip. "
                "Subject-independent split is the honest protocol because the "
                "dataset contains the same speakers in both classes; a "
                "clip-stratified split would let the model recognise the "
                "person rather than the deception cue. Frame-level numbers "
                "are reported alongside for completeness but are not how the "
                "system is used in production."
            ),
        },
        "secondary_metric_clip_stratified": {
            "name": "clip_stratified_clip_level_accuracy",
            "value": eval_clip["clip_level_aggregated"]["accuracy"],
            "note": "Reported for transparency; subject-independent is the headline.",
        },
        "deployment_notes": (
            "Final saved model is fitted on ALL frames so production inference "
            "uses the maximum data. Held-out metrics are reported separately "
            "(see 'evaluations') and are computed from independent splits."
        ),
        "supersedes": "gate2_deception_model v1.0.0 (80-frame in-house set, archived in _backup_pre_realtrial/)",
    }

    save_artifacts(final_clf, final_scaler, metadata)

    elapsed = time.time() - t0
    print(f"\n[DONE] elapsed={elapsed:.1f}s")
    print(
        f"[HEADLINE] subject_independent_CLIP={eval_subject['clip_level_aggregated']['accuracy']:.4f} "
        f"(frame={eval_subject['frame_level']['accuracy']:.4f}) | "
        f"clip_stratified_CLIP={eval_clip['clip_level_aggregated']['accuracy']:.4f} "
        f"(frame={eval_clip['frame_level']['accuracy']:.4f})"
    )


if __name__ == "__main__":
    main()
