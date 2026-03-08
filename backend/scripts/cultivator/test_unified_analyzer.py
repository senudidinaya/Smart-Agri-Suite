"""
Test script for Gate 2 Unified Video Intention Analyzer

Demonstrates how to use the unified method that analyzes:
- Video → Emotion + Deception → Combined Intention Assessment

Usage:
    python scripts/test_unified_analyzer.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from cultivator.services.gate2_unified_analyzer import (
    Gate2UnifiedAnalyzer,
    get_gate2_unified_analyzer
)


def test_unified_analyzer(video_path: str):
    """
    Test the unified analyzer with a video file.
    
    Single method call returns:
    - Emotion analysis (dominant emotion, distribution, stability)
    - Deception analysis (truthful/deceptive, confidence, signals)
    - Combined intention score (0-1)
    - Admin recommendation (APPROVE/VERIFY/REJECT)
    - Risk level (LOW/MEDIUM/HIGH)
    """
    print("=" * 80)
    print("🎯 Gate 2 Unified Video Intention Analyzer Test")
    print("=" * 80)
    print()
    
    # Initialize analyzer (singleton)
    analyzer = get_gate2_unified_analyzer()
    print("✓ Analyzer initialized")
    print()
    
    # Single method call analyzes video
    print(f"📹 Analyzing video: {video_path}")
    print("   - Running emotion detection...")
    print("   - Running deception detection...")
    print("   - Calculating intention score...")
    print()
    
    try:
        # 🔥 THE UNIFIED METHOD - One call does everything
        result = analyzer.analyze_video(video_path)
        
        print("=" * 80)
        print("📊 ANALYSIS RESULTS")
        print("=" * 80)
        print()
        
        # Emotion Analysis
        print("🎭 EMOTION ANALYSIS:")
        print(f"   Dominant Emotion: {result.dominant_emotion}")
        print(f"   Confidence: {result.emotion_confidence:.1%}")
        print(f"   Emotional Stability: {result.emotional_stability:.1%}")
        print(f"   Distribution:")
        for emotion, score in sorted(
            result.emotion_distribution.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:3]:
            print(f"      • {emotion}: {score:.1%}")
        print()
        
        # Deception Analysis
        print("🔍 DECEPTION ANALYSIS:")
        print(f"   Label: {result.deception_label.upper()}")
        print(f"   Confidence: {result.deception_confidence:.1%}")
        if result.deception_signals:
            print(f"   Signals:")
            for signal in result.deception_signals[:3]:
                print(f"      • {signal}")
        print()
        
        # Combined Assessment
        print("🎯 COMBINED INTENTION ASSESSMENT:")
        print(f"   Intention Score: {result.intention_score:.3f} / 1.0")
        print(f"   Risk Level: {result.risk_level}")
        print(f"   Recommendation: {result.recommendation}")
        print()
        
        print("📋 KEY SIGNALS:")
        for signal in result.combined_signals:
            print(f"   {signal}")
        print()
        
        # Metadata
        print("ℹ️  METADATA:")
        print(f"   Frames Analyzed: {result.frames_analyzed}")
        print(f"   Face Detection Rate: {result.face_detection_rate:.1%}")
        print(f"   Model Version: {result.model_version}")
        print()
        
        # Decision visualization
        print("=" * 80)
        print("🏁 ADMIN DECISION GUIDANCE")
        print("=" * 80)
        
        if result.recommendation == "APPROVE":
            print("✅ APPROVE: Cultivator shows consistent positive indicators.")
            print("   Safe to recommend for cultivation work.")
        elif result.recommendation == "VERIFY":
            print("⚠️  VERIFY: Mixed signals detected.")
            print("   Manual review recommended before final decision.")
        else:  # REJECT
            print("❌ REJECT: High-risk indicators detected.")
            print("   Not recommended for cultivation work at this time.")
        print()
        
        # API response format
        print("=" * 80)
        print("📤 API RESPONSE FORMAT")
        print("=" * 80)
        print()
        result_dict = result.to_dict()
        
        import json
        print(json.dumps(result_dict, indent=2))
        
        return result
        
    except FileNotFoundError:
        print(f"❌ Error: Video file not found: {video_path}")
        return None
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        return None


def compare_vs_separate_calls(video_path: str):
    """
    Compare unified method vs separate calls to show the difference.
    """
    from cultivator.services.gate2_inference import get_gate2_inference_service
    from cultivator.services.gate2_inference import get_gate2_deception_service
    
    print("=" * 80)
    print("⚖️  COMPARISON: Unified Method vs Separate Calls")
    print("=" * 80)
    print()
    
    # Method 1: Unified (NEW)
    print("🔥 METHOD 1: UNIFIED ANALYZER (Recommended)")
    print("-" * 80)
    analyzer = get_gate2_unified_analyzer()
    result = analyzer.analyze_video(video_path)
    print(f"✓ One method call")
    print(f"  → Intention Score: {result.intention_score:.3f}")
    print(f"  → Recommendation: {result.recommendation}")
    print(f"  → Risk Level: {result.risk_level}")
    print(f"  → Combined Signals: {len(result.combined_signals)} insights")
    print()
    
    # Method 2: Separate calls (OLD)
    print("🔧 METHOD 2: SEPARATE CALLS (Legacy)")
    print("-" * 80)
    emotion_service = get_gate2_inference_service()
    deception_service = get_gate2_deception_service()
    
    emotion_result = emotion_service.predict(video_path)
    print(f"✓ Call 1: Emotion detection")
    print(f"  → Emotion: {emotion_result.dominant_emotion}")
    
    deception_result = deception_service.predict(video_path)
    print(f"✓ Call 2: Deception detection")
    print(f"  → Deception: {deception_result.deception_label}")
    
    print()
    print("❌ Problem: No unified intention score or risk assessment")
    print("❌ Problem: Need manual logic to combine results")
    print()
    
    print("=" * 80)
    print("💡 CONCLUSION: Use unified analyzer for complete intention assessment")
    print("=" * 80)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python test_unified_analyzer.py <video_path>")
        print()
        print("Examples:")
        print("  python scripts/test_unified_analyzer.py tmp/interviews/interview_123.mp4")
        print("  python scripts/test_unified_analyzer.py data/test_video.mp4")
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    # Run unified test
    result = test_unified_analyzer(video_path)
    
    # Show comparison if successful
    if result:
        print()
        compare_vs_separate_calls(video_path)
