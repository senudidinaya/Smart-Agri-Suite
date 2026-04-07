# Cultivator Gate-2 Combined Assessment Diff Report

## Files Changed

| File | Why Changed | Why Safe |
| --- | --- | --- |
| `backend/cultivator/services/gate2_combined_assessment.py` | Added small deterministic aggregation helper | New additive service; does not alter model loading or training |
| `backend/cultivator/api/v1/endpoints/interviews.py` | Wires raw emotion + raw deception into combined Gate-2 assessment | Preserves legacy raw fields; adds explicit combined fields |
| `backend/cultivator/schemas/interview.py` | Adds response schemas for `rawEmotion`, `rawDeception`, `combinedAssessment` | Optional fields; backward-safe |
| `frontend/src/features/cultivator/services/api.ts` | Adds TypeScript interfaces for the new optional response fields | Types-only compatibility update; no UI behavior change |

## Exact Non-Training Changes

- No model training was run.
- No artifacts were generated or activated.
- No frontend screen was redesigned.
- No Gate-1 logic was changed.
- No dataset ZIP was consumed.

## Safety Rationale

The patch separates raw evidence from the business-facing final Gate-2 decision. It also prevents fallback-only emotion from appearing as a complete healthy Gate-2 result by marking degraded branches explicitly and biasing the final Gate-2 result toward VERIFY unless healthy low-risk evidence exists.

