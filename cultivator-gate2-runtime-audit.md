## Executive Summary

The live Gate-2 interview endpoint is not running the real emotion-classification model in this repository state. The request path is healthy enough to save the uploaded video temporarily, invoke the Gate-2 service, persist an interview result, and return a response, but the decision-producing Gate-2 emotion model is permanently falling back because its required artifacts are missing.

This is not a true warmup issue. The only place that mentions warming up is the fallback string in `gate2_inference.py`, and there is no actual warmup manager, background loader, or readiness transition for Gate-2 in the backend startup path.

The system is therefore operating in fallback-only mode for the main Gate-2 decision model. A separate visual deception sub-model may still run because its artifacts exist, and DeepSeek failure is a separate optional degradation.

## Live Gate-2 Entry Flow Map

1. `backend/cultivator/api/v1/endpoints/interviews.py`
   `analyze_interview_video(...)`
   Input:
   - `job_id`
   - `client_id`
   - uploaded video file
   - `duration_seconds`

2. The endpoint saves the upload to:
   - `backend/tmp/interviews/<interview_id>/interview.<ext>`

3. The endpoint gets the Gate-2 emotion service:
   - `get_gate2_inference_service()`

4. The endpoint executes:
   - `result = await asyncio.to_thread(gate2_service.predict, temp_video_path)`

5. The endpoint then optionally runs:
   - Gate-1 audio deception via extracted WAV
   - Gate-2 visual deception via `get_gate2_deception_service().predict(...)`
   - safety assessment

6. The endpoint persists interview output into `db.inperson_interviews`:
   - `analysisDecision`
   - `confidence`
   - `reasons`
   - `gate2_emotion_distribution`
   - `gate2_dominant_emotion`
   - `gate2_top_signals`
   - `gate2_stats`
   - `gate2_model_version`
   - optional deception/safety fields

7. If `result.model_version == "gate2-fallback-v1"` and safety assessment exists, the endpoint may override the final decision from safety output before saving.

## Video-Analysis Runtime Component Table

| Component | File / Function | Expected Output | Actual Likely Output | Risk |
|---|---|---|---|---|
| Gate-2 endpoint entry | `interviews.py -> analyze_interview_video` | Save video and invoke Gate-2 model | Works | Low |
| Gate-2 service creation | `gate2_inference.py -> Gate2InferenceService.__init__` | Load expression model, scaler, classes | `is_loaded = False` | Critical |
| Model directory resolution | `gate2_inference.py -> _resolve_gate2_model_dir` | Find dir with required emotion artifacts | Falls back to expected dir paths when files absent | Medium |
| Emotion model load | `gate2_inference.py -> _load_model` | Load `gate2_expression_model.pkl`, `gate2_scaler.pkl`, class names | Fails because required files are missing | Critical |
| Frame extraction | `gate2_inference.py -> _extract_frames` | Extract frames from video | Not reached in fallback path | Secondary |
| Face detection | `gate2_inference.py -> _detect_face` | Count faces per frame | Not reached in fallback path | Secondary |
| Emotion inference | `gate2_inference.py -> _predict_emotion` | Per-frame emotion/confidence/scores | Not reached in fallback path | Secondary |
| Decision mapping | `gate2_inference.py -> _map_to_decision` | APPROVE / VERIFY / REJECT based on video evidence | Not reached in fallback path | Secondary |
| Fallback decision | `gate2_inference.py -> predict` | Conservative fallback with truthful reason | Always used for emotion branch in current repo state | Critical |
| Gate-2 deception model | `gate2_inference.py -> Gate2DeceptionService` | Visual deception analysis | Can still run because deception artifacts exist | Medium |
| DeepSeek Gate-2 insight | `deepseek_service.py -> generate_gate2_insight` | Optional explanation paragraph | Independent of core fallback; may fail on config/network | Medium |

## Fallback Matrix

