# Cultivator Gate-1 Feature Mismatch Validation

## Exact Manual Validation Steps For A New Post-Call Upload

1. Start a new cultivator call.
2. Let the client record enough audio for upload.
3. End the call and upload the recording.
4. Watch backend logs during the Gate-1 analysis phase.

## Expected Backend Logs

You should now see diagnostics for the deception branch, for example:

```text
[GATE1 DECEPTION] model_path=...gate1_deception_model.pkl scaler_path=...gate1_deception_scaler.pkl runtime_feature_count=19 expected_feature_count=16 metadata_version=v1.0.0
```

and:

```text
[GATE1 DECEPTION] runtime_feature_count=19 feature_names=[...]
```

and because the artifacts are stale:

```text
[GATE1 DECEPTION] Gate-1 deception artifact mismatch: runtime extracts 19 features ... but loaded artifacts expect 16.
[GATE1 DECEPTION] Falling back to rules-based deception detection
```

## Expected Feature-Count Signals

Intent path:

- should remain on a 16-feature contract

Deception path:

- runtime feature count should log as `19`
- expected artifact count should log as `16`

## What Success Should Look Like

After this fix, a post-call upload should:

- no longer fail with `X has 19 features, but StandardScaler is expecting 16 features`
- continue through the analysis pipeline
- persist call analysis successfully
- use rules-based Gate-1 deception output until artifacts are regenerated

## What Failure Signals Would Still Indicate A Remaining Issue

- backend still raises the raw scaler mismatch exception
- no fallback log appears
- post-call upload still returns 500 from the deception stage
- logs show a different feature mismatch than `19 vs 16`

## Additional Verification

If regenerated artifacts are later deployed, success signals should change to:

- runtime feature count = expected feature count = 19
- no fallback warning
- ML deception path remains active
