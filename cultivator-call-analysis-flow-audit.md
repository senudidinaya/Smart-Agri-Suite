# Cultivator Call Analysis Flow Audit

## Executive Summary

The call-analysis flow is implemented end to end, but it is only **partially working** in practice.

What is real:

- A call can be initiated and ended.
- The client call screen attempts to record locally and upload audio after the call ends.
- The backend `POST /calls/{call_id}/recording` route performs synchronous Gate-1 analysis on the uploaded audio.
- The backend persists analysis into both:
  - `calls.analysis`
  - `call_assessments`
- The frontend analysis screen retrieves call analyses from `GET /jobs/{job_id}/call-analyses`.

What is not fully reliable:

- The entire post-call analysis depends on the **client-side local recording upload**, not on the admin-side cloud recording.
- If local recording is missing or upload fails, no analysis is created.
- `ViewAnalysisScreen` was hiding retrieval failures as empty results until this audit correction.
- The backend’s combined-decision helper is called with the wrong key for intent label, which likely makes the persisted `call_assessments.decision` incorrect even when the raw call analysis exists.

Strict verdict: `CALL ANALYSIS FLOW PARTIALLY WORKING`

## End-to-End Flow Map

1. Admin starts call
   - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
   - `api.initiateCall(job.id)`
   - backend: `POST /calls/initiate`
   - writes `db.calls` document with `jobId`, `adminUserId`, `clientUserId`, Agora fields, `analysis=None`

2. Client accepts and active call begins
   - `frontend/src/features/cultivator/screens/IncomingCallScreen.tsx`
   - `api.acceptCall(callId)`
   - backend: `POST /calls/{call_id}/accept`
   - updates `db.calls.status = "accepted"`

3. Client local recording begins
   - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
   - `useAgora.startLocalRecording()`
   - creates local `.wav` path in Expo file cache

4. Call ends
   - Admin path:
     - `frontend/src/features/cultivator/screens/AdminCallScreen.tsx`
     - `api.endCall(callId)`
   - Client path:
     - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
     - `api.endCall(callId)`
   - backend: `POST /calls/{call_id}/end`
   - updates `db.calls.status = "ended"`

5. Client uploads recording
   - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
   - `api.uploadRecording(callId, uri)`
   - backend: `POST /calls/{call_id}/recording`

6. Backend runs Gate-1 analysis synchronously
   - `backend/cultivator/api/v1/endpoints/calls.py -> upload_recording`
   - loads classifier
   - extracts audio features
   - runs intent prediction
   - runs deception detection
   - combines intent + deception

7. Backend persists analysis
   - updates `db.calls.analysis`
   - upserts `db.call_assessments` by `{ jobId, clientId }`

8. Frontend retrieves analysis
   - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
   - `api.getJobCallAnalyses(jobId)`
   - backend: `GET /jobs/{job_id}/call-analyses`
   - reads from `db.calls` where `analysis` exists

## Call Analysis Trigger Trace

### Frontend trigger

#### Client-side upload path

- File:
  - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
- Trigger:
  - `handleEndCall()`
  - `handleCallEndedByOther()`
- Sequence:
  - stop local recording
  - `await api.endCall(callId)`
  - if `uri` exists, call `uploadRecording(uri)`

#### Upload API method

- File:
  - `frontend/src/features/cultivator/services/api.ts`
- Method:
  - `uploadRecording(callId, audioUri)`
- Payload:
  - `FormData`
  - field `file`
  - `uri: file://...`
  - `name: <filename>`
  - `type: "audio/wav"`
- Auth:
  - merged bearer token via `this.getAuthHeaders()`

### Backend route handling

- File:
  - `backend/cultivator/api/v1/endpoints/calls.py`
- Route:
  - `POST /calls/{call_id}/recording`
- Function:
  - `upload_recording(...)`

What it does:

- verifies caller is the client for that call
- verifies the call status is `"ended"`
- reads uploaded file bytes
- saves a temp recording file plus debug copy
- inspects audio payload duration
- rejects too-short audio
- runs synchronous ML analysis in-request
- persists analysis
- returns `success=True` with `intentLabel`, `confidence`, `scores`

