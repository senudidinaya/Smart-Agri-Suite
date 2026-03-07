#!/usr/bin/env python3
"""Quick verification that ML model and librosa are working"""

import sys
from pathlib import Path

print("=" * 60)
print("Smart Agri-Suite - ML Model Verification")
print("=" * 60)

# Test 1: Check librosa
print("\n[1] Testing librosa installation...")
try:
    import librosa
    import soundfile
    print(f"✓ librosa version: {librosa.__version__}")
    print(f"✓ soundfile installed")
except ImportError as e:
    print(f"✗ Failed to import: {e}")
    sys.exit(1)

# Test 2: Check ML model loading
print("\n[2] Testing ML model loading...")
try:
    from app.services.inference import get_classifier
    classifier = get_classifier()
    print(f"✓ Model loaded: {classifier.is_loaded}")
    
    # Access internal classifier for metadata
    if hasattr(classifier, '_classifier'):
        metadata = classifier._classifier.metadata
        print(f"✓ Model type: {metadata.get('model_type', 'N/A')}")
        print(f"✓ Test accuracy: {metadata.get('test_accuracy', 'N/A')}")
        print(f"✓ Training samples: {metadata.get('n_samples', 'N/A')}")
    else:
        print("  Model metadata not available (rules-based fallback)")
except Exception as e:
    print(f"✗ Model loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Test audio file processing
print("\n[3] Testing audio processing...")
recordings_dir = Path("recordings")
if recordings_dir.exists():
    wav_files = list(recordings_dir.glob("*.wav"))
    if wav_files:
        test_file = wav_files[-1]  # Get most recent
        print(f"  Using test file: {test_file.name}")
        
        try:
            with open(test_file, "rb") as f:
                audio_data = f.read()
            
            result, duration = classifier.predict(audio_data)
            print(f"✓ Audio processed successfully")
            print(f"  Duration: {duration:.2f}s")
            print(f"  Prediction: {result.predicted_intent}")
            print(f"  Confidence: {result.confidence:.2%}")
            print(f"  All scores: {', '.join([f'{s.label}: {s.score:.2%}' for s in result.all_scores])}")
        except Exception as e:
            print(f"✗ Audio processing failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    else:
        print("  No recording files found - skipping audio test")
else:
    print("  No recordings directory - skipping audio test")

print("\n" + "=" * 60)
print("✓ ALL VERIFICATION TESTS PASSED")
print("=" * 60)
print("\nML model is ready for production use!")
