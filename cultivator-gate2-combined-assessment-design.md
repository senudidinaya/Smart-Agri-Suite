# Cultivator Gate-2 Combined Assessment Design

## Executive Summary

Gate-2 now has an explicit three-layer contract:

- `rawEmotion`
- `rawDeception`
- `combinedAssessment`

The design preserves existing legacy fields while making the business-facing Gate-2 decision conservative and traceable. It does not train a model, does not replace artifacts, and does not hide degraded branches.

I also verified that `C:\Users\pehan.r\Downloads\archive.zip` exists as a possible future replacement-dataset candidate. It was not used in this implementation.

## Current Gate-2 Output Trace

| File | Function | Output Shape | Persisted Shape | User-Visible Shape |
| --- | --- | --- | --- | --- |
| `backend/cultivator/api/v1/endpoints/interviews.py` | `analyze_interview_video` | Runs raw emotion via `get_gate2_inference_service().predict(...)` | `gate2_emotion_distribution`, `gate2_dominant_emotion`, `gate2_top_signals`, `gate2_stats`, `gate2_model_version` | `emotion_distribution`, `dominant_emotion`, `top_signals`, `stats`, `model_version` |
| `backend/cultivator/services/gate2_inference.py` | `Gate2InferenceService.predict` | `Gate2InferenceResult` with decision, confidence, emotion distribution, dominant emotion, signals, stats, model version | via endpoint fields above | via endpoint response fields above |
| `backend/cultivator/services/gate2_inference.py` | `Gate2InferenceService.predict` fallback | `VERIFY`, `0.5`, empty distribution, `unknown`, `model_version=gate2-fallback-v1`, `stats.fallback_reason` | same raw emotion fields | same raw emotion fields |
| `backend/cultivator/services/gate2_inference.py` | `Gate2DeceptionService.predict` | `Gate2DeceptionResult` with label, confidence, scores, frame predictions, signals, stats, model version | compressed into `gate2_deception` | `gate2_deception` |
| `backend/cultivator/services/gate2_inference.py` | `Gate2DeceptionService._rules_based_predict` | rules fallback uses emotion as proxy and returns `model_version=gate2-deception-rules-v1` | `gate2_deception.deception_model_type=rules` | `gate2_deception` |
| `backend/cultivator/services/safety_assessment.py` | `SafetyAssessmentService` | broader Gate-1 + Gate-2 safety context | `safety_assessment` | `safety_assessment` |

Before this change, the endpoint used raw emotion as the first decision, bumped APPROVE to VERIFY on visual deception, then could override fallback emotion decisions using the broader safety assessment. That made degraded Gate-2 emotion harder to distinguish from a complete Gate-2 result.

## Final Combined Contract

### `rawEmotion`

Fields:

- `decision`
- `confidence`
- `dominantEmotion`
- `emotionDistribution`
- `topSignals`
- `stats`
- `modelVersion`
- `fallbackReason`
- `healthy`
- `degraded`

### `rawDeception`

Fields:

- `label`
- `confidence`
- `scores`
- `topSignals`
- `stats`
- `modelVersion`
- `modelType`
- `fallbackReason`
- `healthy`
- `degraded`

### `combinedAssessment`

Fields:

- `finalDecision`
- `recommendation`
- `overallConfidence`
- `trustScore`
- `reasoning`
- `riskLevel`
- `degradedBranches`
- `rulePath`
- `aggregationVersion`

The chosen aggregation version is:

- `gate2-combined-v1`

## Aggregation Rules

The aggregation is deterministic and conservative:

- APPROVE only when emotion and deception are both healthy, emotion says APPROVE, and deception says truthful with at least 60% confidence.
- REJECT when a healthy visual deception branch says deceptive with at least 75% confidence.
- REJECT when a healthy emotion branch says REJECT with at least 70% confidence, unless the healthy deception branch strongly disagrees as truthful.
- VERIFY when any Gate-2 branch is degraded and no high-confidence healthy rejection rule fires.
- VERIFY on moderate deception risk, raw emotion VERIFY, branch disagreement, or any case that does not satisfy strict approval criteria.

`overallConfidence` is not a naive raw-score average:

- APPROVE uses the lower confidence of the two healthy low-risk branches.
- degraded evidence defaults to 0.5 and VERIFY.
- REJECT confidence is conservatively derived from the triggering healthy high-risk branch and capped.

## Branch Health / Degradation Rules

### Emotion healthy

Emotion is healthy only when:

- model version is not `gate2-fallback-v1`
- dominant emotion is not `unknown`
- frames were used
- predictions exist
- model is not marked unloaded

### Emotion degraded

Emotion is degraded when:

- `gate2-fallback-v1`
- missing model artifacts
- zero frames / zero predictions
- unknown dominant emotion
- explicit `stats.fallback_reason`

### Deception healthy

Deception is healthy only when:

- label is `truthful` or `deceptive`
- confidence is positive
- ML model path is used, not rules fallback
- frames/faces were available

### Deception degraded

Deception is degraded when:

- branch is unavailable
- label is `unknown`
- confidence is zero
- rules fallback is used
- zero frames or zero detected faces

## Why The Design Is Conservative And Truthful

- Raw branch evidence remains visible and is not collapsed into a single ambiguous score.
- Degraded branches are named in `combinedAssessment.degradedBranches`.
- Unknown evidence cannot produce APPROVE.
- Safety assessment remains separate and no longer disguises fallback-only emotion as a complete Gate-2 result.
- The new contract is additive: existing fields still persist and return for backward compatibility.

