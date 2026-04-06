## Files Changed

- `backend/cultivator/services/gate2_inference.py`

## Exact Issue Fixed

The fallback branch for Gate-2 emotion analysis previously told users:
- `Video model is warming up or unavailable`

That was misleading for this repository state because:
- there is no actual Gate-2 warmup path in startup/runtime code
- the real failure is that the required emotion-model artifacts are missing

## Exact Correction Made

Added a small load-failure reason path inside `Gate2InferenceService`:
- records missing artifact names or load exception text
- propagates that reason into the fallback `top_signals`
- stores the same reason in `stats["fallback_reason"]`

Example result after the fix:
- `Video emotion model artifacts missing: gate2_expression_model.pkl, gate2_scaler.pkl`

## Why It Was Safe And Minimal

- No API routes changed
- No frontend code changed
- No fallback semantics changed
- No ML logic changed
- The service still returns the same conservative fallback decision
- Only the reason text became more truthful and diagnosable

