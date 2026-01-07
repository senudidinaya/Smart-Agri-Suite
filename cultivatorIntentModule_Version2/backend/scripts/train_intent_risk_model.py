#!/usr/bin/env python3
"""
Offline Training Script for Intent Risk Classification Model.

Smart Agri-Suite - Cultivator Intent Module V2

This script trains a simple ML model for predicting buyer intent risk
based on prosodic and text features extracted from call recordings.

Usage:
    python scripts/train_intent_risk_model.py

    # With custom data path
    python scripts/train_intent_risk_model.py --data-path data/my_dataset.csv

    # With different model type
    python scripts/train_intent_risk_model.py --model-type random_forest

Output:
    - models/intent_risk_model.pkl     (trained model)
    - models/intent_risk_scaler.pkl    (feature scaler)
    - models/model_metadata.json       (training metadata)
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler


# Project paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"

# Default dataset path
DEFAULT_DATA_PATH = DATA_DIR / "labeled_call_features.csv"

# Feature columns (must match dataset format from generate_call_features_dataset.py)
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

# Decision labels
DECISION_LABELS = ["PROCEED", "VERIFY", "REJECT"]


def load_dataset(data_path: Path) -> pd.DataFrame:
    """Load and validate the training dataset."""
    print(f"\n📂 Loading dataset from: {data_path}")
    
    if not data_path.exists():
        print(f"❌ Error: Dataset not found at {data_path}")
        print("\nPlease create a labeled dataset following the format in:")
        print("  data/DATASET_FORMAT.md")
        sys.exit(1)
    
    df = pd.read_csv(data_path)
    print(f"   Loaded {len(df)} samples")
    
    # Validate required columns
    missing_features = [f for f in ALL_FEATURES if f not in df.columns]
    if missing_features:
        print(f"❌ Error: Missing feature columns: {missing_features}")
        sys.exit(1)
    
    if "decision" not in df.columns:
        print("❌ Error: Missing 'decision' column (target variable)")
        sys.exit(1)
    
    # Validate decision labels
    invalid_labels = set(df["decision"].unique()) - set(DECISION_LABELS)
    if invalid_labels:
        print(f"⚠️  Warning: Unknown decision labels found: {invalid_labels}")
        print(f"   Expected labels: {DECISION_LABELS}")
    
    return df


def prepare_features(df: pd.DataFrame) -> tuple:
    """Prepare features and labels for training."""
    print("\n🔧 Preparing features...")
    
    # Extract feature matrix
    X = df[ALL_FEATURES].values
    print(f"   Feature shape: {X.shape}")
    
    # Encode labels
    label_encoder = LabelEncoder()
    label_encoder.fit(DECISION_LABELS)  # Ensure consistent encoding
    y = label_encoder.transform(df["decision"].values)
    print(f"   Label mapping: {dict(zip(DECISION_LABELS, label_encoder.transform(DECISION_LABELS)))}")
    
    # Check class distribution
    print("\n📊 Class distribution:")
    for label in DECISION_LABELS:
        count = (df["decision"] == label).sum()
        pct = count / len(df) * 100
        print(f"   {label}: {count} samples ({pct:.1f}%)")
    
    return X, y, label_encoder


def train_model(
    X: np.ndarray,
    y: np.ndarray,
    model_type: str = "logistic_regression",
    test_size: float = 0.2,
    random_state: int = 42,
) -> tuple:
    """Train the intent risk classification model."""
    print(f"\n🤖 Training {model_type.replace('_', ' ').title()} model...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Create model
    if model_type == "logistic_regression":
        model = LogisticRegression(
            max_iter=1000,
            random_state=random_state,
            class_weight="balanced",  # Handle imbalanced classes
        )
    elif model_type == "random_forest":
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=random_state,
            class_weight="balanced",
        )
    else:
        print(f"❌ Error: Unknown model type: {model_type}")
        sys.exit(1)
    
    # Train
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n📈 Model Performance:")
    print(f"   Test Accuracy: {accuracy:.2%}")
    
    # Cross-validation (with fewer folds if limited samples)
    n_folds = min(5, min((y_train == c).sum() for c in np.unique(y_train)))
    n_folds = max(2, n_folds)  # At least 2 folds
    cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=n_folds)
    print(f"   Cross-Val Accuracy: {cv_scores.mean():.2%} (+/- {cv_scores.std() * 2:.2%})")
    
    # Get unique labels present in test set
    unique_labels = np.unique(np.concatenate([y_test, y_pred]))
    present_labels = [DECISION_LABELS[i] for i in unique_labels if i < len(DECISION_LABELS)]
    
    # Classification report
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=present_labels, labels=unique_labels))
    
    # Confusion matrix
    print("🔲 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred, labels=unique_labels)
    print(f"   {present_labels}")
    for i, row in enumerate(cm):
        print(f"   {present_labels[i]}: {row}")
    
    # Feature importance (for tree-based models)
    if hasattr(model, "feature_importances_"):
        print("\n🎯 Feature Importance:")
        importance = list(zip(ALL_FEATURES, model.feature_importances_))
        importance.sort(key=lambda x: x[1], reverse=True)
        for feat, imp in importance[:10]:
            print(f"   {feat}: {imp:.4f}")
    
    return model, scaler, accuracy, cv_scores.mean()


def save_model(
    model,
    scaler: StandardScaler,
    label_encoder: LabelEncoder,
    accuracy: float,
    cv_accuracy: float,
    model_type: str,
    data_path: str,
    n_samples: int,
) -> None:
    """Save trained model and metadata."""
    print(f"\n💾 Saving model to: {MODELS_DIR}")
    
    # Ensure models directory exists
    MODELS_DIR.mkdir(exist_ok=True)
    
    # Save model
    model_path = MODELS_DIR / "intent_risk_model.pkl"
    joblib.dump(model, model_path)
    print(f"   ✓ Model saved: {model_path.name}")
    
    # Save scaler
    scaler_path = MODELS_DIR / "intent_risk_scaler.pkl"
    joblib.dump(scaler, scaler_path)
    print(f"   ✓ Scaler saved: {scaler_path.name}")
    
    # Save label encoder
    encoder_path = MODELS_DIR / "intent_risk_label_encoder.pkl"
    joblib.dump(label_encoder, encoder_path)
    print(f"   ✓ Label encoder saved: {encoder_path.name}")
    
    # Save metadata
    metadata = {
        "model_type": model_type,
        "feature_names": ALL_FEATURES,
        "audio_features": AUDIO_FEATURES,
        "text_features": TEXT_FEATURES,
        "decision_labels": DECISION_LABELS,
        "training_samples": n_samples,
        "test_accuracy": round(accuracy, 4),
        "cv_accuracy": round(cv_accuracy, 4),
        "data_path": str(data_path),
        "trained_at": datetime.now().isoformat(),
        "version": "2.0.0",
    }
    
    metadata_path = MODELS_DIR / "model_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"   ✓ Metadata saved: {metadata_path.name}")


def main():
    """Main training pipeline."""
    parser = argparse.ArgumentParser(
        description="Train Intent Risk Classification Model"
    )
    parser.add_argument(
        "--data-path",
        type=Path,
        default=DEFAULT_DATA_PATH,
        help="Path to labeled training data CSV",
    )
    parser.add_argument(
        "--model-type",
        choices=["logistic_regression", "random_forest"],
        default="logistic_regression",
        help="Type of model to train (default: logistic_regression)",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fraction of data for testing (default: 0.2)",
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🌾 Smart Agri-Suite - Intent Risk Model Training")
    print("=" * 60)
    
    # Load data
    df = load_dataset(args.data_path)
    
    # Prepare features
    X, y, label_encoder = prepare_features(df)
    
    # Train model
    model, scaler, accuracy, cv_accuracy = train_model(
        X, y,
        model_type=args.model_type,
        test_size=args.test_size,
    )
    
    # Save model
    save_model(
        model=model,
        scaler=scaler,
        label_encoder=label_encoder,
        accuracy=accuracy,
        cv_accuracy=cv_accuracy,
        model_type=args.model_type,
        data_path=str(args.data_path),
        n_samples=len(df),
    )
    
    print("\n" + "=" * 60)
    print("✅ Training complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Add more labeled data for better accuracy")
    print("  2. Restart the backend to load the new model")
    print("  3. Test predictions via the API")
    print()


if __name__ == "__main__":
    main()
