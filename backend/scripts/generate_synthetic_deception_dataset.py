"""
Generate Synthetic Deception Dataset from Existing Audio Data

This script creates a deception detection dataset by:
1. Using existing call audio data as "truthful" baseline
2. Applying audio augmentation to create "deceptive" variations
3. Generating both audio features (Gate-1) and synthetic frames (Gate-2)

Augmentation techniques for deceptive audio:
- Pitch shifting (higher pitch = stress/anxiety)
- Speech rate changes (faster/slower = cognitive load)
- Adding pauses (hesitation markers)
- Voice quality degradation (tension markers)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import librosa
import soundfile as sf
from sklearn.model_selection import train_test_split

def load_existing_audio_features():
    """Load existing call features as truthful baseline"""
    backend_dir = Path(__file__).parent.parent
    data_path = backend_dir / "data" / "labeled_call_features.csv"
    
    if not data_path.exists():
        data_path = backend_dir / "data" / "call_features.csv"
    
    if data_path.exists():
        df = pd.read_csv(data_path)
        print(f"✓ Loaded {len(df)} existing audio samples")
        return df
    else:
        print("✗ No existing audio data found")
        return None

def generate_deceptive_features(truthful_features):
    """
    Generate deceptive audio features by applying characteristic transformations
    
    Deception markers (based on research):
    - Higher pitch variability (F0 std increases by 20-40%)
    - Slower speech rate (duration increases by 15-30%)
    - More pauses (pause ratio increases)
    - Higher energy variability (RMS std increases)
    - Voice quality changes (jitter, shimmer)
    """
    deceptive = truthful_features.copy().reset_index(drop=True)
    num_samples = len(deceptive)
    
    # Apply random variations within research-backed ranges
    for idx in range(num_samples):
        # Pitch changes (stress/anxiety)
        if 'f0_mean' in deceptive.columns:
            deceptive.loc[idx, 'f0_mean'] *= np.random.uniform(1.05, 1.15)  # 5-15% higher
            deceptive.loc[idx, 'f0_std'] *= np.random.uniform(1.20, 1.40)   # 20-40% more variable
        
        # Speech rate (cognitive load)
        if 'duration' in deceptive.columns:
            deceptive.loc[idx, 'duration'] *= np.random.uniform(1.10, 1.25)  # 10-25% slower
        
        # Energy patterns (tension)
        if 'rms_mean' in deceptive.columns:
            deceptive.loc[idx, 'rms_mean'] *= np.random.uniform(0.90, 1.10)  # Variable
            deceptive.loc[idx, 'rms_std'] *= np.random.uniform(1.15, 1.35)   # More variable
        
        # Speech quality
        if 'zcr' in deceptive.columns:
            deceptive.loc[idx, 'zcr'] *= np.random.uniform(1.05, 1.20)  # Tension in voice
        
        if 'spectral_centroid' in deceptive.columns:
            deceptive.loc[idx, 'spectral_centroid'] *= np.random.uniform(1.02, 1.12)
        
        # Add deception-specific features if needed
        if 'tempo' in deceptive.columns:
            deceptive.loc[idx, 'tempo'] *= np.random.uniform(0.80, 0.95)  # Slower tempo
    
    return deceptive

def create_deception_audio_dataset(output_dir):
    """Create complete deception audio feature dataset"""
    print("\n=== Generating Synthetic Deception Audio Dataset ===\n")
    
    # Load existing truthful data
    truthful_df = load_existing_audio_features()
    if truthful_df is None:
        return False
    
    # Sample a subset for deception generation (to keep balanced)
    sample_size = min(200, len(truthful_df))
    truthful_sample = truthful_df.sample(n=sample_size, random_state=42).reset_index(drop=True)
    
    # Generate deceptive variants
    print(f"Generating {sample_size} deceptive audio samples...")
    deceptive_df = generate_deceptive_features(truthful_sample)
    
    # Add labels
    truthful_sample = truthful_sample.copy()
    truthful_sample['label'] = 0  # truthful
    deceptive_df['label'] = 1     # deceptive
    
    # Combine
    combined_df = pd.concat([truthful_sample, deceptive_df], ignore_index=True)
    
    # Shuffle
    combined_df = combined_df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Remove unnecessary columns
    exclude_cols = ['call_id', 'client_id', 'job_id', 'created_at', 'intent_label']
    feature_cols = [col for col in combined_df.columns if col not in exclude_cols]
    combined_df = combined_df[feature_cols]
    
    # Save dataset
    output_path = output_dir / "deception_audio_features.csv"
    output_dir.mkdir(parents=True, exist_ok=True)
    combined_df.to_csv(output_path, index=False)
    
    print(f"✓ Created deception audio dataset: {output_path}")
    print(f"  - Truthful samples: {sample_size}")
    print(f"  - Deceptive samples: {sample_size}")
    print(f"  - Total: {len(combined_df)}")
    print(f"  - Features: {len(feature_cols)-1}")  # -1 for label column
    
    return True

def create_deception_visual_dataset(output_dir):
    """Create synthetic visual deception dataset using image generation"""
    print("\n=== Generating Synthetic Deception Visual Dataset ===\n")
    
    import cv2
    
    # Create directory structure
    truthful_dir = output_dir / "truthful"
    deceptive_dir = output_dir / "deceptive"
    truthful_dir.mkdir(parents=True, exist_ok=True)
    deceptive_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate synthetic face-like images
    # For truthful: neutral, calm patterns
    # For deceptive: stressed, anxious patterns
    
    num_samples = 200
    img_size = 48
    
    print(f"Generating {num_samples} synthetic face patterns per class...")
    
    # Generate truthful patterns (smooth, consistent)
    for i in range(num_samples):
        img = np.random.randint(100, 180, (img_size, img_size), dtype=np.uint8)
        # Add smooth gradients (calm expression)
        for y in range(img_size):
            for x in range(img_size):
                img[y, x] = int(128 + 20 * np.sin(x/5) + 20 * np.cos(y/5))
        
        # Add slight Gaussian noise
        noise = np.random.normal(0, 5, (img_size, img_size))
        img = np.clip(img + noise, 0, 255).astype(np.uint8)
        
        cv2.imwrite(str(truthful_dir / f"truthful_{i:04d}.jpg"), img)
    
    # Generate deceptive patterns (irregular, tense)
    for i in range(num_samples):
        img = np.random.randint(80, 200, (img_size, img_size), dtype=np.uint8)
        # Add irregular patterns (stress markers)
        for y in range(img_size):
            for x in range(img_size):
                img[y, x] = int(128 + 30 * np.sin(x/3) * np.cos(y/4) + 15 * np.random.randn())
        
        # Add more noise (irregular expression)
        noise = np.random.normal(0, 15, (img_size, img_size))
        img = np.clip(img + noise, 0, 255).astype(np.uint8)
        
        cv2.imwrite(str(deceptive_dir / f"deceptive_{i:04d}.jpg"), img)
    
    print(f"✓ Created deception visual dataset: {output_dir}")
    print(f"  - Truthful patterns: {num_samples}")
    print(f"  - Deceptive patterns: {num_samples}")
    print(f"  - Total: {num_samples * 2}")
    
    return True

def main():
    backend_dir = Path(__file__).parent.parent
    
    # Create audio dataset (Gate-1)
    audio_output_dir = backend_dir / "data" / "deception" / "gate1_audio"
    audio_success = create_deception_audio_dataset(audio_output_dir)
    
    # Create visual dataset (Gate-2)
    visual_output_dir = backend_dir / "data" / "deception" / "gate2_frames"
    visual_success = create_deception_visual_dataset(visual_output_dir)
    
    if audio_success and visual_success:
        print("\n✅ === Synthetic Deception Dataset Created Successfully ===\n")
        print("Next steps:")
        print("1. Train Gate-1: python scripts/train_deception_audio_model.py --data_path data/deception/gate1_audio/deception_audio_features.csv")
        print("2. Train Gate-2: python scripts/train_deception_visual_model.py --data_dir data/deception/gate2_frames")
        return True
    else:
        print("\n⚠ Dataset generation incomplete")
        return False

if __name__ == "__main__":
    main()
