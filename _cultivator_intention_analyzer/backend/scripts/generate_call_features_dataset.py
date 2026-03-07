#!/usr/bin/env python3
r"""
Offline Dataset Generator for Cultivator Intent Module V2.

This script generates a feature-rich CSV dataset from audio clips and their
transcripts for ML training. It is completely offline - no API calls, no
database connections, no web server.

Usage:
    # Set environment variables and run
    $env:AUDIO_DIR = "C:\Users\senud\Documents\FINAL YEAR RESEARCH\Voice_Dataset"
    $env:ASR_DIR = "C:\Users\senud\Documents\FINAL YEAR RESEARCH\asr_outputs\content\asr_outputs"
    python scripts/generate_call_features_dataset.py

Environment Variables:
    AUDIO_DIR   - Path to folder containing WAV audio clips
    ASR_DIR     - Path to folder containing JSON transcripts + asr_summary.csv
    OUT_DIR     - Output directory for CSVs (default: ./data/)

Author: Smart Agri-Suite Research Team
"""

import csv
import json
import os
import re
import sys
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# Suppress librosa warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

try:
    import librosa
except ImportError:
    print("ERROR: librosa is required. Install with: pip install librosa")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional


# =============================================================================
# Configuration
# =============================================================================

AUDIO_DIR = os.getenv("AUDIO_DIR", "")
ASR_DIR = os.getenv("ASR_DIR", "")
OUT_DIR = os.getenv("OUT_DIR", "./data/")

# Audio processing settings
TARGET_SR = 16000  # Target sample rate

# Text red flag patterns (case-insensitive)
RED_FLAG_PATTERNS = {
    "urgency_count": r"\b(urgent|now|today|immediately|quick|fast)\b",
    "money_count": r"\b(money|pay|payment|cash|deposit|transfer)\b",
    "secrecy_count": r"\b(secret|don't tell|dont tell|keep it confidential)\b",
    "pressure_count": r"\b(trust me|believe me|guarantee|promise)\b",
    "id_avoidance_count": r"\b(no id|no nic|can't share|cant share|don't ask|dont ask|not possible)\b",
    "otp_pin_count": r"\b(otp|pin|code)\b",
}


# =============================================================================
# Utility Functions
# =============================================================================

def validate_paths() -> Tuple[Path, Path, Path]:
    """Validate and return input/output paths."""
    if not AUDIO_DIR:
        print("ERROR: AUDIO_DIR environment variable is not set.")
        print("Example: $env:AUDIO_DIR = 'C:\\path\\to\\Voice_Dataset'")
        sys.exit(1)
    
    if not ASR_DIR:
        print("ERROR: ASR_DIR environment variable is not set.")
        print("Example: $env:ASR_DIR = 'C:\\path\\to\\asr_outputs'")
        sys.exit(1)
    
    audio_path = Path(AUDIO_DIR)
    asr_path = Path(ASR_DIR)
    out_path = Path(OUT_DIR)
    
    if not audio_path.exists():
        print(f"ERROR: AUDIO_DIR does not exist: {audio_path}")
        sys.exit(1)
    
    if not asr_path.exists():
        print(f"ERROR: ASR_DIR does not exist: {asr_path}")
        sys.exit(1)
    
    # Create output directory if needed
    out_path.mkdir(parents=True, exist_ok=True)
    
    return audio_path, asr_path, out_path


