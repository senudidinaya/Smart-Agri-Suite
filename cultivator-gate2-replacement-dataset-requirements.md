# Cultivator Gate-2 Replacement Dataset Requirements

## Exact Dataset Contract

The replacement dataset must support the existing Gate-2 emotion runtime, not invent a new task.

Required properties:

- real image data
- emotion labels aligned to the existing six-class contract
- readable by OpenCV
- compatible with HOG + grayscale pixel feature extraction
- honest documented provenance as a replacement dataset

## Required Class Structure

Required folder structure:

```text
<dataset_root>/
├── angry/
├── fear/
├── happy/
├── neutral/
├── sad/
└── surprise/
```

Required exact label set:

- `angry`
- `fear`
- `happy`
- `neutral`
- `sad`
- `surprise`

Why exactness matters:

- `gate2_inference.py` aggregates and interprets emotion names directly
- fear and negative-emotion thresholds drive `APPROVE` / `VERIFY` / `REJECT`
- changing labels would silently change meaning even if the code still runs

## What Is Acceptable

A dataset is acceptable to start replacement-model work if:

1. all six required class folders exist
2. each class folder contains real readable image files
3. images visually contain faces relevant to the assigned emotion label
4. all classes have enough samples to support stratified train/validation splitting
5. class counts are not severely imbalanced
6. provenance is documented as a new replacement dataset source

Practical “usable enough to start” threshold from current code:

- every class must be non-empty
- every class must have enough examples to survive `train_test_split(..., stratify=y, test_size=0.2)`
- no class should be so tiny that validation support is meaningless

## What Is Not Acceptable

Not acceptable:

- synthetic placeholder data used as a production substitute
- datasets missing one or more required classes
- datasets labeled for a different task
- heavily corrupted, unreadable, or non-face images
- datasets whose labels cannot be mapped cleanly to the six existing runtime classes
- silent relabeling that changes decision semantics without documentation

## Image Quality / Face Visibility Expectations

The code resizes images aggressively before feature extraction:

- HOG path: `64x64`
- pixel path: `48x48`

So a usable source image should have:

- a visible face
- enough facial detail to survive resizing
- limited occlusion
- limited blur or corruption

If the face is too small, too obscured, or emotionally unreadable, the dataset becomes risky for this feature pipeline.

## Class Balance Expectations

The current trainer does not enforce balancing, but the replacement dataset should still aim for:

- all classes present
- roughly comparable coverage across classes

Warning signs of a risky dataset:

- one or two classes dominate most samples
- rare classes barely exist
- validation support per class is tiny

## Minimum Sample Expectations

The codebase does not define a formal numeric minimum.

What the code does imply:

- every class must have enough samples for a stratified split
- every class should produce non-trivial validation support

Therefore the minimum operational contract is:

- enough samples in every class to avoid split failure
- enough validation samples per class to make per-class metrics meaningful

## Can the Deception Dataset Be Reused Directly?

**No.**

Why:

- deception dataset task: `truthful` vs `deceptive`
- emotion dataset task: six facial-expression classes
- Gate-2 emotion runtime expects emotion probabilities and emotion names
- the decision engine uses emotion semantics such as:
  - fear
  - angry
  - sad
  - happy
  - neutral
  - surprise

Even if the feature extraction style is similar, the label semantics are incompatible.

## What Would Be Required For An Alternate Dataset To Be Valid?

An alternate dataset is valid only if:

1. it is a real facial-expression dataset
2. its labels can be mapped honestly to the six runtime classes without semantic distortion
3. the mapped classes remain meaningful for the existing decision rules
4. image quality is good enough for the current HOG + pixel pipeline
5. provenance is recorded as replacement-model provenance

## Bottom Line

The replacement dataset must be treated as a new governed input to an existing runtime contract. The easiest way to stay safe is to preserve the six-class contract exactly and reject any dataset that cannot support that contract cleanly.

