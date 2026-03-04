# Gate 2 Build & Verify Guide

This document provides step-by-step instructions for building and verifying the Gate 2 video interview analysis system.

## Overview

Gate 2 analyzes video interviews to assess safety/trust risk based on facial expressions.
- **Input**: Video recording from in-person interview
- **Output**: PROCEED / VERIFY / REJECT with confidence and emotion signals
- **Privacy**: Video is deleted immediately after analysis
- **ML Approach**: HOG features + RandomForest classifier (no TensorFlow required)

## Prerequisites

- Python 3.10+
- Node.js 18+
- Expo CLI

---

## Part 1: Backend Setup

### 1.1 Create Virtual Environment

```powershell
cd "C:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\backend"

# Create virtual environment (if not exists)
python -m venv .venv

# Activate
.\.venv\Scripts\Activate.ps1
```

### 1.2 Install Dependencies

```powershell
# Install all requirements including Gate 2 dependencies
pip install -r requirements.txt
```

Gate 2 dependencies:
- `opencv-python>=4.9.0` - Video frame extraction + Haar cascade face detection
- `scikit-learn>=1.4.0` - RandomForest classifier
- `Pillow>=10.2.0` - Image processing
- `joblib>=1.3.0` - Model serialization

### 1.3 Prepare Dataset

**Option A: Use Synthetic Data (for testing)**

```powershell
python scripts/generate_synthetic_data.py --samples_per_class 100
```

**Option B: Use Real Dataset (for production)**

1. Download a facial expression dataset:
   - FER2013: https://www.kaggle.com/datasets/msambare/fer2013
   - AffectNet: https://www.affectnet.net/
   - IEEE DataPort "Facial Expression Dataset (Sri Lankan)"
   
2. Extract to: `data/gate2/dataset/`
3. Expected structure (folder-per-class):

```
data/gate2/dataset/
├── angry/
│   ├── image1.jpg
│   └── ...
├── fear/
├── happy/
├── neutral/
├── sad/
└── surprise/
```

---

## Part 2: Model Training

### 2.1 Run Training Script

```powershell
cd "C:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\backend"
.\.venv\Scripts\Activate.ps1

# Train with default paths
python scripts/train_gate2_expression_model.py

# Or with custom paths
python scripts/train_gate2_expression_model.py `
    --data_dir "data/gate2/dataset" `
    --output_dir "models/gate2"
```

### 2.2 Training Output

The script will:
1. Load images from folder-per-class structure
2. Extract HOG + pixel features from each image
3. Split 80/20 train/validation
4. Train RandomForest classifier (200 trees)
5. Print accuracy, classification report, confusion matrix
6. Save artifacts to `models/gate2/`:
   - `gate2_expression_model.pkl` - Trained classifier
   - `gate2_scaler.pkl` - Feature scaler
   - `gate2_class_names.json` - Emotion classes
   - `gate2_model_metadata.json` - Training metadata

### 2.3 Smoke Test

```powershell
python scripts/smoke_test_gate2_model.py
```

Expected output:
```
============================================================
Gate 2 Model Smoke Test
============================================================

[1] Checking model files...
    ✓ models\gate2\gate2_expression_model.pkl
    ✓ models\gate2\gate2_scaler.pkl
    ✓ models\gate2\gate2_class_names.json

[2] Loading model artifacts...
    ✓ Model loaded
    ✓ Scaler loaded
    ✓ Class names loaded: ['angry', 'fear', 'happy', 'neutral', 'sad', 'surprise']

[3] Testing inference with synthetic image...
    ✓ Features extracted: shape=(4068,)
    ✓ Features scaled
    ✓ Prediction: happy (confidence: 45.2%)

[5] Testing face detection (Haar cascade)...
    ✓ Haar cascade loaded
    ✓ Face detection ran

============================================================
Smoke Test PASSED!
============================================================
```

---

## Part 3: Start Backend Server

```powershell
cd "C:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\backend"
.\.venv\Scripts\Activate.ps1

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
[INFO] Gate 2 model loaded successfully. Classes: ['angry', 'fear', ...]
```

---

## Part 4: Frontend Setup

### 4.1 Install Dependencies

```powershell
cd "C:\Senudi's University\Research Project\Smart-Agri-Suite\cultivatorIntentModule_Version2\frontend"

npm install
```

### 4.2 Configure API URL

Edit `src/api/config.ts`:

```typescript
export const API_BASE_URL = 'http://192.168.1.9:8000/api/v1';
```

Replace `192.168.1.9` with your machine's local IP.

### 4.3 Start Expo

```powershell
npx expo start
```

---

## Part 5: End-to-End Test

### 5.1 Create Test Interview

1. Login as admin
2. Navigate to a job's applicant list
3. Click "Schedule Interview" for an applicant
4. Select "In-Person Interview"

### 5.2 Record Interview

1. Login as the applicant (client)
2. Open the pending interview
3. Grant camera permissions
4. Record a short video (5-15 seconds)
5. Tap "Analyze"

### 5.3 Verify Results

The app should display:
- Decision: APPROVE / VERIFY / REJECT
- Confidence percentage
- Emotion distribution bars
- Top signals explaining the decision

---

## Troubleshooting

### Model not loaded

If you see "Gate 2 ML model not loaded":
1. Check model files exist in `models/gate2/`
2. Run smoke test to verify model loads
3. Check server logs for loading errors

### No faces detected

If face detection rate is 0%:
1. Ensure adequate lighting
2. Face the camera directly
3. The Haar cascade may miss angled/occluded faces

### Low accuracy

For production use:
1. Replace synthetic data with a real facial expression dataset
2. Use more training images (1000+ per class recommended)
3. Consider data augmentation (flipping, rotation, brightness)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Mobile App (React Native)               │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  InPersonInterviewScreen.tsx                            │ │
│  │  - Camera recording                                      │ │
│  │  - Video upload                                          │ │
│  │  - Result display (emotion bars, signals)               │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  POST /api/v1/admin/interviews/{job}/{client}/analyze   │ │
│  │  - Receives video file                                   │ │
│  │  - Calls Gate2InferenceService                          │ │
│  │  - Returns decision + emotion analysis                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                 Gate2InferenceService                         │
│                                                              │
│  1. Extract frames (1 FPS, max 60)                          │
│  2. Detect faces (Haar cascade)                             │
│  3. Extract HOG + pixel features                            │
│  4. Predict emotions (RandomForest)                         │
│  5. Aggregate predictions                                    │
│  6. Map to decision (PROCEED/VERIFY/REJECT)                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Files Modified/Created

### Backend
- `scripts/train_gate2_expression_model.py` - Training script
- `scripts/smoke_test_gate2_model.py` - Model verification
- `scripts/generate_synthetic_data.py` - Synthetic data generator
- `app/services/gate2_inference.py` - Inference service
- `app/schemas/interview.py` - Added Gate2AnalysisStats
- `app/api/v1/endpoints/interviews.py` - Integrated Gate 2
- `requirements.txt` - Added OpenCV, sklearn dependencies
- `models/gate2/` - Model artifacts directory

### Frontend
- `src/screens/InPersonInterviewScreen.tsx` - Enhanced with emotion display
