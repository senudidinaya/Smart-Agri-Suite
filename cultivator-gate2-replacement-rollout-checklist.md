# Cultivator Gate-2 Replacement Rollout Checklist

## Pre-Training Checklist

- Confirm this effort is documented as a **replacement model**, not historical recovery.
- Confirm the target task is still the existing six-class Gate-2 emotion path.
- Confirm the dataset is real, not synthetic placeholder data.
- Confirm dataset structure matches:
  - `angry`
  - `fear`
  - `happy`
  - `neutral`
  - `sad`
  - `surprise`
- Confirm every class folder contains readable image files.
- Confirm class counts are not severely imbalanced.
- Confirm dataset provenance is recorded for metadata/reporting.
- Confirm training will run in:
  - `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend`

## Post-Training Validation Checklist

- Confirm all four artifacts exist:
  - `gate2_expression_model.pkl`
  - `gate2_scaler.pkl`
  - `gate2_class_names.json`
  - `gate2_model_metadata.json`
- Confirm class names exactly match the six-class runtime contract.
- Confirm metadata identifies the model as a new replacement lineage.
- Confirm the model loads via `joblib`.
- Confirm the scaler transforms the extracted feature vector successfully.
- Confirm the model supports `predict_proba(...)`.
- Run:

```powershell
python scripts\smoke_test_gate2_model.py
```

- Confirm smoke test completes without load or shape errors.
- Review metadata and validation outputs before staging.

## Pre-Activation Checklist

- Stage-copy validated artifacts manually into:
  - `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis`
- Confirm merged runtime no longer reports missing emotion artifacts.
- Confirm `Gate2InferenceService.is_loaded == True`.
- Confirm `gate2_model_version` is no longer `gate2-fallback-v1`.
- Test with a real interview video.
- Confirm response shape remains unchanged.
- Confirm output includes plausible non-fallback values:
  - non-zero `frames_used`
  - non-zero `faces_detected`
  - non-zero or plausible `face_detection_rate`
  - plausible `dominant_emotion`
  - non-empty `top_signals`
- Confirm fallback behavior still exists as backup if artifacts are removed or fail to load.

## Post-Activation Monitoring Checklist

- Monitor logs for Gate-2 model load failures.
- Monitor any continued appearance of `gate2-fallback-v1`.
- Monitor `frames_used` distribution.
- Monitor `faces_detected` and `face_detection_rate`.
- Monitor `stability`.
- Monitor `avg_model_confidence`.
- Monitor `dominant_emotion` distribution for implausible skew.
- Monitor decision distribution:
  - APPROVE
  - VERIFY
  - REJECT
- Keep fallback available until the replacement model is stable on real inputs.

