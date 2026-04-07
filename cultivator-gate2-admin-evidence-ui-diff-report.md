# Gate-2 Admin Evidence UI Diff Report

## Files Changed

| File | Why necessary | Why safe |
| --- | --- | --- |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | Needed the primary admin modal to surface combined reasoning, degraded branches, raw emotion evidence, and raw deception evidence separately. | Frontend display-only change; no backend or ML behavior changed. |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` | Needed the job-level admin analysis view to show the same evidence hierarchy for completed interviews. | Frontend display-only change; optional-field safe for older records. |

## Exact Change Summary

- Added compact evidence-panel render helpers.
- Added percent formatting that handles both `0-1` ratios and already-percent values for legacy compatibility.
- Added combined assessment panel.
- Added raw emotion evidence panel.
- Added raw deception evidence panel.
- Added degraded/fallback/legacy-only visual states.
- Preserved existing Gate-1 sections and existing Gate-2 top-level summary compatibility.

## Non-Changes

- No backend aggregation change.
- No ML/model change.
- No persistence change.
- No broad navigation or UI redesign.
