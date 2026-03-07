#!/usr/bin/env python3
"""
Train Gate 2 Deception Detection Model (Visual/Frame-based).

Trains a classifier to distinguish truthful vs deceptive facial expressions
using HOG + pixel features extracted from video frames.

Uses the folder-per-class structure produced by prepare_deception_frames.py:
    data/deception/gate2_frames/
    ├── truthful/    (face images)
    └── deceptive/   (face images)

Usage:
    python scripts/train_deception_visual_model.py
    python scripts/train_deception_visual_model.py --data_dir data/deception/gate2_frames
    python scripts/train_deception_visual_model.py --n_estimators 300

Output:
    models/gate2/gate2_deception_model.pkl
    models/gate2/gate2_deception_scaler.pkl
    models/gate2/gate2_deception_class_names.json
    models/gate2/gate2_deception_metadata.json
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import cv2
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from cloud_data_utils import make_temp_work_dir, prepare_image_dir_from_cloud


# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_DATA_DIR = PROJECT_ROOT / "data" / "deception" / "gate2_frames"
OUTPUT_DIR = PROJECT_ROOT / "models" / "gate2"

# Feature extraction configurations (same as gate2_inference.py)
HOG_SIZE = (64, 64)
PIXEL_SIZE = (48, 48)


def extract_hog_features(image: np.ndarray) -> np.ndarray:
    """Extract HOG features from image."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    resized = cv2.resize(gray, HOG_SIZE)

    win_size = HOG_SIZE
    block_size = (16, 16)
    block_stride = (8, 8)
    cell_size = (8, 8)
    nbins = 9

    hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
    features = hog.compute(resized)
    return features.flatten()


def extract_pixel_features(image: np.ndarray) -> np.ndarray:
    """Extract flattened grayscale pixel features."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    resized = cv2.resize(gray, PIXEL_SIZE)
    return resized.flatten().astype(np.float32) / 255.0


def extract_features(image: np.ndarray) -> np.ndarray:
    """Extract combined HOG + pixel features."""
    hog_features = extract_hog_features(image)
    pixel_features = extract_pixel_features(image)
    return np.concatenate([hog_features, pixel_features])


def load_dataset(data_dir: str, max_per_class: int = None):
    """Load dataset from folder-per-class structure."""
    data_path = Path(data_dir)

    class_folders = sorted([d for d in data_path.iterdir() if d.is_dir()])
    if not class_folders:
        print(f"[ERROR] No class folders found in {data_dir}")
        print("Expected structure:")
        print(f"  {data_dir}/truthful/   (face images)")
        print(f"  {data_dir}/deceptive/  (face images)")
        sys.exit(1)

    class_names = [d.name for d in class_folders]
    print(f"[INFO] Found {len(class_names)} classes: {class_names}")

    image_exts = {".jpg", ".jpeg", ".png", ".bmp"}

    X = []
    y = []

    for class_idx, class_name in enumerate(class_names):
        class_folder = data_path / class_name
        images = sorted([
            f for f in class_folder.iterdir()
            if f.suffix.lower() in image_exts
        ])

        if max_per_class:
            images = images[:max_per_class]

        print(f"[INFO] Loading {len(images)} images from {class_name}/")

        loaded = 0
        for img_path in images:
            try:
                img = cv2.imread(str(img_path))
                if img is None:
                    continue

                features = extract_features(img)
                X.append(features)
                y.append(class_idx)
                loaded += 1
            except Exception as e:
                print(f"  [WARN] Failed: {img_path.name}: {e}")
                continue

        print(f"  Loaded {loaded} images")

    X = np.array(X)
    y = np.array(y)

    print(f"\n[INFO] Total samples: {len(X)}")
    if len(X) > 0:
        print(f"[INFO] Feature dimension: {X.shape[1]}")

    return X, y, class_names


def train_model(X_train, y_train, X_val, y_val, n_estimators=200):
    """Train RandomForest classifier for deception detection."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    print(f"\n[TRAIN] Training RandomForest (n_estimators={n_estimators})...")
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=25,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
        verbose=1,
    )

    model.fit(X_train_scaled, y_train)

    train_acc = model.score(X_train_scaled, y_train)
    val_acc = model.score(X_val_scaled, y_val)

    print(f"\n[RESULT] Training accuracy: {train_acc*100:.2f}%")
    print(f"[RESULT] Validation accuracy: {val_acc*100:.2f}%")

    return model, scaler


def evaluate_model(model, scaler, X_val, y_val, class_names):
    """Evaluate model and print metrics."""
    X_val_scaled = scaler.transform(X_val)
    y_pred = model.predict(X_val_scaled)

    accuracy = accuracy_score(y_val, y_pred)

    print("\n[RESULT] Classification Report:")
    report = classification_report(y_val, y_pred, target_names=class_names)
    print(report)

    print("[RESULT] Confusion Matrix:")
    cm = confusion_matrix(y_val, y_pred)
    print(f"  {class_names}")
    for i, row in enumerate(cm):
        print(f"  {class_names[i]}: {row}")

    report_dict = classification_report(
        y_val, y_pred, target_names=class_names, output_dict=True
    )

    return {
        "accuracy": float(accuracy),
        "classification_report": report_dict,
        "confusion_matrix": cm.tolist(),
    }


