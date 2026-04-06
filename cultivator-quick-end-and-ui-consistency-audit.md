# Cultivator Quick-End And UI Consistency Audit

## Executive Summary

This audit checked two things:

1. whether a very fast client-side call end behaves truthfully when recording never became ready
2. whether the frontend displays the same call-analysis truth that the backend persisted

Result:

- Quick-end behavior is now safe and truthful after one tiny local correction.
- UI retrieval is only partially consistent: the app has two different call-analysis display paths backed by two different persisted documents.

## Quick-End Lifecycle Trace

### State and refs involved

- `isRecording` in `frontend/src/features/cultivator/hooks/useAgora.ts`
- `isRecordingStarting` in `frontend/src/features/cultivator/hooks/useAgora.ts`
- `callEndingRef` in `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
- `isEndingCall` in `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
- `recordingAttemptedRef` in `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`

### Sequence

1. `ClientCallScreen` mounts and calls `joinChannel()`.
2. Agora `onJoinChannelSuccess` sets `agoraState.isJoined = true`.
3. A `useEffect` in `ClientCallScreen` launches delayed `tryStartRecording()`.
4. `tryStartRecording()` waits 500ms, then calls `startLocalRecording()`.
5. `startLocalRecording()` sets `isRecordingStarting = true`, and only sets `isRecording = true` when the native start returns success.
6. If the user ends the call quickly, `handleEndCall()` or `handleCallEndedByOther()` sets `callEndingRef.current = true`.
7. End-call logic now checks `isRecording` before deciding to call `stopLocalRecording()`.
8. If recording was not ready, stop/upload is skipped explicitly.
9. If a delayed recording start resolves after ending has already begun, it is now stopped immediately.

## Quick-End Race Guard Verdict

Verdict: `A. quick-end path is now safe and truthful`

Evidence:

- No upload starts if `uri` is missing:
  - `handleEndCall()` uploads only inside `if (uri)`.
  - `handleCallEndedByOther()` uploads only inside `if (uri)`.
- No fake URI is created:
  - `stopLocalRecording()` returns `string | null`.
  - no fallback or fabricated URI exists.
- No misleading success state on quick-end:
  - ended screen only shows success when `analysisResult && !isUploading && !uploadFailed`
  - quick-end with no recording URI renders `Recording not available`
- Duplicate end taps are locally blocked:
  - `callEndingRef.current` short-circuits duplicate end requests
  - End Call button is disabled while `isEndingCall`
- Late start after ending is now suppressed and cleaned up:
  - `tryStartRecording()` checks `callEndingRef` before starting, before retrying, and after a start resolves
  - if a late start still succeeds, `stopLocalRecording()` is called immediately

### Local end vs remote end

Both paths now use the same gating principle:

- local end: `handleEndCall()`
- remote/admin end: `handleCallEndedByOther()`

Both:

- set `callEndingRef`
- only stop/upload when `isRecording` is true
- otherwise skip stop/upload truthfully

## Analysis Retrieval Matrix

| Screen | Effect/Handler | Endpoint | Expected Shape | Rendered Fields | Risk |
|---|---|---|---|---|---|
| `ViewAnalysisScreen.tsx` | `fetchAnalyses()` on mount/refresh | `GET /jobs/{job_id}/call-analyses` | `{ analyses: CallStatusResponse[] }` with `analysis.intentLabel/confidence/scores` | raw Gate-1 intent label, confidence, score bars | Medium |
| `ViewAnalysisScreen.tsx` | `fetchAnalyses()` on mount/refresh | `GET /jobs/{job_id}/interview-analyses` | interview analysis objects | Gate-2 decision, emotion, deception blocks | Low |
| `AdminApplicationsScreen.tsx` modal | `handleViewCallAssessment()` | `GET /admin/interviews/{job_id}/{client_id}` | `InterviewStatusResponse` with `callAssessment` | summary decision, confidence, scores | Medium |
| `AdminApplicationsScreen.tsx` list badge | background `loadJobs()` enrichment via `getInterviewStatus()` | `GET /admin/interviews/{job_id}/{client_id}` | `callAssessment` | decision + confidence badge | Medium |
| `AdminCallScreen.tsx` ended view | `pollForAnalysis()` | `GET /calls/{call_id}` | `CallStatusResponse.analysis` | raw intent label, confidence, score bars | Medium |

