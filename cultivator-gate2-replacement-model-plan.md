# Cultivator Gate-2 Replacement Model Plan

## Executive Summary

The original Gate-2 emotion model is no longer a recovery problem. Its original dataset is effectively unavailable, and the missing trained artifacts are not locally recoverable. The safe path forward is to treat Gate-2 emotion as a **new replacement-model effort** with explicit new provenance.

This repo already preserves enough of the runtime and export contract to support that plan:

- the live runtime contract still exists in `backend/cultivator/services/gate2_inference.py`
- the strongest surviving trainer exists in the adjacent individual project
- the strongest surviving smoke test exists
- the required artifact filenames and API output semantics are still preserved

The replacement model must be introduced as a **new model lineage**, not as a claimed recovery of the historical model.

## Replacement Model Goal

### Concise Goal Statement

Build a new Gate-2 facial-expression replacement model that preserves the current runtime contract and API/UI behavior, but is explicitly documented as a newly trained model with new dataset provenance, new training date, and new activation decision.

### What part of Gate-2 is being replaced?

Only the **main Gate-2 emotion-analysis branch** is being replaced.

Specifically:

- the missing emotion classifier artifact:
  - `gate2_expression_model.pkl`
- the matching scaler artifact:
  - `gate2_scaler.pkl`

This does **not** replace:

- Gate-2 visual deception artifacts
- Gate-1 intent or deception logic
- endpoint response shape
- frontend behavior

### What runtime behavior must remain compatible?

The replacement artifacts must continue to support the existing `Gate2InferenceService` behavior:

- load via `joblib`
- use `gate2_class_names.json`
- use HOG + grayscale pixel features
- predict per-frame class probabilities
- aggregate frame predictions into:
  - `emotion_distribution`
  - `dominant_emotion`
  - `stability`
- feed the existing decision mapping logic that returns:
  - `APPROVE`
  - `VERIFY`
  - `REJECT`

### Which filenames/contracts must remain satisfied?

Required artifact filenames:

- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`
- `gate2_class_names.json`
- `gate2_model_metadata.json`

Required runtime data shape:

- class-name list matching model output order
- scaler that can transform the same combined feature vector size
- classifier supporting:
  - `predict(...)`
  - `predict_proba(...)`

### Which semantics must stay stable in API/UI?

The following API-level semantics should remain stable:

- endpoint still returns Gate-2 decision, confidence, reasons, stats, and model version
- fields stored in `inperson_interviews` remain the same
- `dominant_emotion` continues to be an emotion label or `"unknown"`
- fallback remains available if model loading or quality checks fail
- no frontend contract changes are required

### What must be explicitly documented as new provenance?

The following must be documented as **replacement-model provenance**:

- replacement dataset source and ownership
- dataset collection / curation date
- label mapping used for training
- training date
- training script version
- artifact activation date
- metadata version string showing this is not the recovered historical model

## Trainer Reuse Verdict

### Verdict

**B. The trainer can be reused with tiny safe adjustments.**

### Evidence

The surviving trainer in the individual project matches the runtime contract closely:

- same feature extraction family:
  - HOG at `64x64`
  - grayscale pixel flattening at `48x48`
- same export filenames:
  - `gate2_expression_model.pkl`
  - `gate2_scaler.pkl`
  - `gate2_class_names.json`
  - `gate2_model_metadata.json`
- same class-oriented folder dataset assumption
- same scikit-learn artifact format expected by runtime

The smoke test also validates the same basic contract:

- load model
- load scaler
- load class names
- extract the same combined feature vector
- call `predict_proba(...)`

### Why not “as-is” without caveat?

The trainer is technically compatible, but it is brittle for a replacement-model effort because it does not currently enforce replacement-model governance concerns such as:

- exact label-set validation
- stronger dataset sanity checks beyond “folder exists and has images”
- explicit provenance/version labeling to distinguish new model lineage from old metadata
- richer evaluation evidence before rollout

These are small operational hardening needs, not grounds for a rewrite.

### Tiny safe adjustments worth making before real training

The following would be safe future hardening steps before replacement training:

1. enforce the expected six-class label set explicitly
2. fail fast if any class folder is empty or severely underrepresented
3. update metadata versioning to mark the model as a replacement lineage
4. record dataset provenance fields more explicitly in metadata
5. save a small validation summary alongside metadata for rollout review

This task does **not** implement those changes; it only defines the plan.

## Minimum Replacement Dataset Contract

### Required label set

The minimum safe label set is the existing six-class set preserved in runtime and metadata:

- `angry`
- `fear`
- `happy`
- `neutral`
- `sad`
- `surprise`

Reason:

- `gate2_inference.py` decision logic explicitly relies on the presence or semantic meaning of labels such as `fear`, `angry`, `sad`, `happy`, `neutral`, and `surprise`
- changing label semantics would silently change decision behavior

### Required folder structure

Minimum expected structure:

```text
<dataset_root>/
├── angry/
├── fear/
├── happy/
├── neutral/
├── sad/
└── surprise/
```

Each class folder must contain real image files readable by OpenCV:

- `.jpg`
- `.jpeg`
- `.png`
- `.bmp`
- `.gif`

### Minimum image usability expectations

Based on existing code, a usable image must be:

- readable by `cv2.imread`
- visually contain a face relevant to the assigned label
- sufficiently clear that HOG + grayscale resized features retain signal after:
  - resize to `64x64`
  - resize to `48x48`

Practical minimum expectation:

- face should be visible, not tiny, not fully occluded, and not dominated by background
- image should not be blank, corrupted, or non-face artwork

### Class balance expectations

The trainer does not enforce balance, but the downstream model and decision rules become risky if one class dominates.

Minimum safe expectation:

- every class must be populated
- no class should be nearly empty relative to the others

Usable enough to start:

- all six classes present
- every class has enough samples to support a stratified split
- no class is so sparse that validation support becomes trivial or unstable

Too weak / risky:

- missing one or more required classes
- extreme imbalance across classes
- mislabeled classes
- low-quality frames where emotion is not visually discernible

### Can the deception dataset be reused directly?

**No.**

Why not:

- it is a different task:
  - deception dataset labels are `deceptive` / `truthful`
  - emotion path requires six emotion labels
- the runtime decision logic for emotion expects emotion probabilities, not deception probabilities
- feeding deception-trained outputs into emotion logic would break semantics while still appearing technically valid

### What would make an alternate dataset valid?

An alternate dataset is valid for this path only if it satisfies all of the following:

1. it is a real image dataset, not synthetic placeholder data
2. it can be mapped cleanly to the exact six-class emotion set already used by runtime
3. labels are stable enough that `fear`, `angry`, `sad`, `happy`, `neutral`, and `surprise` retain their current decision meaning
4. images are usable under the existing HOG + grayscale feature extraction path
5. provenance is documented as a new replacement dataset, not implied to be the original source

## Safe Train / Validate / Export Path

### Safest training location

Use the **individual project backend first**, not the merged repo directly.

Reason:

- the surviving trainer and smoke test already assume that project layout
- this avoids writing directly into live merged runtime folders before validation

Recommended working directory:

- `c:\Projects\Senudi\Individual-Project\Smart-Agri-Suite\backend`

### Exact script to run

Primary trainer:

- `scripts/train_gate2_expression_model.py`

Local dataset form:

```powershell
python scripts/train_gate2_expression_model.py --data_dir "C:\ABSOLUTE\PATH\TO\replacement_dataset" --output_dir "models\gate2"
```

Verified ZIP URL form:

```powershell
python scripts/train_gate2_expression_model.py --data_url "https://VERIFIED-URL/replacement_dataset.zip" --output_dir "models\gate2"
```

### Expected output artifacts

Expected outputs:

- `models/gate2/gate2_expression_model.pkl`
- `models/gate2/gate2_scaler.pkl`
- `models/gate2/gate2_class_names.json`
- `models/gate2/gate2_model_metadata.json`

### Smoke test path

Run after training from the same backend directory:

```powershell
python scripts\smoke_test_gate2_model.py
```

### Artifact validation criteria

Minimum validation before any staging:

1. all four expected artifact files exist
2. smoke test loads model, scaler, and class names successfully
3. class-name file is exactly:
   - `angry`
   - `fear`
   - `happy`
   - `neutral`
   - `sad`
   - `surprise`
4. metadata clearly identifies the model as a replacement lineage
5. model supports `predict_proba(...)`

### Compatibility checks against runtime expectations

Before staging, verify:

1. feature extraction assumptions still match runtime:
   - HOG `64x64`
   - pixel `48x48`
2. scaler transforms the produced feature vector without shape error
3. class ordering in JSON matches the model’s output ordering
4. runtime can load the artifacts without returning `gate2-fallback-v1`

### Manual staging into merged runtime

Do not write directly to live runtime as the first export target.

After validation, manually stage-copy:

- `gate2_expression_model.pkl`
- `gate2_scaler.pkl`
- `gate2_class_names.json`
- `gate2_model_metadata.json`

into:

- `c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend\models\video_analysis`

Why this target:

- it is an existing merged-runtime search path
- it is checked before `intent_prediction/gate2`

### Rollback safety

If the replacement model performs poorly or loads unreliably:

- remove the staged replacement artifacts from the merged runtime target
- keep fallback behavior available
- do not alter API response shape
- do not silently force the new model back on

## Safe Rollout Strategy

### Activation approach

Do **not** immediately replace fallback in production behavior without a controlled activation step.

Preferred approach:

- staged validation first
- then explicit activation by artifact staging
- keep fallback as backup

Why:

- current runtime already falls back conservatively
- artifact presence alone currently activates the model load path
- poor-quality replacement data could degrade decisions silently if not checked

### Checks required before activation

Before activation:

1. model loads successfully in the merged runtime
2. `Gate2InferenceService.is_loaded == True`
3. `result.model_version` is no longer `gate2-fallback-v1`
4. a real interview test video produces:
   - non-zero `frames_used`
   - non-zero `faces_detected`
   - non-zero or plausible `face_detection_rate`
   - non-`unknown` `dominant_emotion` when faces are visible
5. API output shape remains unchanged

### Logs and metrics to monitor after rollout

Monitor at minimum:

- model load success / failure logs
- count of `gate2-fallback-v1` responses after staging
- `frames_used`
- `faces_detected`
- `face_detection_rate`
- `stability`
- `avg_model_confidence`
- distribution of `dominant_emotion`
- decision mix:
  - APPROVE / VERIFY / REJECT

### When fallback should remain enabled as backup

Fallback should remain available whenever:

- model files are absent
- model load fails
- smoke test fails
- post-staging validation shows unstable or implausible results
- replacement dataset provenance or label quality is still disputed

## Risks and Open Decisions

### Critical

1. Whether to preserve the exact six-class label set without change
   - Recommended: yes
2. Whether the replacement dataset can truly support those six labels with stable semantics
   - This must be verified before training
3. Whether metadata/versioning will clearly mark the model as a replacement lineage
   - Must not imply historical recovery
4. Whether current historical metrics can be trusted
   - Preserved metadata shows suspiciously perfect scores and should not be used as rollout proof

### Medium

1. Whether to keep the current `RandomForest + HOG + pixel` approach
   - Recommended for contract compatibility unless a later migration is intentionally designed
2. Whether the trainer needs stronger evaluation reporting before rollout
   - Recommended: yes, but as a targeted hardening follow-up
3. Whether activation should eventually use an explicit feature flag instead of artifact presence alone
   - Recommended for safety, but not required to define the replacement plan

### Low

1. Whether admin/internal surfaces should explicitly mention “replacement model”
   - Useful for internal traceability
2. Whether duplicate metadata copies in both model directories should be consolidated later
   - Not needed for replacement readiness

## Recommended Next Actions

1. Approve the replacement-model framing: this is a new lineage, not a recovered old model.
2. Keep the existing six-class contract unchanged.
3. Acquire or curate a real replacement dataset that satisfies the six-class folder contract.
4. Before training, make tiny hardening updates to the trainer for label-set and provenance validation.
5. Train in the individual project first.
6. Run smoke test there.
7. Stage artifacts manually into the merged runtime only after validation.
8. Validate on real interview videos before treating the replacement as active.

