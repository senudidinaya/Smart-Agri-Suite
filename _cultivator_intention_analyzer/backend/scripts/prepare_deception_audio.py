#!/usr/bin/env python3
"""
Prepare Deception Audio Dataset for Gate 1 Training.

Extracts audio from deception detection video datasets and computes
prosodic features for truth/lie classification training.

Supports:
- Real-life Trial Deception Dataset (MP4 videos with truthful_/deceptive_ prefix)
- Bag-of-Lies dataset (with CSV annotations)
- Any folder of audio/video files organized as truthful/ and deceptive/ subdirectories

Usage:
    python scripts/prepare_deception_audio.py --input_dir data/deception/raw --output_dir data/deception/gate1_audio

    # With pre-organized folders:
    python scripts/prepare_deception_audio.py --input_dir data/deception/raw --output_dir data/deception/gate1_audio --folder_mode

Output:
    data/deception/gate1_audio/
    ├── audio/                     # Extracted WAV files
    │   ├── truthful_001.wav
    │   ├── deceptive_001.wav
    │   └── ...
    └── deception_audio_features.csv   # Features + labels
"""

import argparse
import csv
import io
import os
import subprocess
import sys
import warnings
from pathlib import Path

import numpy as np


def check_ffmpeg():
    """Check if FFmpeg is available."""
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def extract_audio_from_video(video_path: Path, output_path: Path, sr: int = 16000) -> bool:
    """Extract audio from video file using FFmpeg."""
    try:
        cmd = [
            "ffmpeg", "-i", str(video_path),
            "-vn",                    # No video
            "-acodec", "pcm_s16le",   # WAV format
            "-ar", str(sr),           # Sample rate
            "-ac", "1",               # Mono
            "-y",                     # Overwrite
            str(output_path),
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return output_path.exists()
    except subprocess.CalledProcessError:
        return False


def extract_prosodic_features(audio_path: Path) -> dict:
    """
    Extract prosodic features from audio file for deception detection.

    Features extracted:
    - duration_seconds: clip duration
    - rms_mean, rms_std: energy statistics
    - f0_mean, f0_std, f0_range: pitch statistics
    - zcr_mean: zero crossing rate
    - spectral_centroid_mean: spectral brightness
    - tempo_proxy: estimated tempo
    - speech_rate_variation: variability in speech rhythm
    - pause_ratio: ratio of silent frames to total frames
    - jitter: pitch perturbation (voice quality)
    - shimmer: amplitude perturbation (voice quality)
    - mfcc_1_mean through mfcc_5_mean: spectral shape
    - energy_contour_slope: energy trend over time
    """
    try:
        import librosa
        import soundfile as sf
    except ImportError:
        print("[ERROR] librosa and soundfile are required. Install with:")
        print("  pip install librosa soundfile")
        sys.exit(1)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")

        y, sr = librosa.load(str(audio_path), sr=16000, mono=True)

        if len(y) == 0:
            return None

        duration = len(y) / sr

        # RMS energy
        rms = librosa.feature.rms(y=y)[0]
        rms_mean = float(np.mean(rms)) if len(rms) > 0 else 0.0
        rms_std = float(np.std(rms)) if len(rms) > 0 else 0.0

        # Fundamental frequency (F0 / pitch)
        try:
            f0, voiced_flag, _ = librosa.pyin(
                y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C7"), sr=sr
            )
            f0_voiced = f0[~np.isnan(f0)] if f0 is not None else np.array([])
            f0_mean = float(np.mean(f0_voiced)) if len(f0_voiced) > 0 else 0.0
            f0_std = float(np.std(f0_voiced)) if len(f0_voiced) > 0 else 0.0
            f0_range = float(np.ptp(f0_voiced)) if len(f0_voiced) > 1 else 0.0
        except Exception:
            f0_mean, f0_std, f0_range = 0.0, 0.0, 0.0
            f0_voiced = np.array([])

        # Zero crossing rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        zcr_mean = float(np.mean(zcr))

        # Spectral centroid
        sc = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_centroid_mean = float(np.mean(sc))

        # Tempo
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo_proxy = float(tempo) if np.isscalar(tempo) else float(tempo[0])

        # --- Deception-specific features ---

        # Pause ratio (fraction of frames with very low energy)
        energy_threshold = 0.01 * np.max(rms) if np.max(rms) > 0 else 1e-6
        silent_frames = np.sum(rms < energy_threshold)
        pause_ratio = float(silent_frames / len(rms)) if len(rms) > 0 else 0.0

        # Speech rate variation (std of inter-onset intervals)
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
        if len(onset_frames) > 2:
            ioi = np.diff(librosa.frames_to_time(onset_frames, sr=sr))
            speech_rate_variation = float(np.std(ioi))
        else:
            speech_rate_variation = 0.0

        # Jitter (pitch perturbation) — indicator of vocal stress
        if len(f0_voiced) > 2:
            jitter = float(np.mean(np.abs(np.diff(f0_voiced))) / np.mean(f0_voiced))
        else:
            jitter = 0.0

        # Shimmer (amplitude perturbation)
        if len(rms) > 2:
            shimmer = float(np.mean(np.abs(np.diff(rms))) / np.mean(rms))
        else:
            shimmer = 0.0

        # MFCCs (spectral shape descriptors)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=5)
        mfcc_means = [float(np.mean(mfccs[i])) for i in range(5)]

        # Energy contour slope (rising/falling energy over clip)
        if len(rms) > 1:
            x = np.arange(len(rms))
            slope = np.polyfit(x, rms, 1)[0]
            energy_contour_slope = float(slope)
        else:
            energy_contour_slope = 0.0

        return {
            "duration_seconds": round(duration, 2),
            "rms_mean": round(rms_mean, 6),
            "rms_std": round(rms_std, 6),
            "f0_mean": round(f0_mean, 2),
            "f0_std": round(f0_std, 2),
            "f0_range": round(f0_range, 2),
            "zcr_mean": round(zcr_mean, 6),
            "spectral_centroid_mean": round(spectral_centroid_mean, 2),
            "tempo_proxy": round(tempo_proxy, 2),
            "pause_ratio": round(pause_ratio, 4),
            "speech_rate_variation": round(speech_rate_variation, 4),
            "jitter": round(jitter, 6),
            "shimmer": round(shimmer, 6),
            "mfcc_1_mean": round(mfcc_means[0], 4),
            "mfcc_2_mean": round(mfcc_means[1], 4),
            "mfcc_3_mean": round(mfcc_means[2], 4),
            "mfcc_4_mean": round(mfcc_means[3], 4),
            "mfcc_5_mean": round(mfcc_means[4], 4),
            "energy_contour_slope": round(energy_contour_slope, 8),
        }


def detect_label_from_filename(filename: str) -> str:
    """Detect truth/deception label from filename conventions."""
    name_lower = filename.lower()
    if any(t in name_lower for t in ["truthful", "truth", "honest", "genuine"]):
        return "truthful"
    elif any(t in name_lower for t in ["deceptive", "deception", "lie", "lying", "fake"]):
        return "deceptive"
    return "unknown"


def detect_label_from_folder(folder_name: str) -> str:
    """Detect label from parent folder name."""
    name_lower = folder_name.lower()
    if any(t in name_lower for t in ["truthful", "truth", "honest", "genuine"]):
        return "truthful"
    elif any(t in name_lower for t in ["deceptive", "deception", "lie", "lying", "fake"]):
        return "deceptive"
    return "unknown"


def main():
    parser = argparse.ArgumentParser(
        description="Prepare deception audio dataset for Gate 1 training"
    )
    parser.add_argument(
        "--input_dir", type=str, required=True,
        help="Directory containing video/audio files (or truthful/deceptive subfolders)"
    )
    parser.add_argument(
        "--output_dir", type=str, default="data/deception/gate1_audio",
        help="Output directory for extracted audio and features CSV"
    )
    parser.add_argument(
        "--folder_mode", action="store_true",
        help="Use subfolder names (truthful/, deceptive/) as labels instead of filename prefixes"
    )
    parser.add_argument(
        "--sr", type=int, default=16000,
        help="Target sample rate for audio extraction (default: 16000)"
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    audio_dir = output_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        print(f"[ERROR] Input directory not found: {input_dir}")
        sys.exit(1)

    has_ffmpeg = check_ffmpeg()
    video_exts = {".mp4", ".avi", ".mkv", ".mov", ".webm", ".flv"}
    audio_exts = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}

    # Collect files
    files_with_labels = []

    if args.folder_mode:
        # Look for truthful/ and deceptive/ subdirectories
        for subfolder in input_dir.iterdir():
            if not subfolder.is_dir():
                continue
            label = detect_label_from_folder(subfolder.name)
            if label == "unknown":
                print(f"[WARN] Skipping unrecognized folder: {subfolder.name}")
                continue
            for f in subfolder.iterdir():
                if f.suffix.lower() in video_exts | audio_exts:
                    files_with_labels.append((f, label))
    else:
        # Use filename prefix to determine label
        for f in input_dir.iterdir():
            if f.suffix.lower() in video_exts | audio_exts:
                label = detect_label_from_filename(f.name)
                if label == "unknown":
                    print(f"[WARN] Cannot determine label for: {f.name}, skipping")
                    continue
                files_with_labels.append((f, label))

    if not files_with_labels:
        print("[ERROR] No labeled files found. Check input directory and naming convention.")
        print("  Expected: files named truthful_*.mp4 / deceptive_*.mp4")
        print("  Or use --folder_mode with truthful/ and deceptive/ subdirectories")
        sys.exit(1)

    print(f"[INFO] Found {len(files_with_labels)} labeled files")
    truthful_count = sum(1 for _, l in files_with_labels if l == "truthful")
    deceptive_count = sum(1 for _, l in files_with_labels if l == "deceptive")
    print(f"  Truthful: {truthful_count}")
    print(f"  Deceptive: {deceptive_count}")

    # Process files
    features_list = []
    FEATURE_COLUMNS = [
        "clip_id", "audio_path", "label",
        "duration_seconds", "rms_mean", "rms_std",
        "f0_mean", "f0_std", "f0_range",
        "zcr_mean", "spectral_centroid_mean", "tempo_proxy",
        "pause_ratio", "speech_rate_variation",
        "jitter", "shimmer",
        "mfcc_1_mean", "mfcc_2_mean", "mfcc_3_mean", "mfcc_4_mean", "mfcc_5_mean",
        "energy_contour_slope",
    ]

    for idx, (filepath, label) in enumerate(sorted(files_with_labels)):
        clip_id = f"{label}_{idx:04d}"
        wav_path = audio_dir / f"{clip_id}.wav"

        print(f"[{idx+1}/{len(files_with_labels)}] Processing {filepath.name} ({label})")

        # Extract audio if video
        if filepath.suffix.lower() in video_exts:
            if not has_ffmpeg:
                print("  [SKIP] FFmpeg not found — cannot extract audio from video")
                continue
            success = extract_audio_from_video(filepath, wav_path, sr=args.sr)
            if not success:
                print(f"  [FAIL] Could not extract audio from {filepath.name}")
                continue
        elif filepath.suffix.lower() in audio_exts:
            # Copy or convert audio
            if filepath.suffix.lower() == ".wav":
                import shutil
                shutil.copy2(filepath, wav_path)
            elif has_ffmpeg:
                extract_audio_from_video(filepath, wav_path, sr=args.sr)
            else:
                print(f"  [SKIP] Cannot convert {filepath.suffix} without FFmpeg")
                continue

        # Extract features
        features = extract_prosodic_features(wav_path)
        if features is None:
            print(f"  [FAIL] Could not extract features from {wav_path.name}")
            continue

        row = {
            "clip_id": clip_id,
            "audio_path": str(wav_path),
            "label": label,
            **features,
        }
        features_list.append(row)
        print(f"  [OK] {clip_id}: duration={features['duration_seconds']}s, "
              f"f0_mean={features['f0_mean']}, pause_ratio={features['pause_ratio']}")

    # Save features CSV
    csv_path = output_dir / "deception_audio_features.csv"

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FEATURE_COLUMNS)
        writer.writeheader()
        writer.writerows(features_list)

    print(f"\n{'='*60}")
    print(f"[DONE] Processed {len(features_list)} clips")
    print(f"  Truthful:  {sum(1 for r in features_list if r['label'] == 'truthful')}")
    print(f"  Deceptive: {sum(1 for r in features_list if r['label'] == 'deceptive')}")
    print(f"  Features CSV: {csv_path}")
    print(f"  Audio files:  {audio_dir}")


if __name__ == "__main__":
    main()
