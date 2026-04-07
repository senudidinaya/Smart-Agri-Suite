# Cultivator Gate-2 Regeneration Readiness

## Dataset Readiness

Status: **Not ready**

What is known:

- The training script expects a real folder-per-class image dataset.
- Expected default path:
  - `data/gate2/dataset`
- Expected class folders:
  - `angry`
  - `fear`
  - `happy`
  - `neutral`
  - `sad`
  - `surprise`
- The script explicitly names the intended source clue:
  - IEEE DataPort
  - `Facial Expression Dataset (Sri Lankan)`

Blocking gap:

- No local copy of the real dataset or dataset ZIP was recovered.

## Artifact Readiness

Status: **Not ready**

What is ready:

- Training script exists.
- Smoke test exists.
- Runtime contract is known.
- Class names and metadata templates survive.

What is missing:

- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`

## Exact Training Script To Use

Use:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\train_gate2_expression_model.py`

Why this script:

- It matches the current merged runtime contract:
  - scikit-learn `.pkl` model
  - `gate2_scaler.pkl`
  - JSON class names
  - JSON metadata
- Its feature pipeline matches the merged runtime implementation:
  - HOG features
  - flattened grayscale pixel features
  - `RandomForestClassifier`
  - `StandardScaler`

## Exact Smoke Test To Use

Use:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\smoke_test_gate2_model.py`

Important note:

- This smoke test expects artifacts under:
  - `models/gate2`
- That means the safest validated regeneration flow is to regenerate in the **individual project** first.

## Exact Output Path

### Safe first output path

Generate first into:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2`

Reason:

- This matches the original project trainer and smoke test without touching merged runtime.

### Merged runtime compatible output path

After validation, the first merged-runtime-compatible target should be:

- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis`

Why:

- The merged runtime loader checks in this order:
  1. `backend/models/gate2`
  2. `backend/models/video_analysis`
  3. `backend/models/intent_prediction/gate2`
- In the merged repo, `video_analysis` is the first existing compatible target.

## Exact Command(s)

### If the real dataset is recovered as a local folder

Run from:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend`

Command:

```powershell
python scripts/train_gate2_expression_model.py --data_dir "C:\ABSOLUTE\PATH\TO\RECOVERED\dataset" --output_dir "models\gate2"
```

Then validate:

```powershell
python scripts\smoke_test_gate2_model.py
```

### If the real dataset is recovered as a verified ZIP URL

Run from:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend`

Command:

```powershell
python scripts/train_gate2_expression_model.py --data_url "https://VERIFIED-DATASET-URL/gate2_expression_dataset.zip" --output_dir "models\gate2"
```

Then validate:

```powershell
python scripts\smoke_test_gate2_model.py
```

### After successful validation, stage manual copy only

Artifacts to copy manually after verification:

- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`
- `gate2_class_names.json`
- `gate2_model_metadata.json`

Source:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2`

Destination:

- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis`

## Remaining Uncertainties

- The real dataset has not yet been recovered, so regeneration cannot be executed truthfully yet.
- The preserved metadata shows suspiciously perfect metrics (`accuracy = 1.0` and support `20` for each class), which may indicate a tiny validation slice or an unrealistic prior training run. This does not block regeneration, but it reduces trust in the historical quality of the preserved metadata.
- No locally recoverable archive or old trained emotion artifact was found, so provenance must come from the externally recovered dataset plus the surviving trainer.

