# Offline Dataset Generator

This script generates a feature-rich CSV dataset from audio clips and their transcripts for ML training. It is completely offline - no API calls, no database connections, no web server.

## Features Extracted

### Audio/Prosodic Features
| Feature | Description |
|---------|-------------|
| `duration_seconds` | Audio duration in seconds |
| `rms_mean` | Mean RMS energy |
| `rms_std` | Standard deviation of RMS energy |
| `f0_mean` | Mean fundamental frequency (pitch) |
| `f0_std` | Standard deviation of F0 |
| `zcr_mean` | Mean zero crossing rate |
| `spectral_centroid_mean` | Mean spectral centroid |
| `tempo_proxy` | Speaking pace proxy (onset-based) |

### Text Red Flag Features
| Feature | Pattern |
|---------|---------|
| `urgency_count` | urgent, now, today, immediately, quick, fast |
| `money_count` | money, pay, payment, cash, deposit, transfer |
| `secrecy_count` | secret, don't tell, keep it confidential |
| `pressure_count` | trust me, believe me, guarantee, promise |
| `id_avoidance_count` | no id, no nic, can't share, don't ask |
| `otp_pin_count` | otp, pin, code |
| `transcript_char_len` | Character length of transcript |
| `transcript_word_count` | Word count of transcript |

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUDIO_DIR` | Path to folder containing WAV audio clips | `C:\Users\senud\Documents\FINAL YEAR RESEARCH\Voice_Dataset` |
| `ASR_DIR` | Path to folder containing JSON transcripts + asr_summary.csv | `C:\Users\senud\Documents\FINAL YEAR RESEARCH\asr_outputs\content\asr_outputs` |
| `OUT_DIR` | Output directory for CSVs (default: `./data/`) | `./data/` |

## PowerShell Run Instructions

### Step 1: Navigate to Backend Directory
```powershell
cd "C:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\backend"
```

### Step 2: Activate Virtual Environment
```powershell
.\.venv\Scripts\Activate.ps1
```

### Step 3: Install Required Packages
```powershell
pip install librosa scipy numpy pandas python-dotenv
```

### Step 4: Set Environment Variables
```powershell
$env:AUDIO_DIR = "C:\Users\senud\Documents\FINAL YEAR RESEARCH\Voice_Dataset"
$env:ASR_DIR = "C:\Users\senud\Documents\FINAL YEAR RESEARCH\asr_outputs\content\asr_outputs"
$env:OUT_DIR = "./data/"
```

### Step 5: Run Smoke Test (First 10 Clips)
```powershell
python scripts/generate_call_features_dataset.py --smoke-test
```

### Step 6: Run Full Dataset Generation
```powershell
python scripts/generate_call_features_dataset.py
```

## Expected Output

The script generates two CSV files in `OUT_DIR`:

1. **`call_features.csv`** - Full feature dataset for ML training
   - All audio and text features
   - Ready for model training

2. **`call_features_for_labeling.csv`** - For manual labeling
   - Contains `clip_id`, `transcript`, `human_label`, `notes`
   - Use this to add ground truth labels

## Verification Summary

At the end of execution, you'll see a summary like:

```
============================================================
VERIFICATION SUMMARY
============================================================

  Total WAV files found:        625
  Total JSON transcripts found: 625
  asr_summary.csv found:        True
  
  Total rows exported:          623
  Rows missing transcript:      2
  Skipped (corrupted audio):    2

  Output files:
    - ./data/call_features.csv
    - ./data/call_features_for_labeling.csv

============================================================
DATASET GENERATION COMPLETE
============================================================
```

## Error Handling

The script handles:
- **Missing JSON transcripts**: Falls back to `asr_summary.csv`
- **Empty transcripts**: Includes row with empty transcript
- **Corrupted audio files**: Skips gracefully and logs clip_id
- **Missing directories**: Exits with clear error message

## One-Liner Full Run

```powershell
cd "C:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\backend"; .\.venv\Scripts\Activate.ps1; $env:AUDIO_DIR = "C:\Users\senud\Documents\FINAL YEAR RESEARCH\Voice_Dataset"; $env:ASR_DIR = "C:\Users\senud\Documents\FINAL YEAR RESEARCH\asr_outputs\content\asr_outputs"; python scripts/generate_call_features_dataset.py
```
