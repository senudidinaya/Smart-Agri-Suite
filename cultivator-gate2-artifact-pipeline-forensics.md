## Executive Summary

The original Gate-2 emotion-model runtime contract is preserved in the merged backend service, but the merged repository does not contain the original training/export pipeline. The strongest surviving source is the adjacent individual project at:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend\scripts\train_gate2_expression_model.py`

That script writes the exact missing artifact filenames:

- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`
- `gate2_class_names.json`
- `gate2_model_metadata.json`

Its feature extraction logic matches the merged runtime inference logic closely enough to reconstruct a safe regeneration path with high confidence.

The remaining blocker is data availability: the dataset path is known from code and metadata, but the actual Gate-2 expression dataset is not present in either current project tree.

## Artifact Evidence Table

| File / Path | Status | Inferred Purpose | Key Metadata | Confidence |
|---|---|---|---|---|
| `backend/models/video_analysis/gate2_class_names.json` | Present | Emotion class label order for Gate-2 emotion model | `["angry","fear","happy","neutral","sad","surprise"]` | High |
| `backend/models/video_analysis/gate2_model_metadata.json` | Present | Metadata for missing emotion model artifacts | `model_name=gate2_expression_model`, `version=v1.0.0`, `model_type=RandomForest + HOG`, `training_date=2026-01-30`, `dataset_path=data/gate2/dataset` | High |
| `backend/models/video_analysis/gate2_expression_model.pkl` | Missing | Main Gate-2 emotion classifier | Required by runtime | High |
| `backend/models/video_analysis/gate2_scaler.pkl` | Missing | StandardScaler for Gate-2 emotion features | Required by runtime | High |
| `backend/models/video_analysis/gate2_deception_model.pkl` | Present | Separate visual deception model | Exists and loads separately from emotion path | High |
| `backend/models/video_analysis/gate2_deception_scaler.pkl` | Present | Scaler for Gate-2 deception model | Present | High |
| `backend/models/intent_prediction/gate2/gate2_class_names.json` | Present | Duplicate emotion class labels | Same six classes as above | High |
| `backend/models/intent_prediction/gate2/gate2_model_metadata.json` | Present | Duplicate metadata for emotion model | Same metadata as `video_analysis` copy | High |
| `backend/models/intent_prediction/gate2/gate2_expression_model.pkl` | Missing | Alternate candidate location for emotion classifier | Absent | High |
| `backend/models/intent_prediction/gate2/gate2_scaler.pkl` | Missing | Alternate candidate location for emotion scaler | Absent | High |
| `backend/cultivator/services/gate2_inference.py` | Present | Live runtime contract for loading and inference | Requires exact filenames above; uses HOG + pixel features | High |
| `Individual-Project/backend/scripts/train_gate2_expression_model.py` | Present | Original or near-original training/export script | Trains RandomForest, fits StandardScaler, exports exact filenames | High |
| `Individual-Project/backend/scripts/smoke_test_gate2_model.py` | Present | Post-training verification script | Loads exported artifacts and runs synthetic inference | High |
| `Individual-Project/backend/scripts/generate_synthetic_data.py` | Present | Test-only synthetic dataset generator | Explicitly marked not for production | High |

## Training/Export Pipeline Search Matrix

| File | Type | Relevance | Trains? | Exports? | Usable Now? | Notes |
|---|---|---|---|---|---|---|
| `Individual-Project/backend/scripts/train_gate2_expression_model.py` | Script | Directly relevant | Yes | Yes | Yes, if dataset is supplied | Writes exact missing filenames |
| `Individual-Project/backend/scripts/smoke_test_gate2_model.py` | Script | Directly relevant | No | No | Yes | Validates exported emotion artifacts |
| `Individual-Project/backend/build_verify.py` | Verification script | Strong supporting evidence | No | No | Yes | Explicitly references Gate-2 emotion training script |
| `Individual-Project/backend/scripts/generate_synthetic_data.py` | Script | Indirectly relevant | Generates fake data | No | Yes, testing only | Not acceptable as production replacement |
| `Individual-Project/backend/scripts/train_deception_visual_model.py` | Script | Related but separate | Yes | Yes | Yes | Trains Gate-2 deception artifacts, not emotion model |
| `Merged-Project/backend/scripts/*` | Scripts folder | Not relevant for Gate-2 emotion | No | No | No | Only migration scripts remain |

## Reconstructed Artifact Contract

### `gate2_expression_model.pkl`
- Type:
  - scikit-learn `RandomForestClassifier`
- Purpose:
  - classify face crops into emotion classes
- Expected input:
  - scaled feature vector produced by combined HOG + grayscale pixel features
- Output:
  - class index used to look up label in `gate2_class_names.json`
  - probabilities used for confidence and distribution

### `gate2_scaler.pkl`
- Type:
  - scikit-learn `StandardScaler`
- Purpose:
  - normalize the combined feature vector before model prediction
- Expected fit input:
  - same feature vector contract as runtime `Gate2InferenceService._extract_features`

### `gate2_class_names.json`
- Type:
  - JSON array of strings
- Proven label order:
  - `["angry", "fear", "happy", "neutral", "sad", "surprise"]`
- Purpose:
  - map model output indices to emotion labels

### `gate2_model_metadata.json`
- Type:
  - JSON metadata
- Proven fields:
  - `model_name`
  - `version`
  - `model_type`
  - `feature_size` (metadata says `64`, but runtime/training actually use a much larger concatenated feature vector)
  - `num_classes`
  - `class_names`
  - `training_date`
  - `dataset_path`
  - per-class metrics

### Preprocessing Contract

From runtime and training script evidence:
- face image is converted to grayscale
- HOG features:
  - image resized to `64x64`
  - HOG params:
    - block size `(16,16)`
    - block stride `(8,8)`
    - cell size `(8,8)`
    - bins `9`
- pixel features:
  - grayscale image resized to `48x48`
  - flattened and normalized by `/255.0`
- final feature vector:
  - `concatenate(HOG features, pixel features)`

### Runtime/Training Match

This contract matches between:
- merged runtime `backend/cultivator/services/gate2_inference.py`
- individual project runtime `backend/app/services/gate2_inference.py`
- individual project training script `backend/scripts/train_gate2_expression_model.py`

## Exact Conclusion

`C. pipeline does not exist intact in the merged repo, but regeneration path can be reconstructed confidently`

Why:
- The merged repo no longer contains the Gate-2 emotion training/export script.
- The adjacent individual project does contain a matching training/export script and smoke test.
- The runtime contract, class labels, metadata naming, and output filenames all align strongly.
- The remaining blocker is dataset availability, not pipeline ambiguity.

## Recommended Next Actions

1. Use the adjacent individual project script as the regeneration source of truth:
   - `Individual-Project/backend/scripts/train_gate2_expression_model.py`

2. Provide a real dataset matching the expected folder-per-class structure:
   - `data/gate2/dataset/<emotion_class>/*.jpg`

3. Export regenerated artifacts into a directory that the merged runtime already searches, ideally:
   - `Merged-Project/Smart-Agri-Suite/backend/models/video_analysis`
   or
   - `Merged-Project/Smart-Agri-Suite/backend/models/gate2`

4. Run the smoke test logic against the regenerated artifacts before enabling production validation.

