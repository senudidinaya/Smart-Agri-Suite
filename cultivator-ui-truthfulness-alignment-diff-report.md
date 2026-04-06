# Cultivator UI Truthfulness Alignment Diff Report

## Files Changed

- `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
- `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
- `frontend/src/features/cultivator/screens/AdminCallScreen.tsx`

## Exact Field/Label Mappings Changed

### Admin summary path

- `callAssessment.decision`
  - before: shown as `Call Assessment`
  - after: shown as `Final Call Decision`

- `callAssessment.confidence`
  - before: shown inline with the decision badge as if it were combined decision confidence
  - after: shown separately as `Raw intent confidence`

- `callAssessment.scores`
  - before: `Score Breakdown`
  - after: `Raw Intent Score Breakdown`

### Raw call-analysis path

- `analysis.intentLabel`
  - still displayed
  - now explicitly under raw-analysis titles

- `analysis.confidence`
  - before: `Confidence`
  - after: `Intent confidence`

- `analysis.scores`
  - before: `Intent Scores` or `All Scores`
  - after: `Raw Intent Scores`

## Type/Interface Changes Made

- None

Existing frontend types already covered the fields used in this patch:

- `CallAssessment.decision`
- `CallAssessment.confidence`
- `CallAssessment.scores`
- `AnalysisResult.intentLabel`
- `AnalysisResult.confidence`
- `AnalysisResult.scores`

## Anything Intentionally Not Changed

- No backend response changes
- No ML semantics changes
- No auth or routing changes
- No exposure of backend `trustScore`, `riskLevel`, `reasoning`, or `recommendation` yet

Those fields remain persisted but out of scope for this minimal frontend-only truthfulness alignment.
