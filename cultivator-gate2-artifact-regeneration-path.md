## Was The Original Pipeline Found Or Reconstructed?

Reconstructed confidently from the adjacent original project copy.

The key script is:
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\train_gate2_expression_model.py`

This is strong evidence rather than speculation because it:
- exports the exact missing filenames
- uses the same HOG + pixel feature pipeline as the merged runtime
- uses the same class label file name and metadata file name
- is referenced by `build_verify.py`

## Exact Files / Scripts To Run

Primary training/export script:
- `Individual-Project/backend/scripts/train_gate2_expression_model.py`

Verification script:
- `Individual-Project/backend/scripts/smoke_test_gate2_model.py`

Optional cloud helper dependency already referenced by the script:
- `Individual-Project/backend/scripts/cloud_data_utils.py`

## Exact Prerequisites

1. Python environment with:
- `opencv-python`
- `numpy`
- `scikit-learn`
- `joblib`

2. A real image dataset arranged as:

```text
data/gate2/dataset/
├── angry/
├── fear/
├── happy/
├── neutral/
├── sad/
└── surprise/
```

3. Either:
- a local dataset path via `--data_dir`
or
- a ZIP URL via `--data_url`

## Exact Output Artifacts Expected

The training script should produce:
- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`
- `gate2_class_names.json`
- `gate2_model_metadata.json`

## Exact Commands / Steps

### Option 1: Run from the individual project and export directly into the merged repo

From:
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend`

Run:

```powershell
python scripts/train_gate2_expression_model.py --data_dir "data/gate2/dataset" --output_dir "c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis"
```

### Option 2: Use a cloud-hosted ZIP dataset

```powershell
python scripts/train_gate2_expression_model.py --data_url "<ZIP_URL>" --output_dir "c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis"
```

### Option 3: Export to a neutral folder first, then copy manually

```powershell
python scripts/train_gate2_expression_model.py --data_dir "data/gate2/dataset" --output_dir "models\gate2_regenerated"
```

Then verify and copy:
- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`
- `gate2_class_names.json`
- `gate2_model_metadata.json`

into one merged-runtime search path.

## Validation Criteria For Regenerated Artifacts

1. Files exist in a merged-runtime candidate directory:
- `backend/models/gate2`
- `backend/models/video_analysis`
- `backend/models/intent_prediction/gate2`

2. `smoke_test_gate2_model.py` loads:
- model
- scaler
- class names

3. A new interview analysis request should no longer return:
- `model_version = gate2-fallback-v1`

4. Healthy runtime should show:
- `gate2_service.is_loaded == True`
- non-zero `frames_used` when a usable video is provided
- meaningful `dominant_emotion`
- non-zero `face_detection_rate` if faces are visible

## Important Notes

- The included `generate_synthetic_data.py` script is explicitly for testing only and should not be treated as a production-quality replacement for the real dataset.
- The metadata field `feature_size: 64` is not a reliable full-feature-count contract; the actual feature vector is the concatenation of HOG and flattened pixel features.