## Persisted-vs-Displayed Field Mapping

### Backend persisted data

`backend/cultivator/api/v1/endpoints/calls.py` persists two related outputs:

1. `db.calls.analysis`
   - `intentLabel`
   - `confidence`
   - `scores`
   - `deceptionLabel`
   - `deceptionConfidence`
   - `deceptionSignals`
   - `finalDecision`
   - `finalRecommendation`
   - `trustScore`
   - `reasoning`
   - `riskLevel`

2. `db.call_assessments`
   - `decision` = `analysis.finalDecision`
   - `recommendation`
   - `confidence` = `analysis.confidence`
   - `trustScore`
   - `riskLevel`
   - `reasoning`
   - `scores`
   - `deceptionLabel`
   - `deceptionConfidence`

### Frontend displayed data

1. `ViewAnalysisScreen.tsx`
   - displays only `call.analysis.intentLabel`
   - displays only `call.analysis.confidence`
   - displays only `call.analysis.scores`
   - does not display `finalDecision`, `trustScore`, `riskLevel`, `reasoning`, or deception fields even though they are persisted on `db.calls.analysis`

2. `AdminApplicationsScreen.tsx`
   - reads `callAssessment.decision`
   - reads `callAssessment.confidence`
   - reads `callAssessment.scores`
   - current frontend `CallAssessment` type does not include `recommendation`, `trustScore`, `riskLevel`, `reasoning`, or deception fields, even though backend persists them in `db.call_assessments`

3. `AdminCallScreen.tsx`
   - reads `GET /calls/{call_id}` and displays raw `analysis.intentLabel/confidence/scores`

## Truthfulness Gaps

### Gap 1: two different call-analysis truths are shown in different screens

- Severity: Medium
- Files:
  - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
  - `backend/cultivator/api/v1/endpoints/calls.py`
  - `backend/cultivator/api/v1/endpoints/interviews.py`
- Why it matters:
  - the per-job analysis screen shows raw Gate-1 intent
  - the admin modal shows combined call decision summary
  - users can legitimately see different labels for the same call
- Status: definitely real, but not necessarily a bug if the product intends two different views

### Gap 2: admin summary displays combined decision with raw intent confidence

- Severity: Medium
- Files:
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
  - `backend/cultivator/api/v1/endpoints/calls.py`
  - `backend/cultivator/api/v1/endpoints/interviews.py`
- Why it matters:
  - backend saves `decision = finalDecision`
  - backend saves `confidence = analysis.confidence` (raw intent confidence)
  - UI renders them together as if the percentage belongs to the final combined decision
- Status: definitely misleading

### Gap 3: persisted combined-analysis fields are not surfaced in the active UI

- Severity: Low
- Files:
  - `frontend/src/features/cultivator/services/api.ts`
  - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
- Why it matters:
  - `trustScore`, `riskLevel`, `reasoning`, and `recommendation` are persisted but not visible in the current frontend types/views
- Status: real, safe to defer

## Final Verdict

- Quick-end behavior: truthful and deterministic after the tiny late-start cleanup correction.
- UI retrieval consistency: partially consistent.

The backend persistence is internally coherent, but the frontend presents:

- raw call intent in some places
- combined call decision summary in others

That means the UI does not present one single call-analysis truth everywhere.

## Recommended Next Actions

1. Decide whether the product should present:
   - raw Gate-1 intent
   - combined final decision
   - or both explicitly labeled
2. If a single user-facing truth is desired, align the admin call-analysis UI and the per-job analysis screen around one persisted source and label the confidence field correctly.
