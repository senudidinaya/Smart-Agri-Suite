#!/usr/bin/env python3
"""
Cultivator Intention Decision Engine - Example Usage & Testing

This script demonstrates how to use the decision engine to make
justified recommendations for cultivator land use intent analysis.

Usage:
    python scripts/test_decision_engine.py
"""

import json
from pathlib import Path

# Add backend to path
import sys
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.decision_engine import get_decision_engine, Gate1Decision, Gate2Decision


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def print_decision(decision_info, gate_name: str):
    """Print decision information in a readable format."""
    print(f"Gate {gate_name} Decision: {decision_info.decision.value}")
    print(f"Confidence: {decision_info.confidence:.0%}")
    print(f"\nReasoning:\n  {decision_info.reasoning}")
    
    if decision_info.positive_factors:
        print(f"\nPositive Factors:")
        for factor in decision_info.positive_factors:
            print(f"  {factor}")
    
    if decision_info.risk_factors:
        print(f"\nRisk Factors:")
        for factor in decision_info.risk_factors:
            print(f"  {factor}")


def example_1_legitimate_cultivator():
    """Example 1: Legitimate cultivator with strong positive signals."""
    print_section("EXAMPLE 1: Legitimate Cultivator")
    print("Scenario: Someone genuinely interested in farming")
    print("Signals: High intent + truthful audio + positive emotions + legitimate keywords\n")
    
    engine = get_decision_engine()
    
    # Gate-1: Audio Analysis
    gate1_decision = engine.decide_gate1(
        intent_label="HIGH_INTENT",
        intent_confidence=0.87,
        deception_label="truthful",
        deception_confidence=0.84,
        transcript="I want to cultivate organic vegetables on leased agricultural land. "
                   "I have experience with farming and irrigation systems.",
        text_features={"urgency_count": 0, "money_count": 0}
    )
    
    print_decision(gate1_decision, "1 (Audio Intent + Deception)")
    
    # Gate-2: Behavior Analysis
    gate2_decision = engine.decide_gate2(
        emotion_label="neutral",
        emotion_confidence=0.91,
        deception_label="truthful",
        deception_confidence=0.88
    )
    
    print_decision(gate2_decision, "2 (Emotion + Video Deception)")
    
    # Combined Analysis
    combined = engine.combine_decisions(gate1_decision, gate2_decision)
    
    print(f"\n{'─'*80}")
    print(f"OVERALL RECOMMENDATION: {combined['overall_recommendation']}")
    print(f"Combined Confidence: {combined['combined_confidence']:.0%}")
    print(f"Risk Level: {combined['summary']['risk_level']}")
    print(f"\nReason:\n  {combined['overall_reason']}")
    
    return combined


def example_2_deceptive_cultivator():
    """Example 2: Person with deceptive intent."""
    print_section("EXAMPLE 2: Deceptive Behavior Detected")
    print("Scenario: Someone with deceptive intent or behavior")
    print("Signals: Medium intent + deceptive audio + stress emotions + fraud keywords\n")
    
    engine = get_decision_engine()
    
    # Gate-1: Audio Analysis
    gate1_decision = engine.decide_gate1(
        intent_label="MEDIUM_INTENT",
        intent_confidence=0.45,
        deception_label="deceptive",
        deception_confidence=0.72,
        transcript="I need emergency money fast. Can I use this land to get a loan quickly? "
                   "I need your OTP to proceed.",
        text_features={"urgency_count": 3, "money_count": 2}
    )
    
    print_decision(gate1_decision, "1 (Audio Intent + Deception)")
    
    # Gate-2: Behavior Analysis
    gate2_decision = engine.decide_gate2(
        emotion_label="fear",
        emotion_confidence=0.79,
        deception_label="deceptive",
        deception_confidence=0.81
    )
    
    print_decision(gate2_decision, "2 (Emotion + Video Deception)")
    
    # Combined Analysis
    combined = engine.combine_decisions(gate1_decision, gate2_decision)
    
    print(f"\n{'─'*80}")
    print(f"OVERALL RECOMMENDATION: {combined['overall_recommendation']}")
    print(f"Combined Confidence: {combined['combined_confidence']:.0%}")
    print(f"Risk Level: {combined['summary']['risk_level']}")
    print(f"\nReason:\n  {combined['overall_reason']}")
    
    return combined


