# Cultivator Gate-2 Recovery Playbook

## Executive Summary

This recovery pass prioritized real local recovery over reconstruction.

Findings:

- No real local Gate-2 facial-expression dataset was found in the reachable project/workspace area.
- No local trained Gate-2 emotion artifacts were found for the required runtime files:
  - `gate2_expression_model.pkl`
  - `gate2_scaler.pkl`
- The strongest surviving training pipeline is still present in the individual project:
  - `Individual-Project/Smart-Agri-Suite/backend/scripts/train_gate2_expression_model.py`
- The strongest surviving smoke test is also present:
  - `Individual-Project/Smart-Agri-Suite/backend/scripts/smoke_test_gate2_model.py`
- The surviving metadata and class-name files strongly indicate the intended class set and output contract, but they are not sufficient to restore the missing model artifacts by themselves.

Best truthful recovery path: **D. No local recovery, but external source path is clear enough to act on.**

## Recovery Inventory

| File / Path | Present / Missing | Inferred Purpose | Recovery Value | Confidence |
| --- | --- | --- | --- | --- |
| `backend/models/video_analysis/gate2_class_names.json` | Present | Runtime class labels for Gate-2 emotion model | Medium | High |
| `backend/models/video_analysis/gate2_model_metadata.json` | Present | Preserved training metadata for Gate-2 emotion model | High | High |
| `backend/models/video_analysis/gate2_expression_model.pkl` | Missing | Required runtime emotion model artifact | Critical | High |
| `backend/models/video_analysis/gate2_scaler.pkl` | Missing | Required runtime scaler artifact | Critical | High |
| `backend/models/intent_prediction/gate2/gate2_class_names.json` | Present | Duplicate runtime class labels | Medium | High |
| `backend/models/intent_prediction/gate2/gate2_model_metadata.json` | Present | Duplicate preserved metadata | High | High |
| `backend/models/intent_prediction/gate2/gate2_expression_model.pkl` | Missing | Required runtime emotion model artifact | Critical | High |
| `backend/models/intent_prediction/gate2/gate2_scaler.pkl` | Missing | Required runtime scaler artifact | Critical | High |
| `Individual-Project/.../backend/models/gate2/gate2_class_names.json` | Present | Original project class labels | Medium | High |
| `Individual-Project/.../backend/models/gate2/gate2_model_metadata.json` | Present | Original project metadata snapshot | High | High |
| `Individual-Project/.../backend/models/gate2/gate2_expression_model.pkl` | Missing | Original project model artifact | Critical | High |
| `Individual-Project/.../backend/models/gate2/gate2_scaler.pkl` | Missing | Original project scaler artifact | Critical | High |
| `Individual-Project/.../backend/scripts/train_gate2_expression_model.py` | Present | Strongest surviving trainer/export script | Critical | High |
| `Individual-Project/.../backend/scripts/smoke_test_gate2_model.py` | Present | Artifact validation script | High | High |
| `Individual-Project/.../backend/scripts/cloud_data_utils.py` | Present | Supports ZIP download/extraction via `--data_url` | Medium | High |
| `Individual-Project/.../backend/data/gate2/dataset` | Missing | Intended dataset directory | Critical | High |
| `gate2_expression_dataset.zip` in reachable local project area | Missing | Likely local ZIP candidate | High | Medium |
| Git history entries for `gate2_expression_model.pkl` / `gate2_scaler.pkl` | Missing | Would prove prior tracked existence | High | High |
| `cultivator-gate2-artifact-regeneration-path.md` | Present | Prior derived recovery note | Medium | Medium |
| `cultivator-gate2-dataset-source-forensics.md` | Present | Prior source forensics note | Medium | Medium |
| `cultivator-gate2-dataset-source-missing-evidence.md` | Present | Prior missing-data evidence note | Medium | Medium |
| `c:\Projects\Senudi_research_docs\code_walkthrough_for_evaluators.md` | Present | Documentation that references the missing model by name | Low | Medium |