### Analysis execution

- File:
  - `backend/cultivator/api/v1/endpoints/calls.py`
- Services:
  - `cultivator.services.inference.get_classifier()`
  - `cultivator.services.inference.get_deception_detector()`
  - `cultivator.services.combined_analysis.combine_intent_and_deception(...)`

Execution type:

- synchronous inside the upload request
- not deferred
- not background queued

Important dependency note:

- This depends on Gate-1 model loading and audio feature extraction dependencies.
- If these fail, upload route returns an error and no analysis is persisted.

## Persistence Matrix

| Stage | File / function | Data written / read | Key identifiers | Risk |
|---|---|---|---|---|
| Call creation | `backend/.../calls.py -> initiate_call` | writes `db.calls` | `_id=call_id`, `jobId`, `clientUserId`, `adminUserId` | Low |
| Call accepted | `backend/.../calls.py -> accept_call` | updates `db.calls.status`, `startedAt` | `call_id` | Low |
| Call ended | `backend/.../calls.py -> end_call` | updates `db.calls.status`, `endedAt` | `call_id` | Low |
| Recording upload | `backend/.../calls.py -> upload_recording` | reads uploaded bytes, saves temp/debug files | `call_id` | Medium |
| Raw call analysis persistence | `backend/.../calls.py -> upload_recording` | writes `db.calls.recording`, `db.calls.analysis` | `call_id` | Low |
| Assessment persistence | `backend/.../calls.py -> upload_recording` | upserts `db.call_assessments` | `jobId`, `clientId` | Medium |
| Call-analysis retrieval | `backend/.../jobs.py -> get_job_call_analyses` | reads `db.calls` where `analysis` exists | `jobId` | Low |
| Interview-status retrieval | `backend/.../interviews.py -> get_interview_status` | reads `db.call_assessments` | `jobId`, `clientId` | Medium |

### Persistence conclusions

- Raw call analysis is persisted in `db.calls.analysis`.
- Summary assessment is also persisted in `db.call_assessments`.
- `ViewAnalysisScreen` call retrieval uses `db.calls`, so it matches the write path for raw call analysis.
- The admin modal in `AdminApplicationsScreen` uses `getInterviewStatus()`, which reads `db.call_assessments`, not `db.calls.analysis`.

## UI Retrieval Matrix

| File | Effect / handler | Endpoint called | Response shape expected | Masking behavior | Risk |
|---|---|---|---|---|---|
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` | `fetchAnalyses()` on mount / refresh | `GET /jobs/{jobId}/call-analyses` | `{ analyses: CallStatusResponse[] }` | Previously masked with `.catch(() => ({ analyses: [] }))`; corrected in this audit | High before correction, Low after |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` | `fetchAnalyses()` on mount / refresh | `GET /jobs/{jobId}/interview-analyses` | `{ analyses: Interview[] }` | Previously masked with `.catch(() => ({ analyses: [] }))`; corrected in this audit | High before correction, Low after |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | `loadJobs()` enrichment | `GET /admin/interviews/{jobId}/{clientId}` | `InterviewStatusResponse` with `callAssessment` | errors are ignored in `Promise.allSettled` enrichment | Medium |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | `handleViewCallAssessment()` | `GET /admin/interviews/{jobId}/{clientId}` | expects `callAssessment` and `interview` | on failure shows generic alert | Medium |
| `frontend/src/features/cultivator/screens/AdminCallScreen.tsx` | status polling | `GET /calls/{callId}` | `CallResponse` with optional `analysis` | if no `analysis`, keeps polling for up to 5 min | Medium |

## Failure / Masking Points

### 1. Call analysis depends entirely on client local recording upload

- Severity:
  - High
- File / function:
  - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
  - `backend/cultivator/api/v1/endpoints/calls.py -> upload_recording`
