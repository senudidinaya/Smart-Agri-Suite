## Executive Summary

I searched both project trees for direct and indirect traces of the original Gate-2 facial-expression dataset source. No local copy of the real Gate-2 expression dataset was found in either repository. No downloadable URL for that specific dataset was found either.

The strongest recoverable evidence is external-source oriented:
- the individual project training script explicitly names the source as the IEEE DataPort `"Facial Expression Dataset (Sri Lankan)"`
- the training/export pipeline expects the dataset at `data/gate2/dataset`
- the individual project `.gitignore` explicitly excludes `data/gate2/dataset/`, which strongly suggests the real dataset once existed locally but was intentionally omitted from version control

There is also a secondary legacy clue:
- `.gitkeep` in both model folders still references an older `gate2_expression_model.keras` MobileNetV2 pipeline

That legacy clue is useful archaeology, but it does not help recover the missing dataset as directly as the current scikit-learn training script does.

## Search Coverage

Searched both:
- `Merged-Project/Smart-Agri-Suite`
- `Individual-Project/Smart-Agri-Suite`

Covered:
- `.py`
- `.md`
- `.txt`
- `.json`
- `.env*`
- `.ps1/.bat/.sh`
- visible data/model folders
- hidden files such as `.gitignore`
- archive/backup-like folder names
- absolute Windows path traces
- cloud/ZIP download helpers

Explicitly searched for:
- `IEEE DataPort`
- `Sri Lankan facial`
- `Facial Expression Dataset`
- `data/gate2/dataset`
- `gate2_expression_dataset.zip`
- `--data_dir`
- `--data_url`
- `MobileNetV2`
- `gate2_expression_model.keras`
- `Kaggle`, `AffectNet`, `CK+`
- personal path patterns like `C:\Users\...`, `Downloads`, `Desktop`, `OneDrive`

## Direct Dataset References

### 1. Individual project Gate-2 training script
File:
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\train_gate2_expression_model.py`

Direct evidence:
- `Uses the IEEE DataPort "Facial Expression Dataset (Sri Lankan)" dataset.`
- expected structure:
  - `data/gate2/dataset/`
  - `angry/`
  - `fear/`
  - `happy/`
  - `neutral/`
  - `sad/`
  - `surprise/`
- arg defaults:
  - `--data_dir` default `data/gate2/dataset`
  - `--data_url` for a cloud ZIP
- default ZIP name:
  - `gate2_expression_dataset.zip`

Value:
- strongest direct evidence of the original dataset identity and local layout

### 2. Gate-2 metadata in both repos
Files:
- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis\gate2_model_metadata.json`
- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\intent_prediction\gate2\gate2_model_metadata.json`
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2\gate2_model_metadata.json`

Direct evidence:
- `dataset_path: "data/gate2/dataset"`
- class names match the training script

Value:
- confirms the training/export process really used that local dataset path

