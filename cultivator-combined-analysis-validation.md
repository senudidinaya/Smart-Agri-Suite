# Cultivator Combined Analysis Validation

## Goal

Validate that a real post-call recording upload now produces a correct combined decision instead of falling back through the helper's `"UNKNOWN"` intent path.

## How To Validate With A Real Post-Call Upload

1. Start a cultivator call and let the client complete a local recording.
2. End the call normally.
3. Upload the recording through `POST /calls/{call_id}/recording`.
4. Confirm the route returns success and does not fail in the ML pipeline.
5. Inspect the corresponding `calls` document for that `call_id`.
6. Inspect the matching `call_assessments` document for the same `{ jobId, clientId }`.

## Fields To Inspect In `db.calls.analysis`

Check that these fields are present and internally consistent:

- `intentLabel`
- `confidence`
- `scores`
- `deceptionLabel`
- `deceptionConfidence`
- `finalDecision`
- `finalRecommendation`
- `trustScore`
- `reasoning`
- `riskLevel`

Expected signal after the fix:

- `finalDecision` should now align with the real `intentLabel` and deception result.
- It should no longer behave like the helper received an unknown intent unless the classifier truly produced an unknown value.

## Fields To Inspect In `db.call_assessments`

Check:

- `decision`
- `recommendation`
- `confidence`
- `trustScore`
- `riskLevel`
- `reasoning`
- `scores`
- `deceptionLabel`
- `deceptionConfidence`

Expected signal after the fix:

- `decision` should match `db.calls.analysis.finalDecision`
- `recommendation` should match `db.calls.analysis.finalRecommendation`
- `trustScore`, `riskLevel`, and `reasoning` should reflect the combined analysis result rather than an `"UNKNOWN"` fallback path

## Response / Output Signals That Indicate The Fix Worked

- Backend upload route returns:
  - `success: true`
  - original raw intent fields still present in the response
- Backend logs for the combined-decision step show a meaningful:
  - `decision`
  - `recommendation`
  - `trustScore`
- Persisted `finalDecision` is no longer unexpectedly stuck in the helper's generic fallback behavior when `intentLabel` is clearly `PROCEED`, `VERIFY`, or `REJECT`

## What Would Still Indicate A Remaining Issue

- `db.calls.analysis.finalDecision` still looks inconsistent with `intentLabel` + deception result
- `db.call_assessments.decision` differs from `db.calls.analysis.finalDecision`
- Upload succeeds but combined fields are missing or null
- The helper still behaves as though intent is unknown despite a valid classifier output

## Additional Verification

There is only one live backend caller of `combine_intent_and_deception(...)`, so validating one successful post-call upload is sufficient to confirm the corrected contract is now active in production code paths.
