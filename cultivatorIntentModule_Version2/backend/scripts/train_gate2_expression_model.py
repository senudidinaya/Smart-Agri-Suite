#!/usr/bin/env python3
"""
Gate 2 Facial Expression Training Script (scikit-learn version)

Trains an emotion classifier using HOG features + RandomForest.
Uses the IEEE DataPort "Facial Expression Dataset (Sri Lankan)" dataset.

This version uses traditional ML instead of deep learning for better compatibility.

Dataset structure expected:
    data/gate2/dataset/
    ├── angry/
    ├── fear/
    ├── happy/
    ├── neutral/
    ├── sad/
    └── surprise/

Usage:
    python scripts/train_gate2_expression_model.py --data_dir "data/gate2/dataset"

Outputs:
    models/gate2/gate2_expression_model.pkl
    models/gate2/gate2_scaler.pkl
    models/gate2/gate2_class_names.json
    models/gate2/gate2_model_metadata.json
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib


def extract_hog_features(image: np.ndarray, size: tuple = (64, 64)) -> np.ndarray:
    """Extract HOG (Histogram of Oriented Gradients) features from image."""
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Resize
    resized = cv2.resize(gray, size)
    
    # HOG parameters
    win_size = size
    block_size = (16, 16)
    block_stride = (8, 8)
    cell_size = (8, 8)
    nbins = 9
    
    hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
    features = hog.compute(resized)
    
    return features.flatten()


def extract_pixel_features(image: np.ndarray, size: tuple = (48, 48)) -> np.ndarray:
    """Extract flattened grayscale pixel features."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    resized = cv2.resize(gray, size)
    return resized.flatten().astype(np.float32) / 255.0


def extract_features(image: np.ndarray) -> np.ndarray:
    """Extract combined features from image."""
    hog_features = extract_hog_features(image)
    pixel_features = extract_pixel_features(image)
    return np.concatenate([hog_features, pixel_features])


def load_dataset(data_dir: str, max_per_class: int = None):
    """Load dataset from folder-per-class structure."""
    data_path = Path(data_dir)
    
    # Find class folders
    class_folders = [d for d in data_path.iterdir() if d.is_dir()]
    
    if not class_folders:
        raise ValueError(f"No class folders found in {data_dir}")
    
    class_names = sorted([d.name for d in class_folders])
    print(f"[INFO] Found {len(class_names)} classes: {class_names}")
    
    X = []
    y = []
    
    image_exts = {'.jpg', '.jpeg', '.png', '.bmp', '.gif'}
    
    for class_idx, class_name in enumerate(class_names):
        class_folder = data_path / class_name
        images = [f for f in class_folder.iterdir() 
                  if f.suffix.lower() in image_exts]
        
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
                print(f"[WARN] Failed to process {img_path.name}: {e}")
                continue
        
        print(f"       Loaded {loaded} images")
    
    X = np.array(X)
    y = np.array(y)
    
    print(f"\n[INFO] Total samples: {len(X)}")
    print(f"[INFO] Feature dimension: {X.shape[1]}")
    
    return X, y, class_names


def train_model(X_train, y_train, X_val, y_val):
    """Train RandomForest classifier."""
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    
    print("\n[INFO] Training RandomForest classifier...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=25,
        min_samples_split=5,
        min_samples_leaf=2,
        n_jobs=-1,
        random_state=42,
        verbose=1
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
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
    
    print("\n[RESULT] Confusion Matrix:")
    cm = confusion_matrix(y_val, y_pred)
    print(cm)
    
    report_dict = classification_report(y_val, y_pred, target_names=class_names, output_dict=True)
    
    return {
        'accuracy': float(accuracy),
        'classification_report': report_dict,
        'confusion_matrix': cm.tolist()
    }


def save_model_artifacts(model, scaler, class_names, metrics, data_dir, output_dir):
    """Save model and metadata."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Save model
    model_path = output_path / "gate2_expression_model.pkl"
    joblib.dump(model, str(model_path))
    print(f"\n[SAVED] Model: {model_path}")
    
    # Save scaler
    scaler_path = output_path / "gate2_scaler.pkl"
    joblib.dump(scaler, str(scaler_path))
    print(f"[SAVED] Scaler: {scaler_path}")
    
    # Save class names
    class_names_path = output_path / "gate2_class_names.json"
    with open(class_names_path, 'w') as f:
        json.dump(class_names, f, indent=2)
    print(f"[SAVED] Class names: {class_names_path}")
    
    # Save metadata
    metadata = {
        'model_name': 'gate2_expression_model',
        'version': 'v1.0.0',
        'model_type': 'RandomForest + HOG',
        'feature_size': 64,
        'num_classes': len(class_names),
        'class_names': class_names,
        'training_date': datetime.now().isoformat(),
        'dataset_path': data_dir,
        'metrics': {
            'accuracy': metrics['accuracy'],
            'per_class': {
                name: {
                    'precision': metrics['classification_report'][name]['precision'],
                    'recall': metrics['classification_report'][name]['recall'],
                    'f1_score': metrics['classification_report'][name]['f1-score'],
                    'support': int(metrics['classification_report'][name]['support']),
                }
                for name in class_names
            }
        }
    }
    
    metadata_path = output_path / "gate2_model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[SAVED] Metadata: {metadata_path}")


def main():
    parser = argparse.ArgumentParser(description="Train Gate 2 expression classifier")
    parser.add_argument('--data_dir', type=str, default='data/gate2/dataset',
                        help='Path to dataset directory')
    parser.add_argument('--output_dir', type=str, default='models/gate2',
                        help='Output directory for model artifacts')
    parser.add_argument('--max_per_class', type=int, default=None,
                        help='Maximum samples per class (for quick testing)')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Gate 2 Facial Expression Model Training")
    print("(scikit-learn version with HOG features)")
    print("=" * 60)
    print(f"Dataset: {args.data_dir}")
    print(f"Output: {args.output_dir}")
    print("=" * 60)
    
    # Validate data directory
    data_path = Path(args.data_dir)
    if not data_path.exists():
        print(f"[ERROR] Dataset directory not found: {args.data_dir}")
        print("\nPlease provide the dataset path:")
        print("  1. Download 'Facial Expression Dataset (Sri Lankan)' from IEEE DataPort")
        print("  2. Extract to data/gate2/dataset/")
        print("  3. Ensure folder-per-class structure (e.g., angry/, happy/, fear/)")
        sys.exit(1)
    
    # Load dataset
    X, y, class_names = load_dataset(args.data_dir, args.max_per_class)
    
    if len(X) == 0:
        print("[ERROR] No images found in dataset")
        sys.exit(1)
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\n[INFO] Training samples: {len(X_train)}")
    print(f"[INFO] Validation samples: {len(X_val)}")
    
    # Train
    model, scaler = train_model(X_train, y_train, X_val, y_val)
    
    # Evaluate
    metrics = evaluate_model(model, scaler, X_val, y_val, class_names)
    
    # Save
    save_model_artifacts(model, scaler, class_names, metrics, args.data_dir, args.output_dir)
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print(f"Final Accuracy: {metrics['accuracy']*100:.2f}%")
    print(f"Model saved to: {args.output_dir}/")
    print("\nNext steps:")
    print("  1. Run smoke test: python scripts/smoke_test_gate2_model.py")
    print("  2. Start API: uvicorn app.main:app --reload")
    print("=" * 60)


if __name__ == "__main__":
    main()
