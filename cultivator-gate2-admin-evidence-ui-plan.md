# Gate-2 Admin Evidence UI Plan

## Executive Summary

This UI pass surfaces Gate-2 evidence in admin review screens without mixing final combined semantics with raw branch semantics. The UI now separates the final combined Gate-2 assessment from raw emotion evidence and raw deception evidence.

No backend ML behavior, aggregation logic, or Gate-1 UI was changed.

## Current Screen Inventory

| Screen / component | Current fields shown before this pass | Missing useful fields | Best candidate for upgrade |
| --- | --- | --- | --- |
| `AdminApplicationsScreen.tsx` analysis modal | Top-level `analysisDecision`, top-level `confidence`, legacy raw emotion distribution, raw emotion signals, stats, DeepSeek insight | `combinedAssessment.reasoning`, `combinedAssessment.riskLevel`, `combinedAssessment.recommendation`, `degradedBranches`, explicit `rawEmotion`, explicit `rawDeception` | Yes. This is the best focused admin modal for applicant review. |
| `ViewAnalysisScreen.tsx` job analysis list | Top-level `analysisDecision`, top-level `confidence`, legacy raw emotion fields, Gate-1/Gate-2 deception legacy blocks | `combinedAssessment`, `rawEmotion`, `rawDeception`, branch degradation/fallback state | Yes. This is the best job-level admin review screen. |
| `InPersonInterviewScreen.tsx` result screen | Top-level combined decision/confidence and raw emotion charts after recording | `combinedAssessment.reasoning`, raw deception panel | No for this task. It is a recording/result flow, not the primary admin evidence review surface. |
| `api.ts` | Types already include `combinedAssessment`, `rawEmotion`, and `rawDeception` | No required type additions | No change required. |

## Chosen Layout Strategy

Use existing admin cards/modal sections and add three compact stacked panels:

1. Final Combined Gate-2 Assessment
2. Raw Emotion Evidence
3. Raw Deception Evidence

This keeps the patch narrow, mobile-readable, and compatible with existing screens while making degraded or fallback evidence visible.

## Semantic Separation Rules

| Rule | UI handling |
| --- | --- |
| Combined result is the business-facing Gate-2 outcome | Shown first as `Final Combined Gate-2 Assessment`. |
| Combined confidence must not look like raw model confidence | Labeled `Overall confidence` / `Overall Gate-2 Confidence`. |
| Raw emotion is supporting evidence only | Shown under `Raw Emotion Evidence` with `Raw emotion confidence`. |
| Raw deception is supporting evidence only | Shown under `Raw Deception Evidence` with `Raw deception confidence`. |
| Degraded/fallback branches must be obvious | Red degraded chips and fallback text are shown. |
| Missing raw branch metadata must not look healthy | Missing raw evidence is shown as `legacy only` or `not returned`. |

## Final UI Sections

### Section A - Final Combined Gate-2 Assessment

Shows:

- `finalDecision`
- `overallConfidence`
- `riskLevel`
- `recommendation`
- `degradedBranches`
- `reasoning`

### Section B - Raw Emotion Evidence

Shows:

- `rawEmotion.decision`
- `rawEmotion.confidence`
- `dominantEmotion`
- `emotionDistribution`
- `topSignals`
- `modelVersion`
- `fallbackReason`
- `healthy` / `degraded` state

Legacy emotion fields are shown only as legacy raw evidence if `rawEmotion` is absent.

### Section C - Raw Deception Evidence

Shows:

- `rawDeception.label`
- `rawDeception.confidence`
- `scores`
- `topSignals`
- `modelVersion`
- `modelType`
- `fallbackReason`
- `healthy` / `degraded` state

Legacy `gate2_deception` is converted only for display compatibility and marks rules fallback as degraded.
