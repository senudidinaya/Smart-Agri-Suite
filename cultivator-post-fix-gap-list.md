# Cultivator Post-Fix Gap List

## High

### Partial DB guard coverage in major Cultivator endpoints

- Why it matters:
  - Predictable database-unavailable cases can still fall into the backend's generic 500 handler and surface as `"An unexpected error occurred. Please try again later."`
- Proof:
  - `backend/cultivator/api/v1/endpoints/applications.py`
    - `apply_to_job`
    - `get_applications`
    - `update_application_status`
    - all still use raw `get_db()`
  - `backend/cultivator/api/v1/endpoints/calls.py`
    - `initiate_call`
    - `check_incoming_call`
    - `accept_call`
    - `reject_call`
    - `end_call`
    - `upload_recording`
    - `get_call`
    - `start_cloud_recording`
    - `stop_cloud_recording`
    - all still use raw `get_db()`
  - `backend/cultivator/api/v1/endpoints/interviews.py`
    - `invite_for_interview`
    - `analyze_interview_video`
    - `get_interview_status`
    - `reject_application`
    - all still use raw `get_db()`
- Safe to defer:
  - No. This directly affects predictable runtime failure quality on the active Cultivator path.

## Medium

### Backend URL resolution is not centralized across the full frontend repo

- Why it matters:
  - The earlier reports imply a broader consolidation than the code actually delivers.
  - Other merged modules may still break on physical phones when Wi-Fi changes.
- Proof:
  - `frontend/lib/apiConfig.ts`
  - `frontend/services/api.ts`
  - `frontend/services/apiService.ts`
- Safe to defer:
  - Yes for Cultivator-specific verification.
  - No for repo-wide physical-device stability.

### `ViewAnalysisScreen` still masks partial endpoint failures

- Why it matters:
  - The screen converts one-side failures into empty arrays:
    - `api.getJobCallAnalyses(jobId).catch(() => ({ analyses: [] }))`
    - `api.getJobInterviewAnalyses(jobId).catch(() => ({ analyses: [] }))`
  - This can hide real backend issues while showing an incomplete UI.
- Proof:
  - `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx`
- Safe to defer:
  - Yes, if the current priority is auth/env stability.

### Some call-screen timers and pollers are only partially cancellable

- Why it matters:
  - Not a proven duplicate-navigation bug, but it can still produce churn during long-lived call flows.
- Proof:
  - `frontend/src/features/cultivator/screens/AdminCallScreen.tsx`
    - local `analysisPoll` interval + timeout are not fully centralized in refs/cleanup
  - `frontend/src/features/cultivator/screens/ClientCallScreen.tsx`
    - multiple auto-close timeouts exist across branches
- Safe to defer:
  - Yes, unless churn is still reproducible in call flows.

## Low

### Root endpoint metadata is still misleading about `/api/v1/health`

- Why it matters:
  - `backend/cultivator/main.py` root response advertises `"health": "/api/v1/health"` even though routers are mounted without an `/api/v1` prefix.
- Proof:
  - `backend/cultivator/main.py`
- Safe to defer:
  - Yes. This is documentation metadata, not the active runtime route table.

### Legacy helper `create_notification(...)` still uses raw `get_db()`

- Why it matters:
  - It is not a direct request handler, but it is not using the same explicit guard pattern as request routes.
- Proof:
  - `backend/cultivator/api/v1/endpoints/notifications.py`
- Safe to defer:
  - Yes. It already degrades gracefully by returning `None`.
