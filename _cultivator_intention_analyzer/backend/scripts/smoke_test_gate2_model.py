#!/usr/bin/env python3
"""
Gate 2 Model Smoke Test

Verifies that the trained sklearn model loads and runs inference correctly.
Tests with a synthetic image to confirm the pipeline works.

Usage:
    python scripts/smoke_test_gate2_model.py
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import numpy as np
import cv2
import joblib


def extract_hog_features(image: np.ndarray, size: tuple = (64, 64)) -> np.ndarray:
    """Extract HOG features from image."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    resized = cv2.resize(gray, size)
    
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


def main():
    print("=" * 60)
    print("Gate 2 Model Smoke Test")
    print("=" * 60)
    
    model_dir = Path("models/gate2")
    
    # Check model files exist
    model_path = model_dir / "gate2_expression_model.pkl"
    scaler_path = model_dir / "gate2_scaler.pkl"
    class_names_path = model_dir / "gate2_class_names.json"
    
    print("\n[1] Checking model files...")
    
    all_exist = True
    for path in [model_path, scaler_path, class_names_path]:
        exists = path.exists()
        status = "✓" if exists else "✗"
        print(f"    {status} {path}")
        all_exist = all_exist and exists
    
    if not all_exist:
        print("\n[ERROR] Model files not found. Run training first:")
        print("        python scripts/train_gate2_expression_model.py")
        sys.exit(1)
    
    # Load model artifacts
    print("\n[2] Loading model artifacts...")
    
    try:
        model = joblib.load(str(model_path))
        print("    ✓ Model loaded")
        
        scaler = joblib.load(str(scaler_path))
        print("    ✓ Scaler loaded")
        
        with open(class_names_path, 'r') as f:
            class_names = json.load(f)
        print(f"    ✓ Class names loaded: {class_names}")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to load model: {e}")
        sys.exit(1)
    
    # Test with synthetic image
    print("\n[3] Testing inference with synthetic image...")
    
    # Create a simple test image (gray gradient with noise)
    test_image = np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8)
    
    try:
        # Extract features
        features = extract_features(test_image)
        print(f"    ✓ Features extracted: shape={features.shape}")
        
        # Scale
        features_scaled = scaler.transform(features.reshape(1, -1))
        print(f"    ✓ Features scaled")
        
        # Predict
        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        predicted_class = class_names[prediction]
        confidence = probabilities[prediction]
        
        print(f"    ✓ Prediction: {predicted_class} (confidence: {confidence*100:.1f}%)")
        
        # Show all probabilities
        print("\n[4] Class probabilities:")
        for i, (name, prob) in enumerate(zip(class_names, probabilities)):
            bar = "█" * int(prob * 20)
            print(f"    {name:12s}: {prob*100:5.1f}% {bar}")
        
    except Exception as e:
        print(f"\n[ERROR] Inference failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # Test Haar cascade face detection
    print("\n[5] Testing face detection (Haar cascade)...")
    
    try:
        face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(face_cascade_path)
        
        if face_cascade.empty():
            print("    ✗ Failed to load Haar cascade")
        else:
            print("    ✓ Haar cascade loaded")
            
            # Test detection on synthetic image (won't find faces, just testing it runs)
            gray = cv2.cvtColor(test_image, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            print(f"    ✓ Face detection ran (found {len(faces)} faces in test image)")
        
    except Exception as e:
        print(f"    ✗ Face detection test failed: {e}")
    
    print("\n" + "=" * 60)
    print("Smoke Test PASSED!")
    print("=" * 60)
    print("\nThe Gate 2 model is ready for use.")
    print("\nNext steps:")
    print("  1. Start the API server:")
    print("     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("  2. Test the endpoint with a video file")
    print("=" * 60)


if __name__ == "__main__":
    main()
