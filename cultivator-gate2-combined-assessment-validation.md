# Cultivator Gate-2 Combined Assessment Validation

## Exact Manual Validation Steps

1. Start the backend normally.
2. Submit a Gate-2 interview video through:
   - `POST /admin/interviews/{job_id}/{client_id}/analyze-video`
3. Confirm the response still includes legacy fields:
   - `decision`
   - `confidence`
   - `reasons`
   - `emotion_distribution`
   - `dominant_emotion`
   - `gate2_deception`
4. Confirm the response now also includes:
   - `rawEmotion`
   - `rawDeception`
   - `combinedAssessment`
5. Confirm Mongo persistence includes:
   - `rawEmotion`
   - `rawDeception`
   - `combinedAssessment`
6. Confirm logs include:
   - `[GATE2 COMBINED]`
   - `rule=...`
   - `version=gate2-combined-v1`

## Expected Output: Healthy Emotion + Healthy Deception

If:

- `rawEmotion.healthy = true`
- `rawEmotion.decision = APPROVE`
- `rawDeception.healthy = true`
- `rawDeception.label = truthful`
- `rawDeception.confidence >= 0.60`

Then:

- `combinedAssessment.finalDecision = APPROVE`
- `combinedAssessment.riskLevel = low`
- `combinedAssessment.degradedBranches = []`
- `combinedAssessment.rulePath = both_healthy_low_risk_approve`

## Expected Output: Degraded Emotion + Healthy Deception

If:

- `rawEmotion.degraded = true`
- `rawDeception.healthy = true`

Then:

- `combinedAssessment.finalDecision = VERIFY`
- `combinedAssessment.riskLevel = medium`
- `combinedAssessment.degradedBranches` includes `emotion`
- `combinedAssessment.rulePath = degraded_branch_verify`

This is the expected current repo behavior while emotion artifacts are missing.

## Expected Output: Healthy Emotion + Risky Deception

If:

- `rawDeception.healthy = true`
- `rawDeception.label = deceptive`
- `rawDeception.confidence >= 0.75`

Then:

- `combinedAssessment.finalDecision = REJECT`
- `combinedAssessment.riskLevel = high`
- `combinedAssessment.rulePath = healthy_high_deception_reject`

If deception confidence is between `0.60` and `0.75`, expected output is:

- `combinedAssessment.finalDecision = VERIFY`
- `combinedAssessment.rulePath = moderate_deception_verify`

## Expected Output: Both Degraded

If:

- `rawEmotion.degraded = true`
- `rawDeception.degraded = true`

Then:

- `combinedAssessment.finalDecision = VERIFY`
- `combinedAssessment.riskLevel = medium`
- `combinedAssessment.overallConfidence = 0.5`
- `combinedAssessment.degradedBranches = ["emotion", "deception"]`
- `combinedAssessment.rulePath = degraded_branch_verify`

## What Still Counts As Misleading Or Broken

Broken behavior:

- APPROVE when `rawEmotion.degraded = true`
- APPROVE when `rawDeception.degraded = true`
- missing `combinedAssessment.degradedBranches` for fallback-only emotion
- hiding `gate2-fallback-v1`
- replacing raw branch fields with only a combined score
- using `safety_assessment` to overwrite a degraded Gate-2 result as if Gate-2 were healthy

## Validation Already Performed

- Python AST parse passed for:
  - `backend/cultivator/services/gate2_combined_assessment.py`
  - `backend/cultivator/api/v1/endpoints/interviews.py`
  - `backend/cultivator/schemas/interview.py`
- Schema import passed for `InterviewAnalyzeResponse`.
- Aggregator smoke check confirmed degraded emotion + healthy truthful deception returns VERIFY.

Note:

- `python -m py_compile` was attempted first, but Windows denied writing to `__pycache__`. Validation was rerun using no-bytecode AST parsing.

