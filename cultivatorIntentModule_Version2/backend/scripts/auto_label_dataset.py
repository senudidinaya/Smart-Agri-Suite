#!/usr/bin/env python3
r"""
Auto-Labeling Script for Intent Risk Classification.

This script automatically assigns preliminary labels (PROCEED/VERIFY/REJECT)
based on red flag counts and audio features. These are heuristic labels
that should be reviewed by a human for accuracy.

Usage:
    cd backend
    .\.venv\Scripts\Activate.ps1
    python scripts/auto_label_dataset.py

Input:  data/call_features.csv
Output: data/labeled_call_features.csv

The auto-labeling rules:
- REJECT: High red flag counts (fraud indicators)
- VERIFY: Moderate red flags or unusual audio patterns
- PROCEED: Low risk, normal conversation patterns
"""

import sys
from pathlib import Path

import pandas as pd

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"

INPUT_PATH = DATA_DIR / "call_features.csv"
OUTPUT_PATH = DATA_DIR / "labeled_call_features.csv"


def auto_label_row(row: pd.Series) -> str:
    """
    Apply heuristic rules to assign a preliminary label.
    
    These rules are based on red flag patterns commonly associated
    with fraudulent calls vs. legitimate buyer inquiries.
    """
    # Count total red flags
    red_flag_columns = [
        "urgency_count",
        "money_count",
        "secrecy_count",
        "pressure_count",
        "id_avoidance_count",
        "otp_pin_count",
    ]
    
    total_red_flags = sum(row.get(col, 0) for col in red_flag_columns)
    
    # Weighted scoring (some red flags are more serious)
    critical_flags = (
        row.get("otp_pin_count", 0) * 3 +      # OTP/PIN requests are very suspicious
        row.get("id_avoidance_count", 0) * 2 +  # Avoiding ID is suspicious
        row.get("secrecy_count", 0) * 2 +       # Secrecy is suspicious
        row.get("pressure_count", 0) * 1.5 +    # Pressure tactics
        row.get("money_count", 0) * 1 +         # Money talk (context-dependent)
        row.get("urgency_count", 0) * 0.5       # Urgency (less suspicious)
    )
    
    # Audio anomalies (very short or very long calls can be suspicious)
    duration = row.get("duration_seconds", 0)
    has_transcript = row.get("transcript_word_count", 0) > 5
    
    # Very short calls with no real content
    if duration < 3 and not has_transcript:
        return "VERIFY"
    
    # High critical flags -> REJECT
    if critical_flags >= 4:
        return "REJECT"
    
    # Moderate red flags -> VERIFY
    if critical_flags >= 2 or total_red_flags >= 4:
        return "VERIFY"
    
    # Some red flags but not alarming
    if total_red_flags >= 2:
        return "VERIFY"
    
    # Low risk -> PROCEED
    return "PROCEED"


def main():
    """Main entry point."""
    print("=" * 60)
    print("AUTO-LABELING DATASET")
    print("=" * 60)
    
    # Load data
    if not INPUT_PATH.exists():
        print(f"\n❌ Error: Input file not found: {INPUT_PATH}")
        print("Please run generate_call_features_dataset.py first.")
        sys.exit(1)
    
    print(f"\n📂 Loading: {INPUT_PATH}")
    df = pd.read_csv(INPUT_PATH)
    print(f"   Loaded {len(df)} samples")
    
    # Apply auto-labeling
    print("\n🏷️  Applying auto-labeling rules...")
    df["decision"] = df.apply(auto_label_row, axis=1)
    
    # Show distribution
    print("\n📊 Label Distribution:")
    for label in ["PROCEED", "VERIFY", "REJECT"]:
        count = (df["decision"] == label).sum()
        pct = count / len(df) * 100
        print(f"   {label}: {count} samples ({pct:.1f}%)")
    
    # Show some examples of each class
    print("\n📋 Sample Labels (first 3 of each class):")
    for label in ["PROCEED", "VERIFY", "REJECT"]:
        subset = df[df["decision"] == label].head(3)
        if len(subset) > 0:
            print(f"\n   {label}:")
            for _, row in subset.iterrows():
                red_flags = (
                    row.get("urgency_count", 0) +
                    row.get("money_count", 0) +
                    row.get("secrecy_count", 0) +
                    row.get("pressure_count", 0) +
                    row.get("id_avoidance_count", 0) +
                    row.get("otp_pin_count", 0)
                )
                transcript = str(row.get("transcript", ""))[:50]
                print(f"      {row['clip_id']}: flags={red_flags}, transcript='{transcript}...'")
    
    # Save
    print(f"\n💾 Saving to: {OUTPUT_PATH}")
    df.to_csv(OUTPUT_PATH, index=False)
    
    print("\n" + "=" * 60)
    print("✅ AUTO-LABELING COMPLETE")
    print("=" * 60)
    print(f"""
⚠️  IMPORTANT: These are PRELIMINARY labels based on heuristics.

Next steps:
1. Review the labels in: {OUTPUT_PATH}
2. Correct any mislabeled samples
3. Train the model:
   
   python scripts/train_intent_risk_model.py

""")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
