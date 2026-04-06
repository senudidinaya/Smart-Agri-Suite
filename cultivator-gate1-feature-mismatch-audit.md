# Cultivator Gate-1 Feature Mismatch Audit

## Executive Summary

The reported `19 features vs 16 expected` failure is **not** coming from the Gate-1 intent classifier. It is coming from the **Gate-1 deception detector** that runs immediately after intent prediction in the call-analysis pipeline.

What the code proves:

- Gate-1 intent runtime extractor: **16 features**
- Gate-1 intent scaler/model artifacts: **16 features**
- Gate-1 deception runtime extractor: **19 features**
- Gate-1 deception scaler/model/metadata artifacts: **16 features**

So the primary bug is: **the runtime Gate-1 deception extractor drifted to a 19-feature contract, while the shipped deception artifacts remain on an older 16-feature contract**.

## Active Inference Path Trace

### Call upload entry

- File: `backend/cultivator/api/v1/endpoints/calls.py`
- Function: `upload_recording(...)`
- Input: uploaded audio bytes from `POST /calls/{call_id}/recording`

### Intent analysis path

1. `calls.py -> upload_recording(...)`
2. `classifier = get_classifier()`
3. `classifier.load_model()` if needed
4. `risk_classifier = getattr(classifier, "_classifier", None)`
5. `risk_classifier.extract_features(audio_data=contents, transcript=transcript)`
6. `classifier.predict(contents, transcript=transcript)`
7. `IntentRiskClassifier.predict_with_ml(features)`
8. `self.scaler.transform(features)`
9. `self.model.predict_proba(features_scaled)`

### Deception analysis path

1. `calls.py -> upload_recording(...)`
2. `deception_detector = get_deception_detector()`
3. `deception_detector.load_model()` if needed
4. `deception_detector.predict(contents)`
5. `Gate1DeceptionDetector.extract_deception_features(audio_data)`
6. `feat_array = np.array([features[f] for f in DECEPTION_AUDIO_FEATURES]).reshape(1, -1)`
7. `self.scaler.transform(feat_array)`
8. `self.model.predict_proba(feat_array)`

### Downstream

- `combined_analysis.py` is downstream only
- it is not the source of the feature-count mismatch

## Feature Contract Table

| component | expected feature count | actual feature count | source of truth | notes |
| --- | --- | --- | --- | --- |
| Gate-1 intent runtime extractor | 16 | 16 | `backend/cultivator/services/inference.py` -> `ALL_FEATURES` | 8 audio + 8 text |
| Gate-1 intent metadata | 16 | 16 | `backend/models/intent_prediction/model_metadata.json` | lists 16 feature names |
| Gate-1 intent scaler | 16 | 16 | `intent_risk_scaler.pkl` -> `n_features_in_ = 16` | verified via backend venv |
| Gate-1 intent model | 16 | 16 | `intent_risk_model.pkl` -> `n_features_in_ = 16` | verified via backend venv |
| Gate-1 deception runtime extractor | 19 | 19 | `DECEPTION_AUDIO_FEATURES` in `inference.py` | expanded prosodic feature set |
| Gate-1 deception metadata | 16 | 16 | `gate1_deception_metadata.json` | stale feature list; inconsistent with description |
| Gate-1 deception scaler | 16 | 16 | `gate1_deception_scaler.pkl` -> `n_features_in_ = 16` | verified via backend venv |
| Gate-1 deception model | 16 | 16 | `gate1_deception_model.pkl` -> `n_features_in_ = 16` | verified via backend venv |

## Exact Root Cause

Primary root cause:

- **A. runtime extractor was changed from 16 -> 19 and artifacts are stale**

More specifically:

- `Gate1DeceptionDetector.extract_deception_features(...)` now produces 19 features:
  - `duration_seconds`
  - `rms_mean`
  - `rms_std`
  - `f0_mean`
  - `f0_std`
  - `f0_range`
  - `zcr_mean`
  - `spectral_centroid_mean`
  - `tempo_proxy`
  - `pause_ratio`
  - `speech_rate_variation`
  - `jitter`
  - `shimmer`
  - `mfcc_1_mean`
  - `mfcc_2_mean`
  - `mfcc_3_mean`
  - `mfcc_4_mean`
  - `mfcc_5_mean`
  - `energy_contour_slope`

- But the loaded Gate-1 deception artifacts still expect the older 16-feature contract.

This is proven by:

- `gate1_deception_metadata.json` -> `n_features = 16`
- `gate1_deception_scaler.pkl` -> `n_features_in_ = 16`
- `gate1_deception_model.pkl` -> `n_features_in_ = 16`

## Fix Applied

I applied the smallest safe code fix in `backend/cultivator/services/inference.py`:

1. Added a contract check during Gate-1 deception model load:
   - compares runtime `len(DECEPTION_AUDIO_FEATURES)` vs artifact expected feature count
2. Added runtime diagnostics:
   - artifact paths
   - metadata version
   - runtime feature count
   - expected feature count
   - runtime feature names
3. If mismatch is detected:
   - log a truthful mismatch error
   - disable the ML deception path
   - fall back to the existing rules-based deception detector instead of crashing post-call analysis
4. Added a final guard at predict time in case a mismatch still reaches `scaler.transform(...)`

## Why The Fix Is Minimal And Correct

- no frontend changes
- no route changes
- no auth changes
- no database schema changes
- no silent truncation of features
- no fake retraining
- preserves post-call analysis by using the already-designed rules fallback when artifacts are incompatible

## Remaining Risks

- The ML Gate-1 deception path is still unavailable until artifacts are regenerated to match the 19-feature runtime contract.
- Current analysis will continue using rules-based deception scoring after this fix until that artifact mismatch is resolved.
