# Cultivator Call Analysis Gap List

## High

### Combined decision bug in backend call-analysis pipeline

- File / function:
  - `backend/cultivator/api/v1/endpoints/calls.py -> upload_recording`
  - `backend/cultivator/services/combined_analysis.py -> combine_intent_and_deception`
- Proof:
  - caller passes `intentLabel`
  - callee expects `predicted_intent`
- Why it matters:
  - post-call combined recommendation can be wrong even when raw intent analysis succeeds
  - `call_assessments.decision` is likely wrong or degraded
- Blocks real-world usage:
  - Yes for trustworthy admin-side decisioning
  - No for merely showing raw call intent in `ViewAnalysisScreen`

### Analysis depends on client local recording, not cloud recording

- File / function:
  - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
  - `backend/cultivator/api/v1/endpoints/calls.py -> upload_recording`
  - `backend/cultivator/api/v1/endpoints/calls.py -> start_cloud_recording / stop_cloud_recording`
- Proof:
  - no code path uses `cloudRecording.fileList` as analysis input
  - only `POST /calls/{call_id}/recording` triggers analysis
- Why it matters:
  - if client recording/upload fails, there is no analysis despite cloud recording UI
- Blocks real-world usage:
  - Yes in any scenario where local recording is unreliable on device

## Medium

### Admin modal and analysis screen read different storage views

- File / function:
  - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx -> handleViewCallAssessment`
  - `backend/cultivator/api/v1/endpoints/jobs.py -> get_job_call_analyses`
  - `backend/cultivator/api/v1/endpoints/interviews.py -> get_interview_status`
- Why it matters:
  - `ViewAnalysisScreen` reads raw `db.calls.analysis`
  - admin modal reads `db.call_assessments`
  - these can diverge because of the combined-decision bug
- Blocks real-world usage:
  - Partially

### Admin applications enrichment silently tolerates missing interview status

- File / function:
  - `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx -> loadJobs`
- Why it matters:
  - `Promise.allSettled` background enrichment can silently omit `interviewStatus`
  - a job can appear without assessment info even if status lookup failed
- Blocks real-world usage:
  - Not fully, but weakens debugging and confidence

## Low

### Client upload comments are misleading

- File / function:
  - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx -> uploadRecording`
- Why it matters:
  - comments say upload/analysis is “fire-and-forget” and “background”
  - backend actually analyzes synchronously before response
- Blocks real-world usage:
  - No, but it can mislead future debugging
