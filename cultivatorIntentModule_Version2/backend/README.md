# Cultivator Intention Prediction API

> Smart Agri-Suite - Backend for Voice-Based Cultivator Intention Classification

A FastAPI-based backend service that analyzes voice recordings to predict buyer intent using paralinguistic features (tone, pitch, pace, prosody, etc.).

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── api/
│   │   └── v1/
│   │       ├── routes.py       # API router configuration
│   │       └── endpoints/
│   │           ├── health.py   # Health check endpoints
│   │           └── predict.py  # Prediction endpoints
│   ├── core/
│   │   ├── config.py           # Pydantic settings configuration
│   │   ├── logging.py          # Structured logging setup
│   │   └── middleware.py       # Correlation ID & request logging
│   ├── schemas/
│   │   ├── health.py           # Health response models
│   │   └── prediction.py       # Prediction request/response models
│   ├── services/
│   │   └── inference.py        # Intent classification service
│   └── utils/
│       └── audio.py            # Audio processing utilities
├── tests/
│   ├── conftest.py             # Pytest fixtures
│   ├── test_health.py          # Health endpoint tests
│   └── test_predict.py         # Prediction endpoint tests
├── .env                        # Environment configuration
├── .env.example                # Environment template
├── requirements.txt            # Python dependencies
├── pyproject.toml              # Tool configuration
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Create Virtual Environment & Install Dependencies

```powershell
# Navigate to the backend directory
cd cultivatorIntentModule_Version2/backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 2. Run the Development Server

```powershell
# Make sure virtual environment is activated
# Start the server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Root**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 3. Run Tests

```powershell
# Run all tests with verbose output
pytest -v

# Run specific test file
pytest tests/test_health.py -v

# Run with coverage (install pytest-cov first)
pip install pytest-cov
pytest --cov=app --cov-report=html
```

### 4. Verify Installation (Smoke Test)

```powershell
# Health check
curl http://localhost:8000/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-04T10:30:00.000000+00:00",
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "model_loaded": true,
    "inference_ready": true
  }
}
```

## 📡 API Endpoints

### Health Check

```http
GET /api/v1/health
```

Returns system health status and model readiness.

### Readiness Check

```http
GET /api/v1/ready
```

Returns simple ready/not-ready status.

### Predict from Audio Upload

```http
POST /api/v1/predict/upload
Content-Type: multipart/form-data
```

Upload an audio file to predict buyer intent.

**cURL Example:**
```powershell
curl -X POST "http://localhost:8000/api/v1/predict/upload" `
  -H "Content-Type: multipart/form-data" `
  -F "audio_file=@sample_audio.wav"
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "predicted_intent": "high_intent",
    "confidence": 0.8723,
    "all_scores": [
      {"label": "high_intent", "score": 0.8723},
      {"label": "medium_intent", "score": 0.0891},
      {"label": "low_intent", "score": 0.0312},
      {"label": "no_intent", "score": 0.0074}
    ]
  },
  "processing_time_ms": 156.32,
  "audio_duration_seconds": 5.2,
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Predict from Base64 Audio

```http
POST /api/v1/predict/base64
Content-Type: application/json
```

Submit base64-encoded audio to predict buyer intent.

**cURL Example:**
```powershell
# First, encode your audio file to base64
$base64Audio = [Convert]::ToBase64String([IO.File]::ReadAllBytes("sample_audio.wav"))

# Then make the request
curl -X POST "http://localhost:8000/api/v1/predict/base64" `
  -H "Content-Type: application/json" `
  -d "{\"audio_base64\": \"$base64Audio\", \"audio_format\": \"wav\"}"
```

**Or with inline base64 (for testing):**
```powershell
curl -X POST "http://localhost:8000/api/v1/predict/base64" `
  -H "Content-Type: application/json" `
  -d '{"audio_base64": "UklGRiQAAABXQVZFZm10...", "audio_format": "wav", "sample_rate": 16000}'
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | Paralinguistic Voice-Based... | Application name |
| `APP_VERSION` | 1.0.0 | Application version |
| `DEBUG` | false | Enable debug mode |
| `ENVIRONMENT` | development | Environment name |
| `HOST` | 0.0.0.0 | Server bind host |
| `PORT` | 8000 | Server bind port |
| `CORS_ORIGINS` | localhost origins | Allowed CORS origins (JSON array) |
| `MODEL_PATH` | models/intent_classifier.pt | Path to model file |
| `MODEL_DEVICE` | cpu | Device for inference (cpu/cuda) |
| `MAX_AUDIO_DURATION_SECONDS` | 30.0 | Max audio length |
| `SUPPORTED_AUDIO_FORMATS` | wav,mp3,ogg,flac,m4a | Allowed formats |
| `SAMPLE_RATE` | 16000 | Target sample rate |
| `LOG_LEVEL` | INFO | Logging level |
| `LOG_JSON_FORMAT` | true | Use JSON log format |

## 🔧 Integrating a Real Model

The inference service (`app/services/inference.py`) is designed as a placeholder. To integrate a real PyTorch/Transformers model:

1. **Add dependencies** to `requirements.txt`:
   ```
   torch==2.2.0
   torchaudio==2.2.0
   transformers==4.37.2
   librosa==0.10.1
   ```

2. **Update `load_model()`** in `inference.py`:
   ```python
   def load_model(self) -> bool:
       import torch
       self.model = torch.load(self.model_path, map_location=self.device)
       self.model.eval()
       self.is_loaded = True
       return True
   ```

3. **Update `preprocess_audio()`** for feature extraction:
   ```python
   def preprocess_audio(self, audio_data: bytes, sample_rate: int = 16000):
       import librosa
       import io
       audio, sr = librosa.load(io.BytesIO(audio_data), sr=sample_rate)
       # Extract paralinguistic features...
       return features, len(audio) / sr
   ```

4. **Update `predict()`** for real inference:
   ```python
   def predict(self, audio_data: bytes, sample_rate: int = 16000):
       import torch
       features, duration = self.preprocess_audio(audio_data, sample_rate)
       with torch.no_grad():
           logits = self.model(features)
           probs = torch.softmax(logits, dim=-1)
       # Build PredictionResult...
   ```

## 🧪 Development Commands Summary

```powershell
# === SETUP ===
cd cultivatorIntentModule_Version2/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# === RUN SERVER ===
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# === RUN TESTS ===
pytest -v

# === SMOKE TEST ===
curl http://localhost:8000/api/v1/health
# Expected: {"status": "healthy", "timestamp": "...", "version": "1.0.0", ...}
```

## 📝 License

Part of the Smart Agri-Suite Research Project.