def example_3_uncertain_cultivator():
    """Example 3: Mixed signals requiring verification."""
    print_section("EXAMPLE 3: Mixed Signals - Requires Verification")
    print("Scenario: Someone with moderate signals, needs clarification")
    print("Signals: Medium intent + mixed deception + calm emotions\n")
    
    engine = get_decision_engine()
    
    # Gate-1: Audio Analysis
    gate1_decision = engine.decide_gate1(
        intent_label="MEDIUM_INTENT",
        intent_confidence=0.58,
        deception_label="truthful",
        deception_confidence=0.55,  # Borderline
        transcript="I'm thinking about cultivating some crops. "
                   "Not sure about the exact details yet.",
        text_features={"urgency_count": 0, "money_count": 0}
    )
    
    print_decision(gate1_decision, "1 (Audio Intent + Deception)")
    
    # Gate-2: Behavior Analysis
    gate2_decision = engine.decide_gate2(
        emotion_label="neutral",
        emotion_confidence=0.71,
        deception_label="truthful",
        deception_confidence=0.62  # Borderline
    )
    
    print_decision(gate2_decision, "2 (Emotion + Video Deception)")
    
    # Combined Analysis
    combined = engine.combine_decisions(gate1_decision, gate2_decision)
    
    print(f"\n{'─'*80}")
    print(f"OVERALL RECOMMENDATION: {combined['overall_recommendation']}")
    print(f"Combined Confidence: {combined['combined_confidence']:.0%}")
    print(f"Risk Level: {combined['summary']['risk_level']}")
    print(f"\nReason:\n  {combined['overall_reason']}")
    
    return combined


def print_summary(results: dict):
    """Print summary of all examples."""
    print_section("SUMMARY OF DECISION ENGINE")
    
    print("Decision Outcomes:")
    print("┌─ PROCEED: Strong positive signals across all gates")
    print("├─ VERIFY:  Mixed signals requiring additional review")
    print("└─ REJECT:  Clear negative indicators detected")
    
    print("\nRisk Levels:")
    print("┌─ LOW:    Few risk factors, many positive indicators")
    print("├─ MEDIUM: Balanced risk and positive factors")
    print("└─ HIGH:   Multiple risk factors detected")
    
    print("\n\nFramework Features:")
    print("✓ Explainable - Each decision includes detailed reasoning")
    print("✓ Justifiable - Based on behavioral indicators and ML models")
    print("✓ Actionable - Clear recommendations (PROCEED/VERIFY/REJECT)")
    print("✓ Configurable - Adjust thresholds for different risk tolerance")
    print("✓ Auditable - Complete factor lists for review and appeal")
    
    print("\n\nKey Indicators:")
    print("Audio Analysis (Gate-1):")
    print("  • Intent Level: Strength of cultivation commitment")
    print("  • Deception Signals: Prosodic features (pitch, energy, pauses)")
    print("  • Keywords: Legitimate vs. suspicious terminology")
    
    print("\nBehavior Analysis (Gate-2):")
    print("  • Emotion: Facial expressions (calm vs. stressed)")
    print("  • Deception: Video behavioral inconsistencies")
    print("  • Consistency: Alignment of verbal and nonverbal signals")


def main():
    """Run all examples."""
    print("\n" + "="*80)
    print(" CULTIVATOR INTENTION DECISION ENGINE - DEMONSTRATION")
    print("="*80)
    
    results = {}
    
    # Run examples
    results['example1'] = example_1_legitimate_cultivator()
    results['example2'] = example_2_deceptive_cultivator()
    results['example3'] = example_3_uncertain_cultivator()
    
    # Print summary
    print_summary(results)
    
    print("\n" + "="*80)
    print(" For more information, see: docs/CULTIVATOR_DECISION_FRAMEWORK.md")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