## Local Dataset Recovery Findings

Search scope covered:

- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite`
- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite`
- nearby reachable project folders under `c:\Projects`
  - `c:\Projects\Senudi-Uni`
  - `c:\Projects\senu-test-dev`
  - `c:\Projects\Senudi_research_docs`

Findings:

- No `data/gate2/dataset` folder was found.
- No folder-per-class dataset with real image files under:
  - `angry`
  - `fear`
  - `happy`
  - `neutral`
  - `sad`
  - `surprise`
- No reachable local ZIP or archive matching:
  - `gate2_expression_dataset.zip`
  - facial-expression / emotion dataset naming
- No reachable local image corpus matching Gate-2 emotion training was found.
- The individual project `backend/data` tree contains deception CSV data, not the Gate-2 facial-expression dataset.

Assessment:

- Local dataset recovery status: **No**
- Empty or metadata-only traces were not treated as recovery.
- No synthetic or placeholder data was accepted as a substitute.

## Local Model Artifact Recovery Findings

Findings:

- Required emotion runtime artifacts are missing from all checked runtime locations:
  - `Merged-Project/Smart-Agri-Suite/backend/models/video_analysis`
  - `Merged-Project/Smart-Agri-Suite/backend/models/intent_prediction/gate2`
  - `Individual-Project/Smart-Agri-Suite/backend/models/gate2`
- Only these Gate-2 emotion-adjacent files survive locally:
  - `gate2_class_names.json`
  - `gate2_model_metadata.json`
- Existing local `.pkl` files in Gate-2 folders are for the **deception** branch only:
  - `gate2_deception_model.pkl`
  - `gate2_deception_scaler.pkl`
- Git history searched across both repos does not show tracked history for:
  - `gate2_expression_model.pkl`
  - `gate2_scaler.pkl`
  - `gate2_expression_model.keras`
  - `gate2_expression_dataset.zip`

Assessment:

- Local model artifact recovery status: **No**
- Metadata suggests an emotion model existed at some point, but the actual trained artifacts are not locally recoverable from reachable storage.

## Best Recovery Path (A/B/C/D/E)

**D**

Reasoning:

- No real dataset was recovered locally.
- No real compatible emotion artifacts were recovered locally.
- The external source path is specific enough to act on:
  - dataset name preserved in trainer docstring: `Facial Expression Dataset (Sri Lankan)`
  - expected layout preserved in code and metadata: `data/gate2/dataset`
  - expected runtime outputs preserved in trainer and runtime loader:
    - `gate2_expression_model.pkl`
    - `gate2_scaler.pkl`
    - `gate2_class_names.json`
    - `gate2_model_metadata.json`

## Safe Next Actions

1. Recover the real dataset externally using the exact source clue preserved in the training script:
   - IEEE DataPort
   - dataset clue: `Facial Expression Dataset (Sri Lankan)`
2. Verify the recovered dataset is real and matches the expected class-folder structure before training.
3. Run regeneration first in the **individual project** using the preserved trainer, not directly into live merged runtime folders.
4. Run the preserved smoke test in the individual project after regeneration.
5. Only after artifact validation, manually compare and stage-copy the generated emotion artifacts into the merged runtime location.

Safest staging order:

1. Generate artifacts in `Individual-Project/Smart-Agri-Suite/backend/models/gate2`
2. Validate with `smoke_test_gate2_model.py`
3. Manually compare class names and metadata
4. Only then copy into one merged runtime directory, preferably:
   - `Merged-Project/Smart-Agri-Suite/backend/models/video_analysis`

Why `video_analysis` first:

- `gate2_inference.py` checks candidate directories in this order:
  1. `backend/models/gate2`
  2. `backend/models/video_analysis`
  3. `backend/models/intent_prediction/gate2`
- The merged repo does not currently use `backend/models/gate2`, so `video_analysis` is the first compatible merged-runtime target.

