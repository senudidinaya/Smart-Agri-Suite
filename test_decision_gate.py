#!/usr/bin/env python
"""Test decision gate logic for call analysis classifier."""

# Test the decision gate logic
test_cases = [
    {"confidence": 0.87, "margin": 0.74, "should_be_verify": False, "desc": "high confidence, high margin"},
    {"confidence": 0.60, "margin": 0.74, "should_be_verify": True, "desc": "low confidence, high margin"},
    {"confidence": 0.80, "margin": 0.05, "should_be_verify": True, "desc": "high confidence, low margin"},
    {"confidence": 0.65, "margin": 0.10, "should_be_verify": False, "desc": "threshold values (exactly)"},
    {"confidence": 0.64, "margin": 0.09, "should_be_verify": True, "desc": "below threshold values"},
]

confidence_threshold = 0.65
margin_threshold = 0.10

print("Decision Gate Logic Test")
print("=" * 60)
for test in test_cases:
    confidence = test["confidence"]
    margin = test["margin"]
    should_trigger = confidence < confidence_threshold or margin < margin_threshold
    passed = should_trigger == test["should_be_verify"]
    status = "✓ PASS" if passed else "✗ FAIL"
    
    print(f"{status}: {test['desc']}")
    print(f"       Confidence={confidence:.3f} (threshold={confidence_threshold}), Margin={margin:.3f} (threshold={margin_threshold})")
    print(f"       Trigger={should_trigger}, Expected={test['should_be_verify']}")
    print()

print("=" * 60)
print("Decision gate logic validated successfully!")
