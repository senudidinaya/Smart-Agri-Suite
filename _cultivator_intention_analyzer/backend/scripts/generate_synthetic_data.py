#!/usr/bin/env python3
"""
Generate Synthetic Training Data for Gate 2

Creates synthetic face images with varying brightness/textures for each emotion class.
This is for TESTING the pipeline only - use real facial expression datasets for production.

For production, download:
- FER2013 (Kaggle): https://www.kaggle.com/datasets/msambare/fer2013
- AffectNet: https://www.affectnet.net/
- CK+ (Extended Cohn-Kanade): http://www.pitt.edu/~emotion/ck-spread.htm
- IEEE DataPort "Facial Expression Dataset (Sri Lankan)"

Usage:
    python scripts/generate_synthetic_data.py --output_dir data/gate2/dataset --samples_per_class 50
"""

import argparse
import os
from pathlib import Path

import cv2
import numpy as np


# Emotion classes matching typical facial expression datasets
EMOTION_CLASSES = ['angry', 'fear', 'happy', 'neutral', 'sad', 'surprise']


def generate_synthetic_face(emotion_idx: int, size: int = 128) -> np.ndarray:
    """
    Generate a synthetic face-like image.
    Different emotions have different visual characteristics.
    
    This is purely for testing the ML pipeline - NOT for actual training.
    """
    # Base image with noise (vectorized)
    base = 100 + emotion_idx * 15
    img = np.random.randint(max(0, base - 30), min(255, base + 30), (size, size, 3), dtype=np.uint8)
    
    # Add "face" oval
    center = (size // 2, size // 2)
    axes = (size // 3, size // 2 - 10)
    face_color = (180 + emotion_idx * 10, 160 + emotion_idx * 8, 140 + emotion_idx * 5)
    cv2.ellipse(img, center, axes, 0, 0, 360, face_color, -1)
    
    # Add "eyes" (position varies by emotion)
    eye_y = size // 3 + emotion_idx * 2 - 6
    left_eye = (size // 3, eye_y)
    right_eye = (2 * size // 3, eye_y)
    eye_color = (50, 50, 50)
    eye_size = 8 + emotion_idx % 3
    cv2.circle(img, left_eye, eye_size, eye_color, -1)
    cv2.circle(img, right_eye, eye_size, eye_color, -1)
    
    # Add "mouth" (shape varies by emotion)
    mouth_y = 2 * size // 3 + emotion_idx * 2 - 5
    mouth_center = (size // 2, mouth_y)
    
    if emotion_idx == 2:  # happy - curved up
        cv2.ellipse(img, mouth_center, (20, 10), 0, 0, 180, (80, 50, 50), 2)
    elif emotion_idx == 4:  # sad - curved down
        cv2.ellipse(img, (size // 2, mouth_y + 15), (20, 10), 0, 180, 360, (80, 50, 50), 2)
    elif emotion_idx == 5:  # surprise - open
        cv2.ellipse(img, mouth_center, (15, 12), 0, 0, 360, (80, 50, 50), -1)
    else:  # neutral, angry, fear - line or small shape
        width = 25 - emotion_idx * 3
        cv2.line(img, (size // 2 - width, mouth_y), (size // 2 + width, mouth_y), (80, 50, 50), 2)
    
    # Add noise for realism
    noise = np.random.randint(-15, 15, img.shape, dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Apply slight blur
    img = cv2.GaussianBlur(img, (3, 3), 0)
    
    return img


def generate_dataset(output_dir: str, samples_per_class: int = 50):
    """Generate synthetic dataset."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("Generating Synthetic Facial Expression Dataset")
    print("=" * 60)
    print(f"Output: {output_path}")
    print(f"Classes: {EMOTION_CLASSES}")
    print(f"Samples per class: {samples_per_class}")
    print("=" * 60)
    print()
    print("WARNING: This is synthetic data for TESTING ONLY!")
    print("For production, use real facial expression datasets.")
    print()
    
    total = 0
    for idx, emotion in enumerate(EMOTION_CLASSES):
        class_dir = output_path / emotion
        class_dir.mkdir(exist_ok=True)
        
        print(f"Generating {emotion}/...")
        
        for i in range(samples_per_class):
            # Generate with slight variations
            np.random.seed(idx * 10000 + i)  # Reproducible but varied
            img = generate_synthetic_face(idx)
            
            # Random augmentations
            if np.random.random() > 0.5:
                img = cv2.flip(img, 1)  # Horizontal flip
            
            # Random brightness
            brightness = np.random.randint(-20, 20)
            img = np.clip(img.astype(np.int16) + brightness, 0, 255).astype(np.uint8)
            
            # Save
            filename = f"{emotion}_{i:04d}.jpg"
            cv2.imwrite(str(class_dir / filename), img)
            total += 1
        
        print(f"  Created {samples_per_class} images")
    
    print()
    print("=" * 60)
    print(f"Generated {total} total images")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Train model: python scripts/train_gate2_expression_model.py")
    print("  2. Smoke test: python scripts/smoke_test_gate2_model.py")
    print()
    print("For better accuracy, replace with real dataset:")
    print("  - FER2013: kaggle.com/datasets/msambare/fer2013")
    print("  - AffectNet: affectnet.net")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic training data")
    parser.add_argument('--output_dir', type=str, default='data/gate2/dataset',
                        help='Output directory for dataset')
    parser.add_argument('--samples_per_class', type=int, default=50,
                        help='Number of samples per emotion class')
    
    args = parser.parse_args()
    generate_dataset(args.output_dir, args.samples_per_class)


if __name__ == "__main__":
    main()
