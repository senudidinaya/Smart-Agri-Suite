# Gate-2 Admin Evidence UI Validation

## Manual Validation Steps

1. Open an admin application with a completed Gate-2 interview.
2. Open the existing `View Analysis` modal in `AdminApplicationsScreen`.
3. Confirm the Gate-2 section shows three separate panels:
   - Final Combined Gate-2 Assessment
   - Raw Emotion Evidence
   - Raw Deception Evidence
4. Open the job-level `ViewAnalysisScreen`.
5. Confirm each Gate-2 interview card shows the same three-panel hierarchy.
6. Confirm Gate-1 call/deception sections still display separately and were not relabeled as Gate-2.

## Expected Output Cases

### Both Branches Healthy

Expected:

- Combined panel shows final decision, overall confidence, risk level, recommendation, and `all branches healthy`.
- Raw Emotion Evidence shows `healthy`, raw emotion confidence, distribution, signals, and model version when available.
- Raw Deception Evidence shows `healthy`, raw deception label/confidence, scores, signals, model type/version when available.

### Emotion Degraded

Expected:

- Combined panel includes `emotion degraded` in degraded branch chips.
- Raw Emotion Evidence panel has degraded styling.
- `fallbackReason` is visible if returned.
- Raw emotion confidence is labeled raw and does not look like the final Gate-2 confidence.

### Deception Degraded

Expected:

- Combined panel includes `deception degraded` in degraded branch chips.
- Raw Deception Evidence panel has degraded styling.
- `fallbackReason` is visible if returned.
- Raw deception confidence is labeled raw and does not look like the final Gate-2 confidence.

### Both Degraded

Expected:

- Combined panel shows both degraded branch chips.
- Both raw branch panels are visibly degraded.
- Missing raw branch metadata is shown as `legacy only` or `not returned`, not as healthy output.

## What Still Counts As Misleading Or Broken

- A panel labels raw emotion confidence as overall confidence.
- A panel labels top-level `confidence` as raw emotion confidence.
- A degraded branch is shown as healthy.
- A missing raw branch is hidden entirely while the combined result looks fully healthy.
- Raw emotion and raw deception evidence are merged into a single unlabeled confidence/decision block.

## Verification Performed

Static semantic search confirmed the admin screens now contain explicit labels for:

- `Final Combined Gate-2 Assessment`
- `Raw Emotion Evidence`
- `Raw Deception Evidence`
- `Raw emotion confidence`
- `Raw deception confidence`

TypeScript compiler validation could not run because no local or global TypeScript compiler was installed in the workspace.