### 3. Individual project `.gitignore`
File:
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\.gitignore`

Direct evidence:
- `data/gate2/dataset/`
- `data/gate2/samples/*.jpg`
- `data/gate2/samples/*.png`

Value:
- strong proof the dataset was expected to exist locally and was intentionally excluded from source control

## Indirect Recovery Clues

### 1. Cloud ZIP ingestion path
Files:
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\train_gate2_expression_model.py`
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\cloud_data_utils.py`

Evidence:
- the training script supports `--data_url`
- ZIPs are downloaded and extracted automatically
- default ZIP filename becomes `gate2_expression_dataset.zip`

Why it matters:
- proves the original workflow allowed external ZIP input even if the dataset was not kept locally in repo

### 2. Synthetic-data script references the same external source family
File:
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\generate_synthetic_data.py`

Evidence:
- lists:
  - FER2013 (Kaggle)
  - AffectNet
  - CK+
  - IEEE DataPort `"Facial Expression Dataset (Sri Lankan)"`

Why it matters:
- confirms the author still considered the Sri Lankan dataset a real intended source
- but this script is for testing only, not provenance by itself

### 3. `build_verify.py` references the Gate-2 emotion training script
File:
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\build_verify.py`

Evidence:
- `training_scripts["gate2_emotion"] = scripts_dir / "train_gate2_expression_model.py"`

Why it matters:
- confirms the training script was considered part of the intended build pipeline

## Local / Backup / Archive Traces

### What was found
- model directories:
  - `backend/models/video_analysis`
  - `backend/models/intent_prediction/gate2`
  - `Individual-Project/backend/models/gate2`
- normal temporary folders
- no Gate-2 image dataset folder contents

### What was not found
- no actual `data/gate2/dataset` tree
- no `.zip` dataset file for Gate-2 expression images
- no backup/archive folder containing the dataset
- no notebook outputs with local dataset location
- no personal absolute Windows path pointing to the Gate-2 image dataset

Important contrast:
- Gate-1 audio data leaves strong local path traces like `C:\Users\senud\Documents\FINAL YEAR RESEARCH\Voice_Dataset\...`
- no equivalent local-path trace was found for the Gate-2 image dataset

## External Source Links

### Strong external references
From:
- `Individual-Project/backend/scripts/train_gate2_expression_model.py`
- `Individual-Project/backend/scripts/generate_synthetic_data.py`

Evidence:
- named source:
  - IEEE DataPort `"Facial Expression Dataset (Sri Lankan)"`

### Other external references found
Only alternative dataset suggestions, not proof of the original source:
- FER2013 (Kaggle)
- AffectNet
- CK+

### What was not found
- no actual IEEE DataPort URL
- no Google Drive / Dropbox / OneDrive link
- no SharePoint/team-shared link
- no stored `--data_url` value in env/docs/scripts

## Ranked Recovery Candidates

### A. Direct Recovery Path
None found in the repositories themselves.

### B. Strong Lead

1. `Individual-Project/backend/scripts/train_gate2_expression_model.py`
- Evidence:
  - explicitly names IEEE DataPort `"Facial Expression Dataset (Sri Lankan)"`
  - exact local structure and CLI path are documented
  - supports cloud ZIP input
- Why it matters:
  - best surviving evidence for how the original dataset was used
- Confidence:
  - High

2. `Individual-Project/backend/.gitignore`
- Evidence:
  - `data/gate2/dataset/`
- Why it matters:
  - strong sign the real dataset existed locally but was excluded from git
- Confidence:
  - High

3. Gate-2 metadata JSON in both repos
- Evidence:
  - `dataset_path: "data/gate2/dataset"`
- Why it matters:
  - confirms the dataset path used during artifact generation
- Confidence:
  - High

### C. Partial Clue

1. `backend/models/*/.gitkeep` MobileNetV2 note
- Evidence:
  - `gate2_expression_model.keras : Trained MobileNetV2 emotion classifier`
- Why it matters:
  - proves an older Gate-2 model generation pipeline existed
- Limits:
  - does not point to dataset location or download source directly

2. `generate_synthetic_data.py`
- Evidence:
  - lists multiple possible public emotion datasets, including IEEE DataPort Sri Lankan
- Why it matters:
  - confirms likely source family
- Limits:
  - not specific enough to recover the original dataset alone

### D. Dead End

1. General frontend references to `neutral`, `emotion`, or Gate-2 display
- relevant to UI only, not dataset recovery

2. Gate-1 audio absolute paths in CSV files
- useful as a pattern for prior local data handling
- not evidence of Gate-2 image dataset location

3. pip / node_modules / package ZIP references
- unrelated

## Best Next Actions

1. Treat the best recovery lead as external:
   - locate the exact IEEE DataPort “Facial Expression Dataset (Sri Lankan)” record manually using the preserved name

2. Ask original project contributors whether the excluded local folder still exists on a development machine:
   - `data/gate2/dataset`

3. Check whether anyone still has the ZIP that would have been used with:
   - `--data_url`
   - default name `gate2_expression_dataset.zip`

4. If the exact original dataset cannot be recovered, document that artifact regeneration will require a substitute labeled dataset and therefore will not be provenance-identical to the original build.

