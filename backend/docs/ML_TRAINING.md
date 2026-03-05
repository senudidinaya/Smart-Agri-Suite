# ML Model Training System

## Overview

This document describes the offline ML training and runtime inference system for intent risk classification in the Smart Agri-Suite Cultivator Intent Module.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OFFLINE (Development)                        │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐  │
│  │ Labeled Data │───▶│ Training Script   │───▶│ Model Files  │  │
│  │ (CSV)        │    │ (train_intent_*.py)│    │ (.pkl)       │  │
│  └──────────────┘    └───────────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RUNTIME (API Server)                         │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐  │
│  │ API Request  │───▶│ IntentRiskClassifier│───▶│ Prediction  │  │
│  │ (features)   │    │ (load model once)  │    │ + Explanation│  │
│  └──────────────┘    └───────────────────┘    └──────────────┘  │
│                              │                                    │
│                     ┌────────┴────────┐                          │
│                     │                 │                          │
│              ┌──────▼──────┐  ┌───────▼──────┐                   │
│              │ ML Model    │  │ Rules-Based  │                   │
│              │ (if loaded) │  │ (fallback)   │                   │
│              └─────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```powershell
cd cultivatorIntentModule_Version2\backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Train the Model (Offline)

```powershell
# Train with sample data
python scripts/train_intent_risk_model.py

# Train with custom data
python scripts/train_intent_risk_model.py --data-path data/my_labeled_data.csv

# Train with Random Forest instead of Logistic Regression
python scripts/train_intent_risk_model.py --model-type random_forest
```

### 3. Start the Server

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will automatically detect and load the trained model.

### 4. Verify Model Loading

Check the health endpoint:
```powershell
curl http://localhost:8000/api/v1/health
```

Or check the server logs for:
```
INFO: ML model loaded successfully
```

## File Structure

```
backend/
├── data/
│   ├── labeled_call_features.csv    # Training dataset
│   └── DATASET_FORMAT.md            # Dataset documentation
├── models/
│   ├── intent_risk_model.pkl        # Trained model (after training)
│   ├── intent_risk_scaler.pkl       # Feature scaler
│   ├── intent_risk_label_encoder.pkl # Label encoder
│   └── model_metadata.json          # Training metadata
├── scripts/
│   └── train_intent_risk_model.py   # Offline training script
└── app/
    └── services/
        ├── inference.py             # Inference service (ML + rules)
        └── explainability.py        # DeepSeek explanations
```

## Dataset Format

See [data/DATASET_FORMAT.md](data/DATASET_FORMAT.md) for full details.

### Decision Labels

| Label   | Meaning                          |
|---------|----------------------------------|
| PROCEED | High intent, ready to transact   |
| VERIFY  | Uncertain, needs verification    |
| REJECT  | Low intent, unlikely to proceed  |

### Features

**Prosodic (from audio):**
- `pitch_mean`, `pitch_std` - Voice frequency characteristics
- `energy_mean`, `energy_std` - Volume/loudness
- `speech_rate` - Words per second
- `pause_ratio` - Silence to speech ratio
- `spectral_centroid_mean` - Voice brightness
- `mfcc_1_mean`, `mfcc_2_mean`, `mfcc_3_mean` - Spectral coefficients

**Text (from transcription):**
- `text_word_count` - Total words
- `positive_word_count`, `negative_word_count` - Sentiment indicators
- `question_count` - Number of questions
- `hesitation_count` - "um", "uh", etc.

## Inference Modes

### ML Model Mode

When trained model files exist in `models/`:
- Uses scikit-learn model for predictions
- Features are scaled using saved scaler
- Labels decoded using saved encoder
- Model version: `ml-1.0.0`

### Rules-Based Fallback

When no trained model is available:
- Uses heuristic rules based on features
- No external dependencies needed
- Model version: `rules-1.0.0`

**Rules logic:**
- High pitch variability → REJECT
- Many pauses/hesitations → REJECT
- More positive than negative words → PROCEED
- Many questions → VERIFY
- Low word count → REJECT

## DeepSeek Explainability (Optional)

To enable natural language explanations:

1. Get a DeepSeek API key from https://platform.deepseek.com/
2. Add to `.env`:
   ```
   DEEPSEEK_API_KEY=sk-your-key-here
   ```

The explainability service provides:
- Concise 2-3 sentence explanations
- Actionable recommendations
- Fallback to rule-based explanations if API unavailable

## Smoke Test

### Test Rules-Based Mode

1. Delete any existing model files:
   ```powershell
   Remove-Item -Path models\*.pkl -ErrorAction SilentlyContinue
   Remove-Item -Path models\*.json -ErrorAction SilentlyContinue
   ```

2. Start the server and check logs show "rules-based fallback"

3. Make a test prediction (should work with rules)

### Test ML Model Mode

1. Train the model:
   ```powershell
   python scripts/train_intent_risk_model.py
   ```

2. Restart the server

3. Check logs show "ML model loaded successfully"

4. Make a test prediction (should use ML model)

## Extending the System

### Adding More Training Data

1. Collect labeled call data
2. Extract prosodic features (using librosa or similar)
3. Extract text features (from transcription)
4. Add rows to `data/labeled_call_features.csv`
5. Re-run training script
6. Restart server to load new model

### Custom Model Types

The training script supports:
- `logistic_regression` (default, fast, interpretable)
- `random_forest` (handles non-linear patterns)

Add new models by modifying `scripts/train_intent_risk_model.py`.

## Troubleshooting

### "ML model not found, using rules-based fallback"

**Cause:** Model files not present in `models/` directory.

**Fix:** Run the training script:
```powershell
python scripts/train_intent_risk_model.py
```

### "Failed to load ML model"

**Cause:** Model files corrupted or incompatible.

**Fix:** Re-train the model:
```powershell
Remove-Item -Path models\*.pkl
python scripts/train_intent_risk_model.py
```

### Low prediction accuracy

**Cause:** Insufficient or unbalanced training data.

**Fix:**
- Add more labeled samples (aim for 100+ per class)
- Balance class distribution
- Try `random_forest` model type

### DeepSeek explanations not working

**Cause:** API key not set or network issues.

**Fix:**
- Verify `DEEPSEEK_API_KEY` in `.env`
- Check network connectivity
- System falls back to rule-based explanations automatically
