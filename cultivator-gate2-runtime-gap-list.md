## Gate-2 Runtime Gaps

### 1. Missing Gate-2 emotion model artifacts
- Severity: Critical
- File / Function:
  - `backend/cultivator/services/gate2_inference.py -> Gate2InferenceService._load_model`
  - runtime model directories under `backend/models/video_analysis` and `backend/models/intent_prediction/gate2`
- Why it matters:
  - This prevents the main Gate-2 emotion model from ever loading.
  - The system therefore returns fallback decisions instead of real video-analysis decisions.
- Blocks real Gate-2 analysis: Yes

### 2. Misleading fallback message implied warmup instead of missing artifacts
- Severity: Medium
- File / Function:
  - `backend/cultivator/services/gate2_inference.py -> Gate2InferenceService.predict`
- Why it matters:
  - The codebase has no Gate-2 warmup manager or readiness transition.
  - “warming up” hid the real deployment problem.
- Blocks real Gate-2 analysis: No, but it obscures the true failure mode

### 3. No startup readiness check for Gate-2
- Severity: Medium
- File / Function:
  - `backend/cultivator/main.py -> lifespan`
- Why it matters:
  - Startup currently validates Agora and loads Gate-1 only.
  - Gate-2 health is only discovered lazily at request time.
- Blocks real Gate-2 analysis: Indirectly
- Safe to defer: Yes

### 4. DeepSeek Gate-2 insight is an external optional dependency
- Severity: Medium
- File / Function:
  - `backend/cultivator/services/deepseek_service.py -> _call_deepseek`
- Why it matters:
  - Missing `DEEPSEEK_API_KEY` or API/network failure removes the explanation layer.
  - This is separate from the core Gate-2 model outage.
- Blocks real Gate-2 analysis: No
- Safe to defer: Yes

### 5. Gate-2 endpoint can still persist fallback results as completed analysis
- Severity: Low
- File / Function:
  - `backend/cultivator/api/v1/endpoints/interviews.py -> analyze_interview_video`
- Why it matters:
  - Users may see a completed analysis even though the real emotion model did not run.
  - This is only truthful if the fallback reason is explicit.
- Blocks real Gate-2 analysis: No
- Safe to defer: Yes, after truthfulness fix

