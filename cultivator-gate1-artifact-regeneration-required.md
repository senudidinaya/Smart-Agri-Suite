# Cultivator Gate-1 Artifact Regeneration Required

## Why Code-Only Fixes Are Insufficient

The backend code now truthfully detects the mismatch and falls back safely, but the ML Gate-1 deception model bundle itself is still stale.

Proof:

- runtime deception extractor uses **19** features
- `gate1_deception_metadata.json` says **16**
- `gate1_deception_scaler.pkl` expects **16**
- `gate1_deception_model.pkl` expects **16**

So the ML artifact bundle no longer matches the active inference contract.

## Which Artifacts Must Be Regenerated

At minimum:

- `backend/models/intent_prediction/gate1_deception_model.pkl`
- `backend/models/intent_prediction/gate1_deception_scaler.pkl`
- `backend/models/intent_prediction/gate1_deception_metadata.json`

Potentially also:

- `backend/models/intent_prediction/gate1_deception_label_encoder.pkl`

if regeneration recreates the full bundle.

## Expected Feature Contract After Regeneration

The regenerated Gate-1 deception bundle must match this 19-feature runtime order:

1. `duration_seconds`
2. `rms_mean`
3. `rms_std`
4. `f0_mean`
5. `f0_std`
6. `f0_range`
7. `zcr_mean`
8. `spectral_centroid_mean`
9. `tempo_proxy`
10. `pause_ratio`
11. `speech_rate_variation`
12. `jitter`
13. `shimmer`
14. `mfcc_1_mean`
15. `mfcc_2_mean`
16. `mfcc_3_mean`
17. `mfcc_4_mean`
18. `mfcc_5_mean`
19. `energy_contour_slope`

## How To Verify Regenerated Artifacts Match Runtime Inference

After deploying regenerated artifacts:

1. Load the backend.
2. Trigger a post-call upload.
3. Check logs for:
   - `runtime_feature_count=19`
   - `expected_feature_count=19`
4. Confirm no fallback warning is emitted.
5. Confirm the deception path stays on the ML branch and no scaler mismatch error occurs.

## Additional Note

I did not find an in-repo Gate-1 deception training/export script in the inspected backend paths, so artifact regeneration likely depends on an external training pipeline or an unpublished local script.
