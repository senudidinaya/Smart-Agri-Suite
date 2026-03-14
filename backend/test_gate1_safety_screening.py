"""
Test Gate-1 Cultivator Safety Screening with Real Recordings.

This script tests the complete Gate-1 pipeline:
1. Commitment/Intent Classification
2. Deception Detection
3. Combined Safety Decision Matrix
"""

import sys
import os
from pathlib import Path

# Add backend to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from cultivator.services.inference import get_classifier, get_deception_detector
from cultivator.services.combined_analysis import combine_intent_and_deception


def test_recording(audio_path: str):
    """Test a single recording through the full Gate-1 pipeline."""
    print(f"\n{'='*80}")
    print(f"Testing: {Path(audio_path).name}")
    print(f"{'='*80}\n")
    
    # Load audio file
    with open(audio_path, 'rb') as f:
        audio_bytes = f.read()
    
    print(f"Audio file size: {len(audio_bytes):,} bytes")
    
    # ============================================================================
    # STEP 1: Commitment Analysis
    # ============================================================================
    print("\n[STEP 1] Running Commitment Classifier...")
    classifier = get_classifier()
    
    if not classifier.is_loaded:
        print("⚠️  Classifier not loaded. Loading now...")
        classifier.load_model()
    
    try:
        prediction_result, audio_duration = classifier.predict(audio_bytes)
        print(f"✓ Audio Duration: {audio_duration:.2f} seconds")
        print(f"✓ Predicted Commitment: {prediction_result.predicted_intent}")
        print(f"✓ Confidence: {prediction_result.confidence:.1%}")
        print(f"\nAll Scores:")
        for score_obj in prediction_result.all_scores:
            print(f"  - {score_obj.label}: {score_obj.score:.1%}")
        
        # Convert to dict for combined analysis
        intent_analysis = {
            "predicted_intent": prediction_result.predicted_intent,
            "confidence": prediction_result.confidence,
            "all_scores": [
                {"label": s.label, "score": s.score} 
                for s in prediction_result.all_scores
            ],
        }
    except Exception as e:
        print(f"✗ Commitment analysis failed: {e}")
        return
    
    # ============================================================================
    # STEP 2: Deception Detection
    # ============================================================================
    print("\n[STEP 2] Running Deception Detector...")
    deception_detector = get_deception_detector()
    
    if not deception_detector.is_loaded:
        print("⚠️  Deception detector not loaded. Loading now...")
        deception_detector.load_model()
    
    try:
        deception_result = deception_detector.predict(audio_bytes)
        print(f"✓ Truthfulness Assessment: {deception_result.get('label', 'unknown')}")
        print(f"✓ Confidence: {deception_result.get('confidence', 0.0):.1%}")
        
        signals = deception_result.get('signals', [])
        if signals:
            print(f"\nDeception Signals Detected:")
            for signal in signals:
                print(f"  - {signal}")
        else:
            print(f"\n✓ No significant deception signals detected")
    except Exception as e:
        print(f"✗ Deception detection failed: {e}")
        return
    
    # ============================================================================
    # STEP 3: Combined Safety Decision
    # ============================================================================
    print("\n[STEP 3] Combined Safety Assessment...")
    
    try:
        combined_decision = combine_intent_and_deception(
            intent_analysis,
            deception_result,
        )
        
        print(f"\n{'='*80}")
        print("FINAL SAFETY RECOMMENDATION")
        print(f"{'='*80}")
        print(f"Decision: {combined_decision.get('finalDecision')}")
        print(f"Recommendation: {combined_decision.get('recommendation')}")
        print(f"Trust Score: {combined_decision.get('trustScore', 0.0):.1%}")
        print(f"Risk Level: {combined_decision.get('riskLevel')}")
        print(f"\nReasoning:")
        print(f"  {combined_decision.get('reasoning')}")
        print(f"{'='*80}\n")
        
        # Detailed breakdown
        print("\nDetailed Analysis:")
        print(f"\n  Commitment Analysis:")
        intent_data = combined_decision.get('intentAnalysis', {})
        print(f"    Label: {intent_data.get('label')}")
        print(f"    Confidence: {intent_data.get('confidence', 0.0):.1%}")
        
        print(f"\n  Truthfulness Analysis:")
        truth_data = combined_decision.get('truthfulnessAnalysis', {})
        print(f"    Label: {truth_data.get('label')}")
        print(f"    Confidence: {truth_data.get('confidence', 0.0):.1%}")
        
        return combined_decision
        
    except Exception as e:
        print(f"✗ Combined analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    """Test all recordings in the recordings folder."""
    recordings_dir = backend_dir / "recordings"
    
    if not recordings_dir.exists():
        print(f"✗ Recordings directory not found: {recordings_dir}")
        return
    
    # Find all WAV files
    wav_files = list(recordings_dir.glob("*.wav"))
    
    if not wav_files:
        print(f"✗ No WAV files found in {recordings_dir}")
        return
    
    print(f"\n{'#'*80}")
    print(f"# Gate-1 Cultivator Safety Screening Test")
    print(f"# Testing {len(wav_files)} recordings")
    print(f"{'#'*80}")
    
    results = []
    
    for wav_file in wav_files:
        result = test_recording(str(wav_file))
        if result:
            results.append({
                'file': wav_file.name,
                'decision': result.get('finalDecision'),
                'trust_score': result.get('trustScore', 0.0),
                'risk_level': result.get('riskLevel'),
            })
    
    # Summary
    print(f"\n{'#'*80}")
    print(f"# SUMMARY OF ALL RECORDINGS")
    print(f"{'#'*80}\n")
    
    for r in results:
        trust_emoji = "✅" if r['trust_score'] >= 0.7 else "⚠️" if r['trust_score'] >= 0.5 else "❌"
        print(f"{trust_emoji} {r['file']}")
        print(f"   Decision: {r['decision']} | Trust: {r['trust_score']:.1%} | Risk: {r['risk_level']}")
    
    print(f"\n{'#'*80}\n")


if __name__ == "__main__":
    main()
