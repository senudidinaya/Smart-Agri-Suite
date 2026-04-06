## Manual Validation Steps

### 1. Validate artifact presence
Check the candidate Gate-2 directories:
- `backend/models/video_analysis`
- `backend/models/intent_prediction/gate2`

Healthy real Gate-2 requires:
- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`
- `gate2_class_names.json`

Fallback mode is still expected if the first two files are missing.

### 2. Start the cultivator backend
Run the backend normally and watch logs during the first interview analysis request.

### 3. Trigger a Gate-2 interview analysis
Call:
- `POST /admin/interviews/{job_id}/{client_id}/analyze-video`

### 4. Expected logs for healthy real Gate-2
You should see behavior consistent with:
- Gate-2 model loaded successfully
- `Model loaded: True`
- non-zero `Frames analyzed`
- non-zero `Face detection rate`
- non-zero or meaningful `Faces detected`
- meaningful `Dominant emotion`
- `model_version` not equal to `gate2-fallback-v1`

### 5. Expected logs for fallback mode
You should see:
- a warning that the video emotion artifacts are missing, or another explicit load failure reason
- `Model loaded: False`
- result with:
  - `model_version = gate2-fallback-v1`
  - `frames_used = 0`
  - `faces_detected = 0`
  - `face_detection_rate = 0.0`
  - `dominant_emotion = unknown`

### 6. Expected logs for DeepSeek-only degradation
Core Gate-2 analysis can still succeed while DeepSeek fails.
Signs:
- real Gate-2 stats are non-zero or meaningful
- explain endpoint fails separately with:
  - missing `DEEPSEEK_API_KEY`
  - HTTP error
  - network/API error

### 7. What still counts as broken
The system is still broken for real Gate-2 emotion analysis if:
- `model_version` remains `gate2-fallback-v1`
- `Model loaded: False`
- the service reports missing `gate2_expression_model.pkl` or `gate2_scaler.pkl`
- stats remain zero for frames/faces because the model never loaded

## Expected Result After This Audit Fix

The fallback reason should now describe the actual failure more truthfully, for example:
- `Video emotion model artifacts missing: gate2_expression_model.pkl, gate2_scaler.pkl`

That improves diagnosis, but real Gate-2 remains unavailable until the missing artifacts are restored.

