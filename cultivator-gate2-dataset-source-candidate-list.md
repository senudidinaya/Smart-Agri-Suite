## Candidate Leads

### 1. Rank B
- File / Path:
  - `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\train_gate2_expression_model.py`
- Evidence:
  - `Uses the IEEE DataPort "Facial Expression Dataset (Sri Lankan)" dataset.`
  - `data/gate2/dataset/`
  - `default_name="gate2_expression_dataset.zip"`
- Why it matters:
  - strongest direct clue for original dataset identity, local layout, and ZIP-based recovery path
- Next action:
  - use the exact dataset name to locate the original external source or ask teammates for the matching ZIP

### 2. Rank B
- File / Path:
  - `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\.gitignore`
- Evidence:
  - `data/gate2/dataset/`
- Why it matters:
  - strongly suggests the real dataset once existed locally and was intentionally excluded from version control
- Next action:
  - check old developer machines, backups, or untracked local folders for that exact path

### 3. Rank B
- File / Path:
  - `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis\gate2_model_metadata.json`
- Evidence:
  - `dataset_path": "data/gate2/dataset"`
- Why it matters:
  - confirms the dataset path recorded at artifact generation time
- Next action:
  - use this as validation when checking old local copies or reconstructing data placement

### 4. Rank B
- File / Path:
  - `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\intent_prediction\gate2\gate2_model_metadata.json`
- Evidence:
  - `dataset_path": "data/gate2/dataset"`
- Why it matters:
  - duplicated metadata strengthens confidence that this was the real training path
- Next action:
  - same as above

### 5. Rank B
- File / Path:
  - `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2\gate2_model_metadata.json`
- Evidence:
  - `dataset_path": "data/gate2/dataset"`
- Why it matters:
  - confirms the individual-project artifacts were generated from the same dataset path
- Next action:
  - same as above

### 6. Rank C
- File / Path:
  - `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\cloud_data_utils.py`
- Evidence:
  - ZIP download and extraction helper for image datasets
- Why it matters:
  - shows the intended workflow supported remote ZIP input
- Next action:
  - look for the missing external ZIP source outside repo history or team notes

### 7. Rank C
- File / Path:
  - `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\generate_synthetic_data.py`
- Evidence:
  - mentions:
    - FER2013
    - AffectNet
    - CK+
    - IEEE DataPort `"Facial Expression Dataset (Sri Lankan)"`
- Why it matters:
  - supports the likely original source name
- Next action:
  - use only as supporting evidence, not proof of exact provenance

### 8. Rank C
- File / Path:
  - `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\models\gate2\.gitkeep`
- Evidence:
  - `gate2_expression_model.keras : Trained MobileNetV2 emotion classifier`
- Why it matters:
  - reveals an older Gate-2 pipeline existed before the current sklearn script
- Next action:
  - search old branches or contributor machines for older Keras-era training files if provenance matters

### 9. Rank C
- File / Path:
  - `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis\.gitkeep`
- Evidence:
  - same MobileNetV2 note
- Why it matters:
  - duplicated legacy clue in merged repo
- Next action:
  - treat as pipeline-history evidence only

### 10. Rank D
- File / Path:
  - frontend Gate-2 screens and UI files
- Evidence:
  - emotion labels like `neutral`
- Why it matters:
  - only reflects display expectations, not dataset source
- Next action:
  - none

### 11. Rank D
- File / Path:
  - Gate-1 CSV audio dataset traces under `backend/data/*.csv`
- Evidence:
  - absolute path `C:\Users\senud\Documents\FINAL YEAR RESEARCH\Voice_Dataset\...`
- Why it matters:
  - useful pattern for other data handling, but unrelated to Gate-2 image dataset
- Next action:
  - none for Gate-2 recovery

## Best Candidate

The single best recovery candidate is:
- `Individual-Project/backend/scripts/train_gate2_expression_model.py`

because it provides:
- the exact dataset name
- the exact expected folder structure
- the exact local path
- the exact ZIP workflow name

