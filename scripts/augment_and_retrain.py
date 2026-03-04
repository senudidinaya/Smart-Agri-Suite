#!/usr/bin/env python3
"""
Augment the training dataset with synthetic VERIFY and REJECT samples,
then retrain the intent risk model with all 3 classes.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"

INPUT_PATH = DATA_DIR / "labeled_call_features.csv"
OUTPUT_PATH = DATA_DIR / "labeled_call_features.csv"  # Overwrite

np.random.seed(42)

AUDIO_FEATURES = [
    "duration_seconds", "rms_mean", "rms_std", "f0_mean", "f0_std",
    "zcr_mean", "spectral_centroid_mean", "tempo_proxy",
]
TEXT_FEATURES = [
    "transcript_char_len", "transcript_word_count",
    "urgency_count", "money_count", "secrecy_count",
    "pressure_count", "id_avoidance_count", "otp_pin_count",
]


def generate_reject_samples(n: int = 200) -> pd.DataFrame:
    """
    Generate synthetic REJECT samples.
    
    REJECT profile: High red flags - fraudulent calls with
    suspicious keywords (OTP, secrecy, pressure, ID avoidance).
    """
    rows = []
    for i in range(n):
        row = {
            "clip_id": f"synthetic_reject_{i:04d}",
            "audio_path": "",
            "transcript": "",
            # Audio features - varied but realistic
            "duration_seconds": np.random.uniform(3.0, 5.0),
            "rms_mean": np.random.uniform(0.015, 0.070),
            "rms_std": np.random.uniform(0.010, 0.045),
            "f0_mean": np.random.uniform(50, 1500),
            "f0_std": np.random.uniform(20, 600),
            "zcr_mean": np.random.uniform(0.12, 0.30),
            "spectral_centroid_mean": np.random.uniform(1400, 2600),
            "tempo_proxy": np.random.uniform(80, 180),
            # Text features - HIGH red flags
            "transcript_char_len": np.random.randint(20, 150),
            "transcript_word_count": np.random.randint(5, 20),
            "urgency_count": np.random.choice([1, 2, 3], p=[0.3, 0.4, 0.3]),
            "money_count": np.random.choice([1, 2, 3], p=[0.4, 0.35, 0.25]),
            "secrecy_count": np.random.choice([1, 2, 3], p=[0.3, 0.4, 0.3]),
            "pressure_count": np.random.choice([1, 2, 3], p=[0.35, 0.4, 0.25]),
            "id_avoidance_count": np.random.choice([0, 1, 2], p=[0.2, 0.4, 0.4]),
            "otp_pin_count": np.random.choice([0, 1, 2], p=[0.2, 0.3, 0.5]),
            "decision": "REJECT",
        }
        rows.append(row)
    return pd.DataFrame(rows)


def generate_verify_samples(n: int = 200) -> pd.DataFrame:
    """
    Generate synthetic VERIFY samples.
    
    VERIFY profile: Moderate red flags - ambiguous calls that need
    human review. Some suspicious keywords but not overwhelming.
    """
    rows = []
    for i in range(n):
        row = {
            "clip_id": f"synthetic_verify_{i:04d}",
            "audio_path": "",
            "transcript": "",
            # Audio features - varied
            "duration_seconds": np.random.uniform(2.5, 5.0),
            "rms_mean": np.random.uniform(0.010, 0.060),
            "rms_std": np.random.uniform(0.005, 0.040),
            "f0_mean": np.random.uniform(50, 1200),
            "f0_std": np.random.uniform(10, 500),
            "zcr_mean": np.random.uniform(0.12, 0.30),
            "spectral_centroid_mean": np.random.uniform(1400, 2600),
            "tempo_proxy": np.random.uniform(80, 180),
            # Text features - MODERATE red flags
            "transcript_char_len": np.random.randint(15, 120),
            "transcript_word_count": np.random.randint(3, 18),
            "urgency_count": np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2]),
            "money_count": np.random.choice([0, 1], p=[0.5, 0.5]),
            "secrecy_count": np.random.choice([0, 1], p=[0.6, 0.4]),
            "pressure_count": np.random.choice([0, 1], p=[0.5, 0.5]),
            "id_avoidance_count": np.random.choice([0, 1], p=[0.7, 0.3]),
            "otp_pin_count": np.random.choice([0, 1], p=[0.8, 0.2]),
            "decision": "VERIFY",
        }
        rows.append(row)
    return pd.DataFrame(rows)


def generate_more_proceed_samples(n: int = 100) -> pd.DataFrame:
    """
    Generate additional PROCEED samples to balance a bit more.
    
    PROCEED profile: Low/zero red flags - legitimate calls.
    """
    rows = []
    for i in range(n):
        row = {
            "clip_id": f"synthetic_proceed_{i:04d}",
            "audio_path": "",
            "transcript": "",
            "duration_seconds": np.random.uniform(3.0, 5.0),
            "rms_mean": np.random.uniform(0.005, 0.070),
            "rms_std": np.random.uniform(0.003, 0.045),
            "f0_mean": np.random.uniform(0, 1800),
            "f0_std": np.random.uniform(0, 700),
            "zcr_mean": np.random.uniform(0.12, 0.30),
            "spectral_centroid_mean": np.random.uniform(1400, 2600),
            "tempo_proxy": np.random.uniform(80, 180),
            # Text features - LOW/zero red flags
            "transcript_char_len": np.random.randint(0, 120),
            "transcript_word_count": np.random.randint(0, 20),
            "urgency_count": np.random.choice([0, 1], p=[0.9, 0.1]),
            "money_count": np.random.choice([0, 1], p=[0.95, 0.05]),
            "secrecy_count": 0,
            "pressure_count": np.random.choice([0, 1], p=[0.95, 0.05]),
            "id_avoidance_count": 0,
            "otp_pin_count": 0,
            "decision": "PROCEED",
        }
        rows.append(row)
    return pd.DataFrame(rows)


def main():
    print("=" * 60)
    print("Augmenting Dataset & Retraining Model")
    print("=" * 60)
    
    # Load existing data
    df = pd.read_csv(INPUT_PATH)
    print(f"\nOriginal dataset: {len(df)} samples")
    print(f"  Class distribution: {df['decision'].value_counts().to_dict()}")
    
    # Generate synthetic samples
    reject_samples = generate_reject_samples(200)
    verify_samples = generate_verify_samples(200)
    proceed_samples = generate_more_proceed_samples(100)
    
    # Combine
    df_augmented = pd.concat([df, reject_samples, verify_samples, proceed_samples], ignore_index=True)
    
    print(f"\nAugmented dataset: {len(df_augmented)} samples")
    print(f"  Class distribution: {df_augmented['decision'].value_counts().to_dict()}")
    
    # Save augmented dataset
    df_augmented.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved augmented dataset to: {OUTPUT_PATH}")
    
    # Now retrain the model
    print("\n" + "=" * 60)
    print("Retraining Model...")
    print("=" * 60)
    
    # Import training functions
    sys.path.insert(0, str(SCRIPT_DIR))
    from train_intent_risk_model import prepare_features, train_model, save_model
    
    X, y, label_encoder = prepare_features(df_augmented)
    model, scaler, accuracy, cv_accuracy = train_model(X, y)
    
    save_model(
        model=model,
        scaler=scaler,
        label_encoder=label_encoder,
        accuracy=accuracy,
        cv_accuracy=cv_accuracy,
        model_type="logistic_regression",
        data_path=str(INPUT_PATH),
        n_samples=len(df_augmented),
    )
    
    # Quick verification
    print("\n" + "=" * 60)
    print("Verification")
    print("=" * 60)
    
    import joblib
    loaded_model = joblib.load(MODELS_DIR / "intent_risk_model.pkl")
    loaded_encoder = joblib.load(MODELS_DIR / "intent_risk_label_encoder.pkl")
    print(f"  Model classes: {loaded_model.classes_}")
    print(f"  Label encoder classes: {loaded_encoder.classes_}")
    print(f"  Decoded classes: {loaded_encoder.inverse_transform(loaded_model.classes_)}")
    print("\n✓ Model retrained with PROCEED/VERIFY/REJECT support!")


if __name__ == "__main__":
    main()
