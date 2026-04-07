# Gate-2 Consumer Fix Report

## Files Changed

| File | Exact semantic issue fixed | Exact correction made | Why safe and minimal |
| --- | --- | --- | --- |
| `backend/cultivator/schemas/explain.py` | Gate-2 insight request descriptions did not distinguish combined decision/confidence from raw emotion fields. | Updated descriptions for `decision`, `confidence`, `dominant_emotion`, and `emotion_distribution`. | Documentation/schema metadata only; no runtime behavior changed. |
| `backend/cultivator/api/v1/endpoints/explain.py` | Gate-2 insight endpoint docs used generic video-analysis wording. | Updated route summary, route description, and endpoint docstring to combined Gate-2 assessment wording. | API documentation wording only; no runtime behavior changed. |
| `backend/cultivator/services/deepseek_service.py` | Gate-2 insight prompt could imply top-level confidence was raw emotion confidence. | Updated docstring/argument text and added a prompt preface distinguishing combined assessment from raw emotion evidence. | Prompt clarification only; no ML or aggregation logic changed. |
| `backend/cultivator/api/v1/endpoints/jobs.py` | Job-level interview analysis retrieval discarded `rawEmotion`, `rawDeception`, and `combinedAssessment`. | Added those fields additively and mapped `gate2_*` raw emotion fields with legacy fallbacks. | Backward-safe response expansion; existing field names remain intact. |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | Gate-2 modal label could blur combined confidence with raw emotion evidence. | Renamed the section to `Gate-2 - Combined Interview Assessment`, relabeled confidence, and added a short explanatory note. | Text-only UI clarification; no flow redesign. |
| `frontend/src/features/cultivator/screens/InPersonInterviewScreen.tsx` | Result screen showed combined confidence as generic `Confidence`. | Relabeled it to `Overall Gate-2 Confidence`. | Text-only UI clarification. |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` | Job analysis list labeled combined results as video emotion analyses. | Renamed the section to combined interview assessments and relabeled confidence. | Text-only UI clarification. |

## Validation

Python AST validation passed for:

- `backend/cultivator/api/v1/endpoints/jobs.py`
- `backend/cultivator/api/v1/endpoints/explain.py`
- `backend/cultivator/schemas/explain.py`
- `backend/cultivator/services/deepseek_service.py`

Frontend TypeScript compiler validation could not run because the local frontend `node_modules` TypeScript compiler was not installed. The changes are narrow text/rendering changes plus additive response fields that are already represented by the existing TypeScript interfaces.

## Non-Changes

No ML training was run.

No Gate-2 aggregation logic was changed.

No Gate-1 behavior was changed.

No frontend flow redesign was made.