def load_asr_summary_csv(asr_dir: Path) -> Dict[str, str]:
    """Load asr_summary.csv as fallback transcript source."""
    summary_path = asr_dir / "asr_summary.csv"
    transcripts = {}
    
    if not summary_path.exists():
        return transcripts
    
    try:
        with open(summary_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Try common column names
                clip_id = row.get("clip_id") or row.get("filename") or row.get("id") or ""
                transcript = row.get("transcript") or row.get("text") or row.get("transcription") or ""
                
                # Clean up clip_id (remove extension if present)
                clip_id = Path(clip_id).stem if clip_id else ""
                
                if clip_id:
                    transcripts[clip_id] = normalize_transcript(transcript)
    except Exception as e:
        print(f"WARNING: Could not parse asr_summary.csv: {e}")
    
    return transcripts


def load_json_transcript(json_path: Path) -> Optional[str]:
    """Load transcript from a JSON file."""
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Try common JSON structures
        if isinstance(data, str):
            return normalize_transcript(data)
        elif isinstance(data, dict):
            # Try common keys
            for key in ["transcript", "text", "transcription", "content", "result"]:
                if key in data:
                    val = data[key]
                    if isinstance(val, str):
                        return normalize_transcript(val)
                    elif isinstance(val, list):
                        # Handle segment-based transcripts
                        segments = []
                        for seg in val:
                            if isinstance(seg, dict):
                                segments.append(seg.get("text", ""))
                            elif isinstance(seg, str):
                                segments.append(seg)
                        return normalize_transcript(" ".join(segments))
        elif isinstance(data, list):
            # List of segments
            segments = []
            for seg in data:
                if isinstance(seg, dict):
                    segments.append(seg.get("text", ""))
                elif isinstance(seg, str):
                    segments.append(seg)
            return normalize_transcript(" ".join(segments))
    except Exception:
        pass
    
    return None


def normalize_transcript(text: Any) -> str:
    """Normalize transcript text."""
    if text is None:
        return ""
    text = str(text).strip()
    # Replace multiple spaces with single space
    text = re.sub(r"\s+", " ", text)
    return text


# =============================================================================
# Audio Feature Extraction
# =============================================================================

def extract_audio_features(audio_path: Path) -> Optional[Dict[str, float]]:
    """
    Extract prosodic and acoustic features from an audio file.
    
    Returns None if the audio cannot be processed.
    """
    try:
        # Load audio at target sample rate
        y, sr = librosa.load(str(audio_path), sr=TARGET_SR, mono=True)
        
        if len(y) == 0:
            return None
        
        duration = len(y) / sr
        
        # RMS energy
        rms = librosa.feature.rms(y=y)[0]
        rms_mean = float(np.mean(rms)) if len(rms) > 0 else 0.0
        rms_std = float(np.std(rms)) if len(rms) > 0 else 0.0
        
        # Fundamental frequency (F0) using pyin
        try:
            f0, voiced_flag, _ = librosa.pyin(
                y,
                fmin=librosa.note_to_hz("C2"),
                fmax=librosa.note_to_hz("C7"),
                sr=sr,
            )
            # Filter to voiced frames only
            f0_voiced = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
            f0_mean = float(np.nanmean(f0_voiced)) if len(f0_voiced) > 0 else 0.0
            f0_std = float(np.nanstd(f0_voiced)) if len(f0_voiced) > 0 else 0.0
            # Handle NaN
            if np.isnan(f0_mean):
                f0_mean = 0.0
            if np.isnan(f0_std):
                f0_std = 0.0
        except Exception:
            f0_mean = 0.0
            f0_std = 0.0
        
        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_mean = float(np.mean(zcr)) if len(zcr) > 0 else 0.0
        
        # Spectral centroid
        spec_cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_centroid_mean = float(np.mean(spec_cent)) if len(spec_cent) > 0 else 0.0
        
        # Tempo proxy (onset strength as speaking pace indicator)
        try:
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            tempo = librosa.feature.tempo(onset_envelope=onset_env, sr=sr)[0]
            tempo_proxy = float(tempo) if tempo else 0.0
        except Exception:
            tempo_proxy = 0.0
        
        return {
            "duration_seconds": round(duration, 3),
            "rms_mean": round(rms_mean, 6),
            "rms_std": round(rms_std, 6),
            "f0_mean": round(f0_mean, 2),
            "f0_std": round(f0_std, 2),
            "zcr_mean": round(zcr_mean, 6),
            "spectral_centroid_mean": round(spectral_centroid_mean, 2),
            "tempo_proxy": round(tempo_proxy, 2),
        }
    
    except Exception as e:
        return None


# =============================================================================
# Text Feature Extraction
# =============================================================================

def extract_text_features(transcript: str) -> Dict[str, int]:
    """Extract text-based red flag features from transcript."""
    features = {
        "transcript_char_len": len(transcript),
        "transcript_word_count": len(transcript.split()) if transcript else 0,
    }
    
    # Count red flag patterns
    text_lower = transcript.lower()
    for feature_name, pattern in RED_FLAG_PATTERNS.items():
        matches = re.findall(pattern, text_lower)
        features[feature_name] = len(matches)
    
    return features


# =============================================================================
# Main Processing Logic
# =============================================================================

def discover_audio_files(audio_dir: Path) -> Dict[str, Path]:
    """Discover all WAV files and return as {clip_id: path}."""
    audio_files = {}
    
    for wav_path in audio_dir.glob("*.wav"):
        clip_id = wav_path.stem
        audio_files[clip_id] = wav_path
    
    # Also check subdirectories
    for wav_path in audio_dir.rglob("*.wav"):
        clip_id = wav_path.stem
        if clip_id not in audio_files:
            audio_files[clip_id] = wav_path
    
    return audio_files


def discover_json_transcripts(asr_dir: Path) -> Dict[str, Path]:
    """Discover all JSON transcript files."""
    json_files = {}
    
    for json_path in asr_dir.glob("*.json"):
        clip_id = json_path.stem
        json_files[clip_id] = json_path
    
    return json_files


def process_dataset(
    audio_dir: Path,
    asr_dir: Path,
    limit: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Process all audio clips and generate feature rows.
    
    Args:
        audio_dir: Path to audio files
        asr_dir: Path to ASR outputs
        limit: Optional limit for testing (process only N clips)
    
    Returns:
        Tuple of (rows, stats)
    """
    print("\n" + "=" * 60)
    print("OFFLINE DATASET GENERATOR")
    print("=" * 60)
    
    # Discover files
    print("\n[1/5] Discovering audio files...")
    audio_files = discover_audio_files(audio_dir)
    print(f"      Found {len(audio_files)} WAV files")
    
    print("\n[2/5] Discovering JSON transcripts...")
    json_transcripts = discover_json_transcripts(asr_dir)
    print(f"      Found {len(json_transcripts)} JSON files")
    
    print("\n[3/5] Loading asr_summary.csv fallback...")
    csv_transcripts = load_asr_summary_csv(asr_dir)
    csv_found = (asr_dir / "asr_summary.csv").exists()
    print(f"      CSV found: {csv_found}")
    print(f"      Loaded {len(csv_transcripts)} transcripts from CSV")
    
    # Process clips
    print("\n[4/5] Extracting features from audio clips...")
    
    rows = []
    skipped_clips = []
    missing_transcript_count = 0
    
    # Sort for deterministic order
    clip_ids = sorted(audio_files.keys())
    
    if limit:
        clip_ids = clip_ids[:limit]
        print(f"      (Limited to {limit} clips for testing)")
    
    total = len(clip_ids)
    
    for i, clip_id in enumerate(clip_ids, 1):
        audio_path = audio_files[clip_id]
        
        # Progress indicator
        if i % 50 == 0 or i == total:
            print(f"      Processing: {i}/{total} clips...")
        
        # Extract audio features
        audio_features = extract_audio_features(audio_path)
        
        if audio_features is None:
            skipped_clips.append(clip_id)
            continue
        
        # Get transcript (prefer JSON, fallback to CSV)
        transcript = ""
        json_path = json_transcripts.get(clip_id)
        
        if json_path:
            transcript = load_json_transcript(json_path) or ""
        
        if not transcript and clip_id in csv_transcripts:
            transcript = csv_transcripts[clip_id]
        
        if not transcript:
            missing_transcript_count += 1
        
        # Extract text features
        text_features = extract_text_features(transcript)
        
        # Build row
        row = {
            "clip_id": clip_id,
            "audio_path": str(audio_path),
            "transcript": transcript,
            **audio_features,
            **text_features,
        }
        
        rows.append(row)
    
    print(f"\n[5/5] Processing complete!")
    
    # Stats
    stats = {
        "total_wavs_found": len(audio_files),
        "total_json_found": len(json_transcripts),
        "asr_summary_csv_found": csv_found,
        "total_rows_exported": len(rows),
        "rows_missing_transcript_count": missing_transcript_count,
        "skipped_corrupted_clips": len(skipped_clips),
        "skipped_clip_ids": skipped_clips[:10] if skipped_clips else [],
    }
    
    return rows, stats


def write_outputs(rows: List[Dict[str, Any]], out_dir: Path) -> Tuple[Path, Path]:
    """Write output CSV files."""
    
    # Define column order
    feature_columns = [
        "clip_id",
        "audio_path",
        "transcript",
        "duration_seconds",
        "rms_mean",
        "rms_std",
        "f0_mean",
        "f0_std",
        "zcr_mean",
        "spectral_centroid_mean",
        "tempo_proxy",
        "transcript_char_len",
        "transcript_word_count",
        "urgency_count",
        "money_count",
        "secrecy_count",
        "pressure_count",
        "id_avoidance_count",
        "otp_pin_count",
    ]
    
    labeling_columns = [
        "clip_id",
        "transcript",
        "human_label",
        "notes",
    ]
    
    # Write full features CSV
    features_path = out_dir / "call_features.csv"
    with open(features_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=feature_columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    
    # Write labeling CSV
    labeling_path = out_dir / "call_features_for_labeling.csv"
    with open(labeling_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=labeling_columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            labeling_row = {
                "clip_id": row["clip_id"],
                "transcript": row["transcript"],
                "human_label": "",
                "notes": "",
            }
            writer.writerow(labeling_row)
    
    return features_path, labeling_path


def print_summary(stats: Dict[str, Any], features_path: Path, labeling_path: Path):
    """Print final verification summary."""
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    print(f"""
  Total WAV files found:        {stats['total_wavs_found']}
  Total JSON transcripts found: {stats['total_json_found']}
  asr_summary.csv found:        {stats['asr_summary_csv_found']}
  
  Total rows exported:          {stats['total_rows_exported']}
  Rows missing transcript:      {stats['rows_missing_transcript_count']}
  Skipped (corrupted audio):    {stats['skipped_corrupted_clips']}
""")
    
    if stats["skipped_clip_ids"]:
        print(f"  Skipped clip IDs (first 10): {stats['skipped_clip_ids']}")
    
    print(f"""
  Output files:
    - {features_path}
    - {labeling_path}
""")
    
    print("=" * 60)
    print("DATASET GENERATION COMPLETE")
    print("=" * 60)


# =============================================================================
# Entry Point
# =============================================================================

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate call features dataset from audio clips and transcripts."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of clips to process (for testing)",
    )
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="Run smoke test with first 10 clips",
    )
    
    args = parser.parse_args()
    
    limit = args.limit
    if args.smoke_test:
        limit = 10
        print("Running SMOKE TEST (first 10 clips only)")
    
    # Validate paths
    audio_dir, asr_dir, out_dir = validate_paths()
    
    print(f"\nConfiguration:")
    print(f"  AUDIO_DIR: {audio_dir}")
    print(f"  ASR_DIR:   {asr_dir}")
    print(f"  OUT_DIR:   {out_dir}")
    
    # Process dataset
    rows, stats = process_dataset(audio_dir, asr_dir, limit=limit)
    
    if not rows:
        print("\nERROR: No rows generated. Check your input paths.")
        sys.exit(1)
    
    # Write outputs
    features_path, labeling_path = write_outputs(rows, out_dir)
    
    # Print summary
    print_summary(stats, features_path, labeling_path)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
