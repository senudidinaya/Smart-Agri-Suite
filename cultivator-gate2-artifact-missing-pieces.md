## Missing Prerequisites And Blockers

### 1. Real Gate-2 expression dataset is absent
- Why it matters:
  - The training script expects a folder-per-class image dataset.
  - Without real labeled images, the emotion model cannot be regenerated credibly.
- Blocks regeneration: Yes
- Evidence:
  - script default path: `data/gate2/dataset`
  - current `backend/data` in the individual project contains deception audio data, not the Gate-2 expression dataset

### 2. The merged repo no longer contains the training/export scripts
- Why it matters:
  - The merged repo alone is not sufficient to regenerate the emotion artifacts.
- Blocks regeneration: Yes, if the adjacent project is unavailable
- Evidence:
  - `Merged-Project/backend/scripts` contains only migration scripts

### 3. Original production dataset source is documented but not bundled
- Why it matters:
  - The script references the IEEE DataPort “Facial Expression Dataset (Sri Lankan)” dataset.
  - Access/download steps are external to the repo.
- Blocks regeneration: Yes, unless the dataset or an equivalent labeled replacement is supplied

### 4. Metadata is helpful but not enough to recover artifacts alone
- Why it matters:
  - `gate2_model_metadata.json` and class names cannot reconstruct the trained RandomForest or fitted StandardScaler.
- Blocks regeneration: Yes

### 5. Metadata field `feature_size` is ambiguous
- Why it matters:
  - Metadata says `feature_size: 64`, but runtime/training logic actually use concatenated HOG + pixel features with a much larger dimensionality.
  - This does not block training if you use the script, but it makes metadata-only reconstruction unsafe.
- Blocks regeneration: No, but it blocks metadata-only recreation

## What Someone Must Restore Or Provide

1. A real labeled Gate-2 facial-expression dataset with these classes:
- angry
- fear
- happy
- neutral
- sad
- surprise

2. Either:
- local directory matching `data/gate2/dataset`
or
- a ZIP URL consumable by `--data_url`

3. The adjacent training script source, or a copied equivalent:
- `Individual-Project/backend/scripts/train_gate2_expression_model.py`

4. A verification step using:
- `Individual-Project/backend/scripts/smoke_test_gate2_model.py`

## Safe Reconstruction Boundary

What is safe to infer:
- required filenames
- class label order
- feature extraction logic
- scaler requirement
- model family
- output directory contract

What is not safe to invent:
- the real training dataset contents
- the original train/validation split data
- production-quality artifacts from synthetic images