| Trigger Condition | Fallback Path | Output Fields Set | User-Visible Effect |
|---|---|---|---|
| Emotion model artifacts missing | `gate2_inference.py -> Gate2InferenceService._load_model` then `predict` fallback branch | `decision_label="VERIFY"`, `confidence=0.5`, `dominant_emotion="unknown"`, zeroed stats, `model_version="gate2-fallback-v1"` | VERIFY, 50%, 0 frames, 0% face detection, unknown emotion |
| Emotion model load exception | Same path | Same fallback shape with reason | Conservative fallback |
| Frame extraction failure after model load | `predict` branch after `_extract_frames` | VERIFY, 50%, “Could not extract frames from video” | Not the observed symptom here |
| DeepSeek missing key / API failure | `deepseek_service.py -> _call_deepseek` | Raises runtime error; explain endpoint returns 502 | Insight unavailable, but core Gate-2 decision still exists |

## DeepSeek Gate-2 Insight Path

Entry path:
- `backend/cultivator/api/v1/endpoints/explain.py -> /explain/gate2`
- Calls `generate_gate2_insight(...)`
- `deepseek_service.py -> _call_deepseek(...)`

Inputs:
- decision
- confidence
- dominant emotion
- emotion distribution
- top signals
- stats

Dependencies:
- `DEEPSEEK_API_KEY`
- external HTTP call to `https://api.deepseek.com/chat/completions` by default

Important behavior:
- DeepSeek failure is separate from Gate-2 emotion-model fallback.
- If the key is absent, `_call_deepseek` raises `RuntimeError("DEEPSEEK_API_KEY is not configured in .env")`.
- This only degrades the explanation section. It does not cause `gate2-fallback-v1`.

## Exact Root Cause

Primary root cause:
- The real Gate-2 emotion model path cannot load because the required artifacts are absent from every candidate model directory.

Proven from code:
- `gate2_inference.py` requires:
  - `gate2_expression_model.pkl`
  - `gate2_scaler.pkl`
  - `gate2_class_names.json`
- Candidate directories searched:
  - `backend/models/gate2`
  - `backend/models/video_analysis`
  - `backend/models/intent_prediction/gate2`

Proven from repository contents:
- `backend/models/video_analysis` contains:
  - `gate2_class_names.json`
  - `gate2_model_metadata.json`
  - deception artifacts
  - but not `gate2_expression_model.pkl`
  - and not `gate2_scaler.pkl`
- `backend/models/intent_prediction/gate2` contains the same pattern:
  - metadata and deception artifacts
  - but not the required emotion model/scaler

Secondary root cause:
- The fallback text previously implied “warming up,” but the codebase has no actual Gate-2 warmup mechanism. This made the fallback reason less truthful than it should be.

Secondary degradation:
- DeepSeek Gate-2 insight can fail independently due to missing API key or API/network failure. This is not the cause of the fallback decision path.

## Whether Real Gate-2 Is Working Or Fallback-Only

The main Gate-2 decision model is fallback-only in the current repository/runtime state.

Important nuance:
- The overall interview endpoint is not completely inert.
- The upload/analyze/persist flow still runs.
- Gate-2 visual deception may still run because its separate model artifacts exist.
- Safety assessment may still alter the final saved decision based on other signals.

But the actual emotion-driven Gate-2 model path that should produce:
- frames analyzed
- face detection %
- stability %
- dominant emotion

is not genuinely running, because the required model artifacts are missing and `Gate2InferenceService.is_loaded` never becomes true.

## Recommended Next Actions

1. Restore the missing Gate-2 emotion artifacts:
   - `gate2_expression_model.pkl`
   - `gate2_scaler.pkl`

2. Confirm they match the current HOG+pixel feature contract used in `gate2_inference.py`.

3. Keep the new truthful fallback reason so future unhealthy deployments do not masquerade as “warming up.”

4. Optionally add startup health logging for Gate-2 readiness in a separate follow-up, not as part of this audit.

