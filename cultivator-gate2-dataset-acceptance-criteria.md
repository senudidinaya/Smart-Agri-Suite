# Cultivator Gate-2 Dataset Acceptance Criteria

## Exact Go / No-Go Criteria

### Go for pilot replacement training only if all are true

- dataset is a real facial-expression dataset
- dataset root uses the exact six required class folders:
  - `angry`
  - `fear`
  - `happy`
  - `neutral`
  - `sad`
  - `surprise`
- class folders contain OpenCV-readable image files
- images contain faces that are visible enough to survive the existing resize/feature pipeline
- every class is populated
- class counts are sufficient for stratified train/validation split
- class imbalance is not extreme
- provenance is documented as replacement-model provenance
- label semantics are honest and stable relative to the current runtime decision logic

## What Must Be True Before Pilot Training

- there is a single agreed dataset root
- class labels are either exact or explicitly approved through a clean mapping review
- no class is empty
- no candidate relies on synthetic placeholders as a production substitute
- the dataset can be described truthfully in metadata and rollout notes
- the dataset is acceptable for the current HOG + grayscale pixel pipeline

## What Forces Rejection

Reject immediately if any of the following is true:

- missing one or more required classes
- labels correspond to a different task such as `truthful` / `deceptive`
- dataset is unlabeled or only grouped by IDs/filesystem buckets
- images are mostly not faces
- images are mixed operational uploads with no training governance
- content includes screenshots, artwork, landscapes, or other non-face media as a major fraction
- class sizes are too small for safe stratified split
- provenance cannot be documented honestly

## Acceptable Cleanup

Acceptable cleanup:

- removing obviously corrupted unreadable files
- normalizing file placement into the six required class folders
- documenting an explicit, semantically honest label mapping before training
- adding non-destructive dataset manifests or counts

## Unacceptable Cleanup

Unacceptable cleanup:

- inventing emotion labels for unlabeled folders
- relabeling wrong-task data as emotion classes without honest semantic basis
- mixing screenshots, artwork, and arbitrary uploads into an emotion dataset
- using deception-labeled data as a shortcut for the six-class emotion model
- treating synthetic or placeholder data as a production replacement dataset

