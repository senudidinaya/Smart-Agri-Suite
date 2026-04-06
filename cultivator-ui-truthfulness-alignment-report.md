# Cultivator UI Truthfulness Alignment Report

## Executive Summary

The backend persists two different but valid call-analysis layers:

1. raw call-level Gate-1 analysis in `db.calls.analysis`
2. combined admin summary in `db.call_assessments`

The frontend was previously misleading because `AdminApplicationsScreen` displayed the combined final decision next to a percentage that was actually raw intent confidence.

The fix keeps the existing frontend architecture but aligns the labels to the backend’s true meaning:

- admin summary surfaces now present `decision` as the final combined call decision
- the percentage beside it is explicitly labeled `Raw intent confidence`
- raw-analysis views continue to show raw Gate-1 intent, but are now labeled explicitly as raw

## Semantics Table

| Field | Source | True Meaning | Safe User-Facing Label |
|---|---|---|---|
| `intentLabel` | `db.calls.analysis` | raw Gate-1 voice-intent label | `Raw intent` |
| `confidence` in `db.calls.analysis` | `db.calls.analysis` | raw Gate-1 intent model confidence | `Intent confidence` |
| `scores` in `db.calls.analysis` | `db.calls.analysis` | raw Gate-1 class scores | `Raw intent scores` |
| `deceptionLabel` | `db.calls.analysis` | deception model output | `Truthfulness label` |
| `deceptionConfidence` | `db.calls.analysis` | deception model confidence | `Truthfulness confidence` |
| `finalDecision` | `db.calls.analysis` | combined final decision after intent + deception logic | `Final call decision` |
| `finalRecommendation` | `db.calls.analysis` | follow-up recommendation from combined logic | `Recommendation` |
| `trustScore` | `db.calls.analysis` | overall combined trust signal | `Trust score` |
| `reasoning` | `db.calls.analysis` | combined-decision explanation | `Reasoning` |
| `riskLevel` | `db.calls.analysis` | combined risk classification | `Risk level` |
| `decision` | `db.call_assessments` | copied combined final decision | `Final call decision` |
| `recommendation` | `db.call_assessments` | copied combined recommendation | `Recommendation` |
| `confidence` in `db.call_assessments` | `db.call_assessments` | raw intent confidence copied into summary doc | `Raw intent confidence` |
| `trustScore` in `db.call_assessments` | `db.call_assessments` | combined trust signal | `Trust score` |
| `riskLevel` in `db.call_assessments` | `db.call_assessments` | combined risk classification | `Risk level` |
| `reasoning` in `db.call_assessments` | `db.call_assessments` | combined-decision explanation | `Reasoning` |
| `scores` in `db.call_assessments` | `db.call_assessments` | raw Gate-1 scores copied into summary doc | `Raw intent scores` |

## Screen Truthfulness Matrix

| Screen | Endpoint | Fields Used | Current Label | Truthful? | Notes |
|---|---|---|---|---|---|
| `AdminApplicationsScreen` list badge | `GET /admin/interviews/{jobId}/{clientId}` | `callAssessment.decision`, `callAssessment.confidence` | `Final Call Decision`, `Raw intent confidence` | Yes | Combined summary + explicit raw metric |
| `AdminApplicationsScreen` modal | `GET /admin/interviews/{jobId}/{clientId}` | `callAssessment.decision`, `callAssessment.confidence`, `callAssessment.scores` | `Final Call Assessment`, `Raw intent confidence`, `Raw Intent Score Breakdown` | Yes | Includes explicit explanatory hint |
| `ViewAnalysisScreen` call cards | `GET /jobs/{jobId}/call-analyses` | `analysis.intentLabel`, `analysis.confidence`, `analysis.scores` | `Raw Voice Intent Analyses`, `Intent confidence`, `Raw Intent Scores` | Yes | Explicitly raw Gate-1 view |
| `AdminCallScreen` ended state | `GET /calls/{callId}` | `analysis.intentLabel`, `analysis.confidence`, `analysis.scores` | `Raw Voice Intent Analysis`, `Intent confidence`, `Raw Intent Scores` | Yes | Explicitly raw per-call view |
| `api.ts` frontend types | typed response layer | `CallAssessment.decision`, `CallAssessment.confidence`, `CallAssessment.scores` | unchanged type names | Yes | Existing type fields still match values used |

## Chosen Display Strategy

Smallest correct strategy:

- keep raw Gate-1 views as raw
- keep admin summary views as combined final decision
- do not visually pair combined decision with unlabeled raw confidence
- explicitly label the percentage as `Raw intent confidence`

This was chosen because:

- it preserves backend semantics
- it requires only frontend label/layout changes
- it avoids pretending `confidence` is a combined-decision certainty score
- it does not require backend changes to expose `trustScore`

## Files Changed

- `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
- `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
- `frontend/src/features/cultivator/screens/AdminCallScreen.tsx`

## Exact UI Truthfulness Fixes Applied

### `AdminApplicationsScreen.tsx`

- Changed `Call Assessment:` to `Final Call Decision:`
- Removed the percentage from inside the combined decision badge
- Added a separate line:
  - `Raw intent confidence: XX%`
- Changed modal section title from raw-sounding Gate-1 phrasing to `Final Call Assessment`
- Changed modal confidence label to `Raw intent confidence`
- Changed `Score Breakdown` to `Raw Intent Score Breakdown`
- Added a short hint explaining that the decision is combined while the percentage comes from the raw Gate-1 model

### `ViewAnalysisScreen.tsx`

- Changed section title to `Raw Voice Intent Analyses (Gate-1)`
- Changed `Confidence` to `Intent confidence`
- Changed `Intent Scores` to `Raw Intent Scores`

### `AdminCallScreen.tsx`

- Changed title to `Raw Voice Intent Analysis`
- Changed `Confidence` to `Intent confidence`
- Changed `All Scores` to `Raw Intent Scores`

## Remaining Intentional Differences

These differences remain and are now intentional and truthful:

- `AdminApplicationsScreen` shows the combined final call decision summary
- `ViewAnalysisScreen` and `AdminCallScreen` show raw Gate-1 intent analysis

This is acceptable because the screens now label those layers explicitly instead of blurring them together.

## Final Verdict

The active frontend no longer implies that a raw intent-confidence percentage is the certainty of the combined final decision.

The UI is now semantically aligned with the backend’s persisted meaning using a small frontend-only patch.
