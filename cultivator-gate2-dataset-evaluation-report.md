# Cultivator Gate-2 Dataset Evaluation Report

## Executive Summary

I evaluated the currently accessible local workspace and nearby project area against the exact existing Gate-2 six-class contract:

- `angry`
- `fear`
- `happy`
- `neutral`
- `sad`
- `surprise`

Result:

- No accessible local candidate is ready for pilot replacement training.
- No accessible local candidate is even a clean six-class emotion dataset root.
- The only real local image corpus found, `backend/media/photos`, is an unlabeled application photo store and is unsafe to repurpose.
- The only structured Gate-2-adjacent data found under `backend/data/deception` is deception-task data, not emotion data.

Best current recommendation: **reject all current local candidates and wait for a properly governed replacement emotion dataset.**

## Evaluation Contract

| Criterion | Required / Preferred / Disqualifying | Evidence Source |
| --- | --- | --- |
| Exact label set: `angry`, `fear`, `happy`, `neutral`, `sad`, `surprise` | Required | `gate2_inference.py`, `train_gate2_expression_model.py`, replacement plan/docs |
| Folder-per-class dataset root | Required | `train_gate2_expression_model.py -> load_dataset(...)` |
| OpenCV-readable image files: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.gif` | Required | `train_gate2_expression_model.py` |
| Images must visually contain faces relevant to emotion labels | Required | current HOG + grayscale pixel pipeline and replacement dataset requirements |
| Faces must be clear enough to survive resize to `64x64` and `48x48` | Required | `gate2_inference.py`, trainer, smoke test |
| All six classes must be populated | Required | trainer stratified split expectations and replacement dataset requirements |
| Classes should not be severely imbalanced | Preferred; near-empty classes are effectively disqualifying | replacement dataset requirements and rollout checklist |
| Enough samples per class for `train_test_split(..., stratify=y, test_size=0.2)` | Required | trainer implementation |
| Honest replacement provenance | Required | replacement model plan and dataset requirements |
| Deception-labeled data (`truthful` / `deceptive`) reused as emotion data | Disqualifying | runtime decision semantics, replacement dataset requirements |

## Candidate Inventory

### Candidate 1

Path:

- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\media\photos`

What it appears to be:

- real application photo storage referenced by `backend/idle_land_api.py`
- subfolders are numeric IDs such as `5`, `10`, `11`, `40`
- each subfolder contains only a few files

Evidence:

- path is created and served by `idle_land_api.py`
- sample images include:
  - a landscape/tree photo
  - a mobile screenshot of anime/video content

Initial verdict:

- real images, but not a governed emotion dataset

### Candidate 2

Path:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\data\deception`

What it appears to be:

- deception-task data root, not an emotion-image dataset
- only `gate1_audio/deception_audio_features.csv` was found

Initial verdict:

- wrong task and wrong modality

### Candidate 3

Path:

- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\frontend\assets\images`

What it appears to be:

- product/app artwork and icons
- examples include spice images, map, logos, app icons

Initial verdict:

- obvious dead end, not a face/emotion dataset

### Candidate 4

Path:

- no local six-class dataset root found in reachable search scope

What it appears to be:

- absence of a proper candidate

Initial verdict:

- no directly compatible local dataset exists in the searched area

## Compatibility Assessment

### Candidate 1: `backend/media/photos`

Label/structure findings:

- missing all required class folders
- uses numeric folders, not emotion labels
- no honest direct mapping exists from folder IDs to the six required classes
- trainer cannot consume it directly as a folder-per-class emotion dataset

Compatibility class:

- **D. Incompatible / Reject**

### Candidate 2: `backend/data/deception`

Label/structure findings:

- not an image dataset root
- labels and task semantics are deception-oriented, not emotion-oriented
- current Gate-2 emotion runtime expects six emotion probabilities and uses those semantics in decision rules

Compatibility class:

- **D. Incompatible / Reject**

### Candidate 3: `frontend/assets/images`

Label/structure findings:

- not a labeled dataset
- no emotion-class structure
- mostly app/brand/media assets

Compatibility class:

- **D. Incompatible / Reject**

### Candidate 4: no six-class root found

Compatibility class:

- **D. Incompatible / Reject**

Reason:

- absence of a candidate is a no-go for training readiness

## Data Quality / Usability Findings

### Candidate 1: `backend/media/photos`

Positive:

- files are real images
- sampled files are readable and have normal image dimensions

Disqualifying quality findings:

- content is mixed and unlabeled
- sampled files are not consistently human-face images
- at least one sample is a landscape photo with no face
- at least one sample is a screenshot of entertainment content, not a subject face capture
- folder sizes are tiny and inconsistent, typically 2-3 images per numeric ID folder
- provenance is application-upload content, not governed training data

Usability verdict:

- **Too risky / reject**

### Candidate 2: `backend/data/deception`

Quality/usability findings:

- no image corpus for the emotion trainer
- no six-class label structure
- wrong modality for Gate-2 emotion training

Usability verdict:

- **Reject**

### Candidate 3: `frontend/assets/images`

Quality/usability findings:

- not faces
- not emotion labels
- branding and product imagery only

Usability verdict:

- **Reject**

## Training Readiness / Risk Assessment

### Candidate 1: `backend/media/photos`

Can current trainer consume it directly?

- No

Would smoke test still make sense after training?

- Not safely, because the training input itself would be semantically invalid

Main risks:

- no label governance
- no semantic mapping to the six required classes
- mixed non-face content
- tiny per-folder sample counts
- unsafe provenance for model-training use

Provenance acceptable and documentable?

- Not as a replacement emotion dataset

Preserves runtime semantics well enough?

- No

Decision:

- **Rejected**

### Candidate 2: `backend/data/deception`

Can current trainer consume it directly?

- No

Would smoke test still make sense after training?

- No, because the wrong task would be trained

Main risks:

- wrong labels
- wrong modality
- wrong semantics

Decision:

- **Rejected**

### Candidate 3: `frontend/assets/images`

Can current trainer consume it directly?

- No

Decision:

- **Rejected**

## Ranked Recommendation

### Final ranking

- Candidate 1 `backend/media/photos`: **D. INCOMPATIBLE / REJECT**
- Candidate 2 `backend/data/deception`: **D. INCOMPATIBLE / REJECT**
- Candidate 3 `frontend/assets/images`: **D. INCOMPATIBLE / REJECT**
- No six-class local dataset root found: **D. INCOMPATIBLE / REJECT**

### Single best recommendation

**No current local candidate should be used for pilot replacement training.**

### Reasons

- none satisfies the exact six-class Gate-2 contract
- none provides safe, honest label semantics for the current runtime decision logic
- the only real photo corpus is mixed operational content, not a governed dataset
- the deception data is a different task and cannot be repurposed honestly

## Best Next Actions

1. Do not train on any currently accessible local candidate.
2. Acquire or stage a real replacement facial-expression dataset that preserves the exact six-class contract.
3. Before pilot training, require:
   - exact six class folders
   - readable real face images
   - enough samples per class for stratified split
   - documented replacement provenance
4. If a future candidate uses alternate labels, require an explicit mapping review before any training run.
5. Keep the current fallback-only runtime behavior unchanged until a real approved replacement dataset exists.

