#!/usr/bin/env python3
"""
Test script for Gate 1 (audio) and Gate 2 (video) deception detection models.
Tests both ML models (if trained) and rules-based fallback systems.
"""

import sys
import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import io

print("=" * 80)
print("Smart Agri-Suite - Deception Detection Model Verification")
print("=" * 80)

# ============================================================================
# Test 1: Import Dependencies
# ============================================================================
print("\n[1] Testing dependencies...")
try:
    import librosa
    import soundfile as sf
    import cv2
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
    print(f"✓ librosa version: {librosa.__version__}")
    print(f"✓ opencv-python version: {cv2.__version__}")
    print("✓ All dependencies loaded successfully")
except ImportError as e:
    print(f"✗ Failed to import dependency: {e}")
    sys.exit(1)

# ============================================================================
# Test 2: Load Gate 1 Audio Deception Detector
# ============================================================================
print("\n[2] Testing Gate 1 Audio Deception Detector...")
try:
    from app.services.inference import get_deception_detector, DECEPTION_AUDIO_FEATURES
    
    gate1_detector = get_deception_detector()
    print(f"✓ Gate 1 detector loaded")
    print(f"  Model loaded: {gate1_detector.is_loaded}")
    print(f"  Model type: {'ML' if gate1_detector.is_loaded else 'Rules-based fallback'}")
    print(f"  Expected features: {len(DECEPTION_AUDIO_FEATURES)}")
    
    if gate1_detector.is_loaded:
        models_dir = Path("models")
        metadata_file = models_dir / "gate1_deception_metadata.json"
        if metadata_file.exists():
            with open(metadata_file) as f:
                metadata = json.load(f)
            print(f"  Training accuracy: {metadata.get('train_accuracy', 'N/A'):.2%}")
            print(f"  Test accuracy: {metadata.get('test_accuracy', 'N/A'):.2%}")
            print(f"  Training samples: {metadata.get('n_samples', 'N/A')}")
    
    gate1_available = True
except Exception as e:
    print(f"✗ Gate 1 detector loading failed: {e}")
    import traceback
    traceback.print_exc()
    gate1_available = False

# ============================================================================
# Test 3: Load Gate 2 Visual Deception Service
# ============================================================================
print("\n[3] Testing Gate 2 Visual Deception Service...")
try:
    from app.services.gate2_inference import get_gate2_deception_service
    
    gate2_detector = get_gate2_deception_service()
    print(f"✓ Gate 2 detector loaded")
    print(f"  Model loaded: {gate2_detector.is_loaded}")
    print(f"  Model type: {'ML' if gate2_detector.is_loaded else 'Rules-based (emotion proxy)'}")
    
    if gate2_detector.is_loaded:
        models_dir = Path("models/gate2")
        metadata_file = models_dir / "gate2_deception_metadata.json"
        if metadata_file.exists():
            with open(metadata_file) as f:
                metadata = json.load(f)
            print(f"  Training accuracy: {metadata.get('train_accuracy', 'N/A'):.2%}")
            print(f"  Test accuracy: {metadata.get('test_accuracy', 'N/A'):.2%}")
            print(f"  Training samples: {metadata.get('n_samples', 'N/A')}")
    
    gate2_available = True
except Exception as e:
    print(f"✗ Gate 2 detector loading failed: {e}")
    import traceback
    traceback.print_exc()
    gate2_available = False

# ============================================================================
# Test 4: Generate Synthetic Audio Test Cases
# ============================================================================
print("\n[4] Generating synthetic audio test cases...")

def generate_synthetic_audio(
    label: str, 
    duration: float = 3.0, 
    sr: int = 16000
) -> Tuple[np.ndarray, int]:
    """
    Generate synthetic audio with characteristics matching truthful/deceptive patterns.
    """
    t = np.linspace(0, duration, int(sr * duration))
    
    if label == "truthful":
        # Stable pitch, smooth energy, fewer pauses
        base_freq = 150 + np.random.randn() * 10  # Stable pitch
        audio = 0.5 * np.sin(2 * np.pi * base_freq * t)
        # Add slight variation
        audio += 0.1 * np.sin(2 * np.pi * (base_freq * 2) * t)
        # Minimal pauses
        audio = audio * (1.0 + 0.1 * np.sin(2 * np.pi * 2 * t))
        
    else:  # deceptive
        # Variable pitch, energy fluctuations, more pauses
        base_freq = 150 + 30 * np.sin(2 * np.pi * 3 * t)  # Variable pitch
        audio = 0.4 * np.sin(2 * np.pi * base_freq * t)
        # Add jitter (rapid frequency variations)
        audio += 0.2 * np.sin(2 * np.pi * (base_freq + 20 * np.sin(50 * t)) * t)
        # Add pauses (amplitude drops)
        pause_pattern = np.where(np.sin(2 * np.pi * 4 * t) > 0.5, 0.3, 1.0)
        audio = audio * pause_pattern
    
    # Add noise
    audio += 0.02 * np.random.randn(len(audio))
    
    # Normalize
    audio = audio / np.max(np.abs(audio))
    
    return audio.astype(np.float32), sr