- Why it matters:
  - The backend analysis does not use the admin-side cloud recording as the analysis source.
  - If the client’s local recording never starts, fails, or never uploads, no call analysis is produced.
- Proof:
  - `AdminCallScreen` starts/stops cloud recording, but no backend analysis path consumes `cloudRecording.fileList`.
  - The actual analysis path is only `POST /calls/{call_id}/recording`.
- Classification:
  - Definitely real

### 2. Backend combined-decision helper is called with the wrong intent key

- Severity:
  - High
- File / function:
  - `backend/cultivator/api/v1/endpoints/calls.py -> upload_recording`
  - `backend/cultivator/services/combined_analysis.py -> combine_intent_and_deception`
- Why it matters:
  - `calls.py` passes:
    - `intent_analysis = { "intentLabel": ..., "confidence": ..., "scores": ... }`
  - but `combined_analysis.py` expects:
    - `predicted_intent`
    - `all_scores`
  - so `intent_label` becomes `"UNKNOWN"` in the combined decision helper.
- Likely effect:
  - persisted `analysis.finalDecision`
  - persisted `call_assessments.decision`
  - recommendation / trust reasoning
  may be wrong even when raw intent analysis itself succeeded.
- Classification:
  - Definitely broken

### 3. UI was hiding retrieval failures as empty results

- Severity:
  - High
- File / function:
  - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx -> fetchAnalyses()`
- Why it matters:
  - failed fetches were turned into `{ analyses: [] }`
  - users could see “No analyses yet” even when the backend failed
- Classification:
  - Definitely broken for observability
- Audit correction:
  - Applied in this audit

### 4. Admin-side “call assessment” view is not reading the same data shape as `ViewAnalysisScreen`

- Severity:
  - Medium
- File / function:
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx -> handleViewCallAssessment()`
  - `backend/cultivator/api/v1/endpoints/interviews.py -> get_interview_status`
- Why it matters:
  - admin modal reads `db.call_assessments`
  - `ViewAnalysisScreen` reads `db.calls.analysis`
  - because the combined decision bug affects `call_assessments`, the two UIs can disagree
- Classification:
  - Probably broken / inconsistent

### 5. Admin call screen comments misdescribe the upload behavior

- Severity:
  - Low
- File / function:
  - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx -> uploadRecording`
- Why it matters:
  - comments say “fire-and-forget” and “analysis happens in background”
  - but backend actually performs analysis synchronously in the upload request
- Classification:
  - Not a functional bug by itself, but misleading for debugging

## Final Verdict

`CALL ANALYSIS FLOW PARTIALLY WORKING`

Direct answers:

1. Does analysis actually run after a call ends?
   - Yes, but only if the client successfully uploads a local audio recording to `POST /calls/{call_id}/recording`.

2. Is analysis persisted?
   - Yes.
   - Raw analysis is persisted in `db.calls.analysis`.
   - A summary record is also upserted into `db.call_assessments`.

3. Can `ViewAnalysisScreen` retrieve it correctly?
   - Yes for call analyses, because it reads from `GET /jobs/{job_id}/call-analyses`, which queries `db.calls.analysis`.
   - Before this audit correction, retrieval failures could be hidden as empty results.

4. Is the UI hiding failures as empty results?
   - It was.
   - This audit removed that masking in `ViewAnalysisScreen`.

5. What is the single most likely reason a user would think analysis is “not working”?
   - The flow depends on the client’s local recording and upload, while the UI previously hid retrieval failures as “No analyses yet.”

## Recommended Next Actions

1. Fix the backend combined-analysis input mismatch in `calls.py` so `combine_intent_and_deception(...)` receives the keys it actually expects.
2. Decide whether admin-side cloud recording is only optional metadata or whether it should become a real fallback analysis source.
3. Validate end-to-end on device with a real uploaded recording and inspect:
   - `db.calls.analysis`
   - `db.call_assessments`
   - `GET /jobs/{job_id}/call-analyses`
4. If admin modal accuracy matters, verify `call_assessments.decision` after fixing the combined-decision key mismatch.
