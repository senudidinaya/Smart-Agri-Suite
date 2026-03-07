#!/usr/bin/env python3
"""
Prepare Deception Visual Dataset for Gate 2 Training.

Extracts facial frames from deception detection video datasets and organizes
them into a folder-per-class structure for training the Gate 2 visual model.

Supports:
- Real-life Trial Deception Dataset (MP4 videos with truthful_/deceptive_ prefix)
- Bag-of-Lies dataset (with CSV annotations)
- Any folder of videos organized as truthful/ and deceptive/ subdirectories

Usage:
    python scripts/prepare_deception_frames.py --input_dir data/deception/raw --output_dir data/deception/gate2_frames

    # With pre-organized folders:
    python scripts/prepare_deception_frames.py --input_dir data/deception/raw --output_dir data/deception/gate2_frames --folder_mode

Output:
    data/deception/gate2_frames/
    ├── truthful/
    │   ├── truthful_0000_frame_00.jpg
    │   ├── truthful_0000_frame_01.jpg
    │   └── ...
    └── deceptive/
        ├── deceptive_0000_frame_00.jpg
        ├── deceptive_0000_frame_01.jpg
        └── ...
"""

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np


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


def extract_face_frames(
    video_path: str,
    output_dir: Path,
    clip_id: str,
    target_fps: float = 1.0,
    max_frames: int = 30,
    face_size: tuple = (128, 128),
) -> int:
    """
    Extract face-cropped frames from a video file.

    Args:
        video_path: Path to video file
        output_dir: Directory to save extracted frames
        clip_id: Prefix for output filenames
        target_fps: Target extraction rate (frames per second)
        max_frames: Maximum frames to extract per video
        face_size: Output face image size (width, height)

    Returns:
        Number of frames successfully extracted
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"  [ERROR] Cannot open video: {video_path}")
        return 0

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames_count / fps if fps > 0 else 0

    # Calculate frame interval for target FPS
    frame_interval = max(1, int(fps / target_fps))

    # Load Haar cascade for face detection
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)

    if face_cascade.empty():
        print("  [ERROR] Failed to load Haar cascade face detector")
        cap.release()
        return 0

    frame_idx = 0
    extracted = 0

    while cap.isOpened() and extracted < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            # Detect face
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
            )

            if len(faces) > 0:
                # Use largest face
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

                # Add margin around face
                margin = int(0.2 * max(w, h))
                x1 = max(0, x - margin)
                y1 = max(0, y - margin)
                x2 = min(frame.shape[1], x + w + margin)
                y2 = min(frame.shape[0], y + h + margin)

                face = frame[y1:y2, x1:x2]

                if face.size > 0:
                    face_resized = cv2.resize(face, face_size)
                    out_path = output_dir / f"{clip_id}_frame_{extracted:02d}.jpg"
                    cv2.imwrite(str(out_path), face_resized)
                    extracted += 1

        frame_idx += 1

    cap.release()
    return extracted


def extract_full_frames(
    video_path: str,
    output_dir: Path,
    clip_id: str,
    target_fps: float = 1.0,
    max_frames: int = 30,
    frame_size: tuple = (224, 224),
) -> int:
    """
    Extract full (non-cropped) frames from a video file.
    Used as fallback when face detection is not needed or faces are not detected.
    """
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return 0

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = max(1, int(fps / target_fps))

    frame_idx = 0
    extracted = 0

    while cap.isOpened() and extracted < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            resized = cv2.resize(frame, frame_size)
            out_path = output_dir / f"{clip_id}_frame_{extracted:02d}.jpg"
            cv2.imwrite(str(out_path), resized)
            extracted += 1

        frame_idx += 1

    cap.release()
    return extracted


def main():
    parser = argparse.ArgumentParser(
        description="Prepare deception visual dataset for Gate 2 training"
    )
    parser.add_argument(
        "--input_dir", type=str, required=True,
        help="Directory containing video files (or truthful/deceptive subfolders)",
    )
    parser.add_argument(
        "--output_dir", type=str, default="data/deception/gate2_frames",
        help="Output directory for extracted frames",
    )
    parser.add_argument(
        "--folder_mode", action="store_true",
        help="Use subfolder names (truthful/, deceptive/) as labels instead of filename prefixes",
    )
    parser.add_argument(
        "--target_fps", type=float, default=1.0,
        help="Target frame extraction rate (frames per second, default: 1.0)",
    )
    parser.add_argument(
        "--max_frames", type=int, default=30,
        help="Maximum frames to extract per video (default: 30)",
    )
    parser.add_argument(
        "--face_size", type=int, default=128,
        help="Output face image size (square, default: 128)",
    )
    parser.add_argument(
        "--no_face_crop", action="store_true",
        help="Skip face detection, save full frames instead",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)

    if not input_dir.exists():
        print(f"[ERROR] Input directory not found: {input_dir}")
        sys.exit(1)

    video_exts = {".mp4", ".avi", ".mkv", ".mov", ".webm", ".flv"}

    # Collect video files with labels
    files_with_labels = []

    if args.folder_mode:
        for subfolder in input_dir.iterdir():
            if not subfolder.is_dir():
                continue
            label = detect_label_from_folder(subfolder.name)
            if label == "unknown":
                print(f"[WARN] Skipping unrecognized folder: {subfolder.name}")
                continue
            for f in subfolder.iterdir():
                if f.suffix.lower() in video_exts:
                    files_with_labels.append((f, label))
    else:
        for f in input_dir.iterdir():
            if f.suffix.lower() in video_exts:
                label = detect_label_from_filename(f.name)
                if label == "unknown":
                    print(f"[WARN] Cannot determine label for: {f.name}, skipping")
                    continue
                files_with_labels.append((f, label))

    if not files_with_labels:
        print("[ERROR] No labeled video files found.")
        print("  Expected: files named truthful_*.mp4 / deceptive_*.mp4")
        print("  Or use --folder_mode with truthful/ and deceptive/ subdirectories")
        sys.exit(1)

    print(f"[INFO] Found {len(files_with_labels)} labeled videos")
    truthful_count = sum(1 for _, l in files_with_labels if l == "truthful")
    deceptive_count = sum(1 for _, l in files_with_labels if l == "deceptive")
    print(f"  Truthful:  {truthful_count}")
    print(f"  Deceptive: {deceptive_count}")

    # Create output directories
    truthful_dir = output_dir / "truthful"
    deceptive_dir = output_dir / "deceptive"
    truthful_dir.mkdir(parents=True, exist_ok=True)
    deceptive_dir.mkdir(parents=True, exist_ok=True)

    total_frames = 0
    total_truthful_frames = 0
    total_deceptive_frames = 0

    face_size = (args.face_size, args.face_size)

    for idx, (filepath, label) in enumerate(sorted(files_with_labels)):
        clip_id = f"{label}_{idx:04d}"
        label_dir = truthful_dir if label == "truthful" else deceptive_dir

        print(f"[{idx+1}/{len(files_with_labels)}] {filepath.name} ({label})")

        if args.no_face_crop:
            n_frames = extract_full_frames(
                str(filepath), label_dir, clip_id,
                target_fps=args.target_fps,
                max_frames=args.max_frames,
                frame_size=face_size,
            )
        else:
            n_frames = extract_face_frames(
                str(filepath), label_dir, clip_id,
                target_fps=args.target_fps,
                max_frames=args.max_frames,
                face_size=face_size,
            )

            # Fallback to full frames if no faces detected
            if n_frames == 0:
                print("  [INFO] No faces detected, extracting full frames as fallback")
                n_frames = extract_full_frames(
                    str(filepath), label_dir, clip_id,
                    target_fps=args.target_fps,
                    max_frames=args.max_frames,
                    frame_size=face_size,
                )

        if label == "truthful":
            total_truthful_frames += n_frames
        else:
            total_deceptive_frames += n_frames
        total_frames += n_frames

        print(f"  [OK] Extracted {n_frames} frames")

    print(f"\n{'='*60}")
    print(f"[DONE] Total frames extracted: {total_frames}")
    print(f"  Truthful frames:  {total_truthful_frames} (in {truthful_dir})")
    print(f"  Deceptive frames: {total_deceptive_frames} (in {deceptive_dir})")
    print(f"\nDataset structure:")
    print(f"  {output_dir}/")
    print(f"  ├── truthful/   ({total_truthful_frames} images)")
    print(f"  └── deceptive/  ({total_deceptive_frames} images)")


if __name__ == "__main__":
    main()