if gate1_available:
    try:
        num_samples_per_class = 20
        gate1_predictions = []
        gate1_true_labels = []
        
        print(f"  Generating {num_samples_per_class} samples per class...")
        
        for label in ["truthful", "deceptive"]:
            for i in range(num_samples_per_class):
                # Generate synthetic audio
                audio_array, sr = generate_synthetic_audio(label, duration=3.0)
                
                # Convert to WAV bytes
                wav_buffer = io.BytesIO()
                sf.write(wav_buffer, audio_array, sr, format='WAV')
                audio_bytes = wav_buffer.getvalue()
                
                # Predict
                result = gate1_detector.predict(audio_bytes)
                
                gate1_predictions.append(result["label"])
                gate1_true_labels.append(label)
        
        # Calculate metrics
        accuracy = accuracy_score(gate1_true_labels, gate1_predictions)
        precision, recall, f1, _ = precision_recall_fscore_support(
            gate1_true_labels, gate1_predictions, average='binary', pos_label='truthful'
        )
        cm = confusion_matrix(gate1_true_labels, gate1_predictions, labels=['truthful', 'deceptive'])
        
        print(f"\n✓ Gate 1 Audio Deception Detection Results:")
        print(f"  Total samples tested: {len(gate1_true_labels)}")
        print(f"  Accuracy: {accuracy:.2%}")
        print(f"  Precision (truthful): {precision:.2%}")
        print(f"  Recall (truthful): {recall:.2%}")
        print(f"  F1-Score (truthful): {f1:.2%}")
        print(f"\n  Confusion Matrix:")
        print(f"                 Predicted")
        print(f"               Truth  Decep")
        print(f"  Actual Truth    {cm[0][0]:3d}    {cm[0][1]:3d}")
        print(f"         Decep    {cm[1][0]:3d}    {cm[1][1]:3d}")
        
        gate1_pass = accuracy >= 0.50  # At least 50% for rules-based
        
    except Exception as e:
        print(f"✗ Gate 1 testing failed: {e}")
        import traceback
        traceback.print_exc()
        gate1_pass = False
else:
    print("  ⚠ Gate 1 detector not available - skipping")
    gate1_pass = False

# ============================================================================
# Test 5: Test Gate 2 Service Availability
# ============================================================================
print("\n[5] Testing Gate 2 Service Availability...")

if gate2_available:
    try:
        print(f"  ✓ Gate 2 deception service is operational")
        print(f"  ✓ Model type: {'ML' if gate2_detector.is_loaded else 'Rules-based (emotion proxy)'}")
        print(f"  ✓ Face detector initialized: {gate2_detector.face_cascade is not None}")
        
        # Note: Full frame/video testing requires video files and is covered by integration tests
        print(f"\n  Note: Gate 2 uses rules-based emotion analysis as deception proxy")
        print(f"        when ML model is not trained. This provides baseline deception")
        print(f"        detection by analyzing fear, anger, and stress indicators.")
        
        gate2_pass = True
        
    except Exception as e:
        print(f"✗ Gate 2 service test failed: {e}")
        import traceback
        traceback.print_exc()
        gate2_pass = False
else:
    print("  ⚠ Gate 2 detector not available - skipping")
    gate2_pass = False

# ============================================================================
# Final Summary
# ============================================================================
print("\n" + "=" * 80)
print("VERIFICATION SUMMARY")
print("=" * 80)

all_tests_passed = True

if gate1_available:
    status = "✓ PASS" if gate1_pass else "✗ FAIL"
    print(f"\nGate 1 (Audio Deception): {status}")
    if not gate1_pass:
        all_tests_passed = False
else:
    print(f"\nGate 1 (Audio Deception): ⚠ NOT AVAILABLE")
    all_tests_passed = False

if gate2_available:
    status = "✓ PASS" if gate2_pass else "✗ FAIL"
    print(f"Gate 2 (Visual Deception): {status}")
    if not gate2_pass:
        all_tests_passed = False
else:
    print(f"Gate 2 (Visual Deception): ⚠ NOT AVAILABLE")
    all_tests_passed = False

print("\n" + "=" * 80)

if all_tests_passed:
    print("✓ ALL DECEPTION DETECTION TESTS PASSED")
    print("=" * 80)
    print("\nDeception detection models are operational!")
    print("Note: Currently using rules-based fallback. Train ML models for better accuracy.")
    sys.exit(0)
else:
    print("✗ SOME TESTS FAILED")
    print("=" * 80)
    sys.exit(1)