def save_artifacts(model, scaler, class_names, metrics, data_dir, output_dir):
    """Save model and metadata."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    model_path = output_path / "gate2_deception_model.pkl"
    joblib.dump(model, str(model_path))
    print(f"\n[SAVED] Model: {model_path}")

    scaler_path = output_path / "gate2_deception_scaler.pkl"
    joblib.dump(scaler, str(scaler_path))
    print(f"[SAVED] Scaler: {scaler_path}")

    class_names_path = output_path / "gate2_deception_class_names.json"
    with open(class_names_path, "w") as f:
        json.dump(class_names, f, indent=2)
    print(f"[SAVED] Class names: {class_names_path}")

    metadata = {
        "model_name": "gate2_deception_model",
        "version": "v1.0.0",
        "model_type": "RandomForest + HOG + Pixel",
        "task": "visual_deception_detection",
        "gate": "gate2",
        "hog_size": list(HOG_SIZE),
        "pixel_size": list(PIXEL_SIZE),
        "num_classes": len(class_names),
        "class_names": class_names,
        "training_date": datetime.now().isoformat(),
        "dataset_path": str(data_dir),
        "metrics": {
            "accuracy": metrics["accuracy"],
            "per_class": {
                name: {
                    "precision": metrics["classification_report"][name]["precision"],
                    "recall": metrics["classification_report"][name]["recall"],
                    "f1_score": metrics["classification_report"][name]["f1-score"],
                    "support": int(metrics["classification_report"][name]["support"]),
                }
                for name in class_names
            },
        },
        "description": (
            "Visual deception detection model for cultivator intent analysis (Gate 2). "
            "Classifies facial frames as truthful or deceptive using HOG + pixel features."
        ),
    }

    metadata_path = output_path / "gate2_deception_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[SAVED] Metadata: {metadata_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Train Gate 2 visual deception detection model"
    )
    parser.add_argument(
        "--data_dir", type=str, default=str(DEFAULT_DATA_DIR),
        help="Path to frame dataset (folder-per-class)",
    )
    parser.add_argument(
        "--data_url", type=str, default=None,
        help="Cloud URL to ZIP frame dataset (overrides --data_dir)",
    )
    parser.add_argument(
        "--output_dir", type=str, default=str(OUTPUT_DIR),
        help="Output directory for model artifacts",
    )
    parser.add_argument(
        "--n_estimators", type=int, default=200,
        help="Number of trees in RandomForest (default: 200)",
    )
    parser.add_argument(
        "--max_per_class", type=int, default=None,
        help="Max images per class (for quick testing)",
    )
    parser.add_argument(
        "--test_size", type=float, default=0.2,
        help="Validation set fraction (default: 0.2)",
    )
    args = parser.parse_args()

    data_dir = args.data_dir
    if args.data_url:
        temp_dir = make_temp_work_dir("gate2_deception_cloud_")
        extracted_dir = temp_dir / "extracted"
        prepare_image_dir_from_cloud(
            args.data_url,
            cache_dir=temp_dir,
            extract_dir=extracted_dir,
            default_name="gate2_deception_frames.zip",
        )
        candidate_dirs = [d for d in extracted_dir.iterdir() if d.is_dir()]
        if len(candidate_dirs) == 1:
            data_dir = str(candidate_dirs[0])
        else:
            data_dir = str(extracted_dir)
        print(f"[CLOUD] Using extracted dataset directory: {data_dir}")

    # Load dataset
    X, y, class_names = load_dataset(data_dir, max_per_class=args.max_per_class)

    if len(X) < 10:
        print(f"[ERROR] Too few samples ({len(X)}). Need at least 10.")
        print("Run prepare_deception_frames.py first to extract frames.")
        sys.exit(1)

    # Split
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=args.test_size, random_state=42, stratify=y
    )
    print(f"\n[INFO] Train: {len(X_train)}, Validation: {len(X_val)}")

    # Train
    model, scaler = train_model(
        X_train, y_train, X_val, y_val, n_estimators=args.n_estimators
    )

    # Evaluate
    metrics = evaluate_model(model, scaler, X_val, y_val, class_names)

    # Save
    save_artifacts(model, scaler, class_names, metrics, data_dir, args.output_dir)

    print(f"\n{'='*60}")
    print(f"[DONE] Gate 2 deception model trained!")
    print(f"  Accuracy: {metrics['accuracy']*100:.2f}%")
    print(f"  Model: {args.output_dir}/gate2_deception_model.pkl")


if __name__ == "__main__":
    main()
