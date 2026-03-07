"""
Download Real-life Trial Deception Detection Dataset
Source: University of Michigan (Pérez-Rosas et al., ACL 2015)

This script downloads the Real-life Trial dataset containing deceptive and truthful
video clips from courtroom trials.
"""

import os
import urllib.request
import zipfile
from pathlib import Path
import json

# Dataset information
DATASET_URL = "https://web.eecs.umich.edu/~mihalcea/downloads/TrialDeception/trial.zip"
DATASET_NAME = "Real-life Trial Deception Dataset"

def download_file(url, dest_path):
    """Download file with progress indication"""
    print(f"Downloading from: {url}")
    print(f"Destination: {dest_path}")
    
    def report_progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        if total_size > 0:
            percent = min(100, downloaded * 100 / total_size)
            print(f"\rProgress: {percent:.1f}% ({downloaded}/{total_size} bytes)", end="")
    
    try:
        urllib.request.urlretrieve(url, dest_path, reporthook=report_progress)
        print("\n✓ Download completed")
        return True
    except Exception as e:
        print(f"\n✗ Download failed: {e}")
        return False

def extract_zip(zip_path, extract_to):
    """Extract ZIP archive"""
    print(f"\nExtracting {zip_path} to {extract_to}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        print("✓ Extraction completed")
        return True
    except Exception as e:
        print(f"✗ Extraction failed: {e}")
        return False

def organize_files(raw_dir):
    """Organize files into truthful and deceptive folders"""
    print("\nOrganizing files...")
    
    truthful_dir = raw_dir / "truthful"
    deceptive_dir = raw_dir / "deceptive"
    
    truthful_dir.mkdir(exist_ok=True)
    deceptive_dir.mkdir(exist_ok=True)
    
    # Move files based on naming convention
    moved_count = {"truthful": 0, "deceptive": 0}
    
    for file in raw_dir.glob("*.mp4"):
        filename = file.name.lower()
        
        if "truth" in filename or "honest" in filename:
            dest = truthful_dir / file.name
            if not dest.exists():
                file.rename(dest)
                moved_count["truthful"] += 1
        elif "lie" in filename or "decep" in filename:
            dest = deceptive_dir / file.name
            if not dest.exists():
                file.rename(dest)
                moved_count["deceptive"] += 1
    
    print(f"✓ Organized {moved_count['truthful']} truthful and {moved_count['deceptive']} deceptive videos")
    return moved_count

def main():
    # Setup paths
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    raw_dir = backend_dir / "data" / "deception" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    zip_path = raw_dir / "trial.zip"
    
    print(f"=== {DATASET_NAME} Download ===\n")
    
    # Download dataset
    if not zip_path.exists():
        success = download_file(DATASET_URL, zip_path)
        if not success:
            print("\n⚠ Download failed. Trying alternative approach...")
            print(f"\nPlease manually download from:")
            print(f"  {DATASET_URL}")
            print(f"\nSave it to: {zip_path}")
            return
    else:
        print(f"✓ Dataset already downloaded: {zip_path}")
    
    # Extract archive
    extract_success = extract_zip(zip_path, raw_dir)
    if not extract_success:
        print("\n⚠ Extraction failed")
        return
    
    # Organize files
    stats = organize_files(raw_dir)
    
    # Save metadata
    metadata = {
        "dataset_name": DATASET_NAME,
        "source": DATASET_URL,
        "paper": "Pérez-Rosas et al., Deception Detection using Real-Life Trial Data, ACL 2015",
        "total_videos": sum(stats.values()),
        "truthful_count": stats["truthful"],
        "deceptive_count": stats["deceptive"],
        "download_date": str(Path(zip_path).stat().st_mtime)
    }
    
    metadata_path = raw_dir / "dataset_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✓ Metadata saved to: {metadata_path}")
    print("\n=== Download Complete ===")
    print(f"\nNext steps:")
    print(f"1. Extract audio: python scripts/prepare_deception_audio.py --input_dir data/deception/raw --output_dir data/deception/gate1_audio --folder_mode")
    print(f"2. Extract frames: python scripts/prepare_deception_frames.py --input_dir data/deception/raw --output_dir data/deception/gate2_frames --folder_mode")
    print(f"3. Train Gate-1: python scripts/train_deception_audio_model.py --data_path data/deception/gate1_audio/deception_audio_features.csv")
    print(f"4. Train Gate-2: python scripts/train_deception_visual_model.py --data_dir data/deception/gate2_frames")

if __name__ == "__main__":
    main()
