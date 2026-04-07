# Gate-2 Admin Evidence UI Implementation

## Files Changed

| File | Change |
| --- | --- |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | Added compact Gate-2 evidence panels to the existing full analysis modal. |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` | Added the same semantic evidence hierarchy to the job-level interview analysis cards. |

## Screens / Components Updated

### Admin Applications Analysis Modal

Updated the Gate-2 section to show:

- Final Combined Gate-2 Assessment
- Raw Emotion Evidence
- Raw Deception Evidence
- DeepSeek insight remains below the evidence panels

### View Analysis Screen

Updated each Gate-2 interview card to show:

- Final Combined Gate-2 Assessment
- Raw Emotion Evidence
- Raw Deception Evidence
- Existing Gate-1 deception display remains separate

## Exact Fields Now Displayed

### Combined Assessment

- `combinedAssessment.finalDecision`
- `combinedAssessment.overallConfidence`
- `combinedAssessment.riskLevel`
- `combinedAssessment.recommendation`
- `combinedAssessment.degradedBranches`
- `combinedAssessment.reasoning`

If `combinedAssessment` is absent, the UI uses the legacy top-level `analysisDecision` / `confidence` only as a clearly compatible final-summary fallback.

### Raw Emotion

- `rawEmotion.decision`
- `rawEmotion.confidence`
- `rawEmotion.dominantEmotion`
- `rawEmotion.emotionDistribution`
- `rawEmotion.topSignals`
- `rawEmotion.modelVersion`
- `rawEmotion.fallbackReason`
- `rawEmotion.healthy`
- `rawEmotion.degraded`

If `rawEmotion` is absent, the UI uses legacy emotion fields for display but marks the panel as `legacy only` and warns that health metadata was not returned.

### Raw Deception

- `rawDeception.label`
- `rawDeception.confidence`
- `rawDeception.scores`
- `rawDeception.topSignals`
- `rawDeception.modelVersion`
- `rawDeception.modelType`
- `rawDeception.fallbackReason`
- `rawDeception.healthy`
- `rawDeception.degraded`

If `rawDeception` is absent but legacy `gate2_deception` exists, it is converted for display only. Legacy rules fallback is marked degraded.

## Degraded / Fallback Handling

- Combined degraded branches are shown as chips such as `emotion degraded` or `deception degraded`.
- Raw emotion fallback reason is shown when present.
- Raw deception fallback reason is shown when present.
- Missing raw deception is shown as `not returned`.
- Missing raw emotion health metadata is shown as `legacy only`.

## Why This Is Safe And Narrow

The changes are frontend-only and display-only. They do not alter backend aggregation, model loading, ML inference, persistence, or Gate-1 behavior. The UI remains additive and optional-field safe for older persisted records.
