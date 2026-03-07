#!/usr/bin/env python3
"""
Train Gate 1 Deception Detection Model (Audio-based).

Trains a classifier to distinguish truthful vs deceptive speech using
prosodic features extracted from audio recordings.

Uses the features CSV produced by prepare_deception_audio.py.

Usage:
    python scripts/train_deception_audio_model.py
    python scripts/train_deception_audio_model.py --data_path data/deception/gate1_audio/deception_audio_features.csv
    python scripts/train_deception_audio_model.py --model_type random_forest

Output:
    models/gate1_deception_model.pkl
    models/gate1_deception_scaler.pkl
    models/gate1_deception_label_encoder.pkl
    models/gate1_deception_metadata.json
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from cloud_data_utils import make_temp_work_dir, prepare_csv_from_cloud

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data" / "deception" / "gate1_audio"
MODELS_DIR = PROJECT_ROOT / "models"

DEFAULT_DATA_PATH = DATA_DIR / "deception_audio_features.csv"

# Prosodic features for deception detection
DECEPTION_AUDIO_FEATURES = [
    "duration_seconds",
    "rms_mean",
    "rms_std",
    "f0_mean",
    "f0_std",
    "f0_range",
    "zcr_mean",
    "spectral_centroid_mean",
    "tempo_proxy",
    "pause_ratio",
    "speech_rate_variation",
    "jitter",
    "shimmer",
    "mfcc_1_mean",
    "mfcc_2_mean",
    "mfcc_3_mean",
    "mfcc_4_mean",
    "mfcc_5_mean",
    "energy_contour_slope",
]

DECEPTION_LABELS = ["truthful", "deceptive"]


def load_dataset(data_path: Path) -> pd.DataFrame:
    """Load and validate the deception audio features dataset."""
    print(f"\n[LOAD] Loading dataset from: {data_path}")

    if not data_path.exists():
        print(f"[ERROR] Dataset not found at {data_path}")
        print("\nPlease run prepare_deception_audio.py first to generate the features CSV.")
        print("See docs/DECEPTION_DATASETS_GUIDE.md for dataset sources.")
        sys.exit(1)

    df = pd.read_csv(data_path)
    print(f"  Loaded {len(df)} samples")

    # Validate columns - use available features
    missing = [f for f in DECEPTION_AUDIO_FEATURES if f not in df.columns]
    if missing:
        print(f"[WARN] Missing feature columns: {missing}")
        print(f"[INFO] Using available features instead")
        
        # Use only available numeric features
        available_features = []
        for col in df.columns:
            if col not in ['label', 'clip_id', 'audio_path', 'transcript', 'decision'] and pd.api.types.is_numeric_dtype(df[col]):
                available_features.append(col)
        
        if len(available_features) < 5:
            print(f"[ERROR] Insufficient features. Found only: {available_features}")
            sys.exit(1)
        
        print(f"[INFO] Using {len(available_features)} available features: {available_features}")
        return df, available_features

    if "label" not in df.columns:
        print("[ERROR] Missing 'label' column")
        sys.exit(1)
    
    return df, DECEPTION_AUDIO_FEATURES

    # Show class distribution
    print("\n[INFO] Class distribution:")
    for label in DECEPTION_LABELS:
        count = (df["label"] == label).sum()
        pct = count / len(df) * 100 if len(df) > 0 else 0
        print(f"  {label}: {count} ({pct:.1f}%)")

    return df


def train_model(
    X_train, y_train, X_test, y_test,
    label_encoder, feature_names, model_type="gradient_boosting"
):
    """Train the deception detection model."""
    print(f"\n[TRAIN] Training {model_type} model...")

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Select model
    if model_type == "logistic_regression":
        model = LogisticRegression(
            max_iter=1000, random_state=42, class_weight="balanced"
        )
    elif model_type == "random_forest":
        model = RandomForestClassifier(
            n_estimators=200, max_depth=15, random_state=42,
            class_weight="balanced", n_jobs=-1,
        )
    elif model_type == "gradient_boosting":
        model = GradientBoostingClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.1,
            random_state=42, subsample=0.8,
        )
    else:
        print(f"[ERROR] Unknown model type: {model_type}")
        sys.exit(1)

    model.fit(X_train_scaled, y_train)

    # Evaluate
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n[RESULT] Test Accuracy: {accuracy:.2%}")

    # Cross-validation
    n_splits = min(5, min(np.bincount(y_train)))
    n_splits = max(2, n_splits)
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=cv, scoring="accuracy")
    print(f"  Cross-Val Accuracy: {cv_scores.mean():.2%} (+/- {cv_scores.std() * 2:.2%})")

    # AUC if binary
    if len(np.unique(y_test)) == 2:
        y_proba = model.predict_proba(X_test_scaled)[:, 1]
        auc = roc_auc_score(y_test, y_proba)
        print(f"  ROC AUC: {auc:.4f}")
    else:
        auc = None

    # Classification report
    target_names = label_encoder.classes_
    unique_labels = np.unique(np.concatenate([y_test, y_pred]))
    present_names = [str(target_names[i]) for i in unique_labels]

    print("\n[RESULT] Classification Report:")
    print(classification_report(y_test, y_pred, target_names=present_names, labels=unique_labels))

    print("[RESULT] Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred, labels=unique_labels)
    print(f"  {present_names}")
    for i, row in enumerate(cm):
        print(f"  {present_names[i]}: {row}")

    # Feature importance
    if hasattr(model, "feature_importances_"):
        print("\n[RESULT] Top Feature Importances:")
        importance = sorted(
            zip(feature_names, model.feature_importances_),
            key=lambda x: x[1], reverse=True,
        )
        for feat, imp in importance[:10]:
            bar = "█" * int(imp * 50)
            print(f"  {feat:30s} {imp:.4f} {bar}")

    return model, scaler, accuracy, cv_scores.mean(), auc


def save_artifacts(
    model, scaler, label_encoder, accuracy, cv_accuracy, auc,
    model_type, data_path, n_samples, feature_names,
):
    """Save model artifacts."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    model_path = MODELS_DIR / "gate1_deception_model.pkl"
    scaler_path = MODELS_DIR / "gate1_deception_scaler.pkl"
    encoder_path = MODELS_DIR / "gate1_deception_label_encoder.pkl"
    metadata_path = MODELS_DIR / "gate1_deception_metadata.json"

    joblib.dump(model, model_path)
    print(f"\n[SAVED] Model: {model_path}")

    joblib.dump(scaler, scaler_path)
    print(f"[SAVED] Scaler: {scaler_path}")

    joblib.dump(label_encoder, encoder_path)
    print(f"[SAVED] Label encoder:  {encoder_path}")

    metadata = {
        "model_name": "gate1_deception_model",
        "version": "v1.0.0",
        "model_type": model_type,
        "task": "audio_deception_detection",
        "gate": "gate1",
        "labels": [int(label) if isinstance(label, (np.integer, np.int64)) else str(label) for label in label_encoder.classes_],
        "features": feature_names,
        "n_features": len(feature_names),
        "n_samples": n_samples,
        "test_accuracy": round(accuracy, 4),
        "cv_accuracy": round(cv_accuracy, 4),
        "roc_auc": round(auc, 4) if auc is not None else None,
        "trained_at": datetime.now().isoformat(),
        "dataset_path": str(data_path),
        "description": (
            "Audio-based deception detection model for cultivator intent analysis. "
            "Classifies speech as truthful or deceptive using prosodic features "
            "(pitch, energy, pauses, jitter, shimmer, MFCCs)."
        ),
    }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[SAVED] Metadata: {metadata_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Train Gate 1 audio deception detection model"
    )
    parser.add_argument(
        "--data_path", type=str, default=str(DEFAULT_DATA_PATH),
        help="Path to deception audio features CSV",
    )
    parser.add_argument(
        "--data_url", type=str, default=None,
        help="Cloud URL to deception audio CSV (overrides --data_path)",
    )
    parser.add_argument(
        "--model_type", type=str, default="gradient_boosting",
        choices=["logistic_regression", "random_forest", "gradient_boosting"],
        help="Model type to train (default: gradient_boosting)",
    )
    parser.add_argument(
        "--test_size", type=float, default=0.2,
        help="Test set fraction (default: 0.2)",
    )
    args = parser.parse_args()

    data_path = Path(args.data_path)
    if args.data_url:
        temp_dir = make_temp_work_dir("gate1_deception_cloud_")
        data_path = prepare_csv_from_cloud(
            args.data_url,
            cache_dir=temp_dir,
            default_name="gate1_deception_audio_features.csv",
        )
        print(f"[CLOUD] Using downloaded dataset: {data_path}")

    # Load data
    df, feature_names = load_dataset(data_path)

    # Prepare features and labels
    X = df[feature_names].values
    
    # Handle different label formats (numeric or text)
    label_values = df["label"].values
    if pd.api.types.is_numeric_dtype(df["label"]):
        # Labels are numeric (0, 1)
        y = label_values.astype(int)
        label_encoder = LabelEncoder()
        label_encoder.classes_ = np.array([0, 1])
        print(f"\n[INFO] Using numeric labels: 0 (truthful), 1 (deceptive)")
    else:
        # Labels are text ('truthful', 'deceptive')
        label_encoder = LabelEncoder()
        label_encoder.fit(DECEPTION_LABELS)
        y = label_encoder.transform(label_values)
        print(f"\n[INFO] Label mapping: {dict(zip(DECEPTION_LABELS, label_encoder.transform(DECEPTION_LABELS)))}")

    print(f"[INFO] Feature matrix: {X.shape}")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    # Train
    model, scaler, accuracy, cv_accuracy, auc = train_model(
        X_train, y_train, X_test, y_test,
        label_encoder, feature_names, model_type=args.model_type,
    )

    # Save
    save_artifacts(
        model, scaler, label_encoder, accuracy, cv_accuracy, auc,
        args.model_type, data_path, len(df), feature_names,
    )

    print(f"\n{'='*60}")
    print(f"[DONE] Gate 1 deception model trained successfully!")
    print(f"  Accuracy: {accuracy:.2%}")
    print(f"  Use in inference by loading models/gate1_deception_model.pkl")


if __name__ == "__main__":
    main()
