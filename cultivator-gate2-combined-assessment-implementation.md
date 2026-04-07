# Cultivator Gate-2 Combined Assessment Implementation

## Files Changed

- `backend/cultivator/services/gate2_combined_assessment.py`
- `backend/cultivator/api/v1/endpoints/interviews.py`
- `backend/cultivator/schemas/interview.py`
- `frontend/src/features/cultivator/services/api.ts`

## Exact Helper / Service Changes

Added `backend/cultivator/services/gate2_combined_assessment.py`.

Functions added:

- `build_raw_emotion(...)`
- `build_raw_deception(...)`
- `combine_gate2_assessment(...)`

The helper is deterministic and returns plain dictionaries shaped as:

- `rawEmotion`
- `rawDeception`
- `combinedAssessment`

## Persistence Changes

`analyze_interview_video(...)` now persists:

- `rawEmotion`
- `rawDeception`
- `combinedAssessment`

Existing persisted raw/legacy fields are preserved:

- `gate2_emotion_distribution`
- `gate2_dominant_emotion`
- `gate2_top_signals`
- `gate2_stats`
- `gate2_model_version`
- `gate2_deception`
- `safety_assessment`

## Response-Shape Changes

`InterviewAnalyzeResponse` and `InterviewResponse` now include optional:

- `rawEmotion`
- `rawDeception`
- `combinedAssessment`

Existing response fields remain:

- `decision`
- `confidence`
- `reasons`
- `emotion_distribution`
- `dominant_emotion`
- `top_signals`
- `stats`
- `model_version`
- `gate2_deception`
- `safety_assessment`

## Logging Added

`interviews.py` now logs:

- emotion branch health
- deception branch health
- degraded branch list
- final combined decision
- combined confidence
- rule path
- aggregation version

Log prefix:

- `[GATE2 COMBINED]`

## Tiny Compatibility Fixes

`frontend/src/features/cultivator/services/api.ts` was updated with additive TypeScript interfaces:

- `Gate2RawEmotion`
- `Gate2RawDeception`
- `Gate2CombinedAssessment`

No frontend screens were redesigned.

## Behavior Notes

- The broader `safety_assessment` still runs and is persisted as separate context.
- The fallback-only emotion path no longer gets overridden by the broader safety assessment into a clean-looking Gate-2 final result.
- `analysisDecision` and response `decision` now use `combinedAssessment.finalDecision`.
- `confidence` now uses `combinedAssessment.overallConfidence`.

