# Cultivator Post-Fix Audit Report

## Executive Summary

The post-fix patch is mostly real, but the earlier reports overstate two areas:

- The frontend auth-readiness fix for the active Cultivator route is implemented and wired correctly.
- The duplicate incoming-call navigation guard is implemented.
- The Cultivator API client now has real debug logs and better error classification.
- Backend DB guard coverage is only partial. Several cultivator endpoint files define `get_db_or_raise()` but still route through raw `get_db()` in important handlers.
- Backend URL resolution is centralized for the merged auth path and the Cultivator path, but not for the whole frontend repo. Older duplicate host-resolution helpers remain.

Final audit verdict: `PATCH MOSTLY CORRECT WITH GAPS`

## Claimed Changes Checklist

| Claim | Source reports | Audit status | Notes |
|---|---|---|---|
| Shared backend URL resolver added | `cultivator-auth-env-*` | VERIFIED | `frontend/src/shared/backendUrl.ts` exists and is used by `frontend/src/config.ts` and cultivator `services/api.ts`. |
| Merged and Cultivator API paths now use centralized resolution | `cultivator-auth-env-*` | PARTIALLY VERIFIED | True for merged auth + Cultivator flow. Not true repo-wide because older helpers remain in `frontend/lib/apiConfig.ts`, `frontend/services/api.ts`, `frontend/services/apiService.ts`. |
| Cultivator waits for merged auth/token readiness before mounting protected screens | `cultivator-auth-env-*` | VERIFIED | `CultivatorModule.tsx` gates on `loading`, `user`, `token`, and `apiReady`. |
| Token injection moved out of render | `cultivator-runtime-loop-fix-report.md` | VERIFIED | `api.setAuthToken(...)` now runs inside `useEffect` in `CultivatorModule.tsx`. |
| Duplicate incoming-call navigation guard added | `cultivator-runtime-loop-*` | VERIFIED | `lastIncomingCallId` ref in `ClientTabsShell` suppresses repeated navigation for the same call. |
| Cultivator API debug logs added | `cultivator-auth-env-implementation-report.md` | VERIFIED | Logs exist for base URL, token attach/clear, request URL, response status, and failed payloads. |
| Better frontend error classification added | `cultivator-auth-env-implementation-report.md` | VERIFIED | `toErrorMessage()` handles `401/403/404/503/5xx` distinctly. |
| Backend DB-unavailable cases now return explicit 503 across relevant endpoints | `cultivator-auth-env-*` | PARTIALLY VERIFIED | Fully true in `jobs.py` and request routes in `notifications.py`. Not true in `applications.py`, `calls.py`, `interviews.py`. |

## Verification Results

### Frontend

#### `frontend/src/shared/backendUrl.ts`

- Exists.
- Implements `resolveBackendBaseUrl(...)`.
- Supports explicit `EXPO_PUBLIC_*` URLs, Expo host metadata, and fallback host.
- Emits a warning when inference fails and fallback host is used.

Status: `VERIFIED`

#### `frontend/src/config.ts`

- Imports `resolveBackendBaseUrl`.
- Resolves merged backend from `EXPO_PUBLIC_API_BASE_URL` or host inference.
- Exports:
  - `API_BASE_URL`
  - `AUTH_API_BASE_URL`
  - `API_BASE_URL_SOURCE`
- Dev log exists:
  - `[MergedAPI] Base URL resolved to ...`

Status: `VERIFIED`

#### `frontend/src/features/cultivator/services/api.ts`

- Imports `resolveBackendBaseUrl`.
- Resolves Cultivator backend separately for port `8002`.
- Exports:
  - `api`
  - `CULTIVATOR_API_BASE_URL`
  - `CULTIVATOR_API_BASE_URL_SOURCE`
- Contains:
  - `setAuthToken(token)`
  - `hasAuthToken()`
  - `getAuthHeaders()` with hard failure if token is missing
  - `toErrorMessage()` with HTTP-classified messages
  - request logging in `request(...)`
  - base URL logging on startup

Status: `VERIFIED`

#### `frontend/src/features/cultivator/CultivatorModule.tsx`

- `AppContent()` reads merged `user`, `token`, and `loading`.
- `useEffect` performs token setup:
  - clears token and `apiReady` when auth is still loading or token missing
  - sets token and `apiReady` when token exists
- Protected navigators are not mounted until:
  - `loading === false`
  - `user != null`
  - `token != null`
  - `apiReady === true`
- `ClientTabsShell` poller checks:
  - `user`
  - `token`
  - `api.hasAuthToken()`
- Duplicate `IncomingCall` navigation guard exists using `lastIncomingCallId`.

Status: `VERIFIED`

### Backend

#### `backend/cultivator/api/v1/endpoints/jobs.py`

- Defines `get_db_or_raise()`.
- Route handlers use it consistently.

Status: `VERIFIED`

#### `backend/cultivator/api/v1/endpoints/notifications.py`

- Defines `get_db_or_raise()`.
- Request route handlers use it.
- Helper `create_notification(...)` still uses raw `get_db()`, but returns `None` if unavailable instead of crashing.

Status: `PARTIALLY VERIFIED`

#### `backend/cultivator/api/v1/endpoints/applications.py`

- Defines `get_db_or_raise()`.
- `get_current_user()` uses it.
- Route handlers still use raw `get_db()`:
  - `apply_to_job`
  - `get_applications`
  - `update_application_status`

Status: `NOT VERIFIED` for full DB-guard claim

#### `backend/cultivator/api/v1/endpoints/calls.py`

- Defines `get_db_or_raise()`.
- `get_current_user()` uses it.
- Multiple route handlers still use raw `get_db()`:
  - `initiate_call`
  - `check_incoming_call`
  - `accept_call`
  - `reject_call`
  - `end_call`
  - `upload_recording`
  - `get_call`
  - `start_cloud_recording`
  - `stop_cloud_recording`

Status: `NOT VERIFIED` for full DB-guard claim

#### `backend/cultivator/api/v1/endpoints/interviews.py`

- Defines `get_db_or_raise()`.
- `get_interviewer_user()` uses it.
- Route handlers still use raw `get_db()`:
  - `invite_for_interview`
  - `analyze_interview_video`
  - `get_interview_status`
  - `reject_application`

Status: `NOT VERIFIED` for full DB-guard claim

## Request Trigger Matrix

| File | Screen / function | Endpoint(s) | Token required | Guarded by authReady before mount | Uses shared API client | Risk |
|---|---|---|---|---|---|---|
| `frontend/src/features/cultivator/CultivatorModule.tsx` | `ClientTabsShell.checkForCalls` | `GET /calls/incoming` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/ClientJobsScreen.tsx` | `loadJobs` via `useFocusEffect` | `GET /jobs/my` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/ClientJobsScreen.tsx` | `handleCloseJob` | `PATCH /jobs/{id}/status` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/ClientNotificationsScreen.tsx` | `loadNotifications` via `useFocusEffect` | `GET /notifications/` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/ClientNotificationsScreen.tsx` | `markAsRead` | `POST /notifications/mark-read` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/ClientProfileScreen.tsx` | `handleSubmit` | `POST /jobs/` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | `loadJobsAndStatus` via `useFocusEffect` | `GET /jobs/`, `GET /admin/interviews/{jobId}/{clientId}` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | `handleInitiateCall` | `POST /calls/initiate` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | `handleCloseJob` | `PATCH /jobs/{id}/status` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | `handleInviteInterview` | `POST /admin/interviews/{jobId}/{clientId}/invite` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | `handleReject` | `POST /admin/interviews/{jobId}/{clientId}/reject` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx` | insight modal | `POST /explain/gate1`, `POST /explain/gate2` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` | `fetchAnalyses` via `useEffect` | `GET /jobs/{id}/call-analyses`, `GET /jobs/{id}/interview-analyses` | Yes | Yes | Yes | Medium |
| `frontend/src/features/cultivator/screens/ViewAnalysisScreen.tsx` | `fetchAnalyses` error path | same as above | Yes | Yes | Yes | Medium: each request is individually `.catch(() => ({ analyses: [] }))`, which can hide one-side failures |
| `frontend/src/features/cultivator/screens/AdminCallScreen.tsx` | initial question generation | `POST /explain/questions` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/AdminCallScreen.tsx` | status poll | `GET /calls/{id}` | Yes | Yes | Yes | Medium |
| `frontend/src/features/cultivator/screens/AdminCallScreen.tsx` | recording control | `POST /calls/{id}/recording/start`, `POST /calls/{id}/recording/stop`, `POST /calls/{id}/end` | Yes | Yes | Yes | Medium |
| `frontend/src/features/cultivator/screens/IncomingCallScreen.tsx` | accept / reject | `POST /calls/{id}/accept`, `POST /calls/{id}/reject` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/ClientCallScreen.tsx` | status poll | `GET /calls/{id}` | Yes | Yes | Yes | Medium |
| `frontend/src/features/cultivator/screens/ClientCallScreen.tsx` | end + upload | `POST /calls/{id}/end`, `POST /calls/{id}/recording` | Yes | Yes | Yes | Medium |
| `frontend/src/features/cultivator/screens/InPersonInterviewScreen.tsx` | question generation | `POST /explain/questions` | Yes | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/InPersonInterviewScreen.tsx` | analysis upload | `POST /admin/interviews/{jobId}/{clientId}/analyze-video` | Yes | Yes | Yes | Medium |
| `frontend/src/features/cultivator/screens/InPersonInterviewScreen.tsx` | insight generation | `POST /explain/gate2` | Yes | Yes | Yes | Low |

### Hidden auth / request path conclusion

- No second active Cultivator auth store was found in the live Cultivator route tree.
- All live Cultivator screen requests go through the shared Cultivator `api` singleton in `frontend/src/features/cultivator/services/api.ts`.
- No alternate Axios client or direct `fetch(...)` call was found inside live Cultivator screens.
- No Cultivator request path was found that bypasses the `CultivatorModule.tsx` readiness gate before screen mount.

## Base URL Resolution Matrix

| File | Variable / function | Source of truth | Fallback behavior | Physical-device-safe? | Notes |
|---|---|---|---|---|---|
| `frontend/src/shared/backendUrl.ts` | `resolveBackendBaseUrl()` | explicit env, Expo runtime host metadata | fallback host + warning | Yes, if explicit env used | Shared helper for merged auth + Cultivator path |
| `frontend/src/config.ts` | `API_BASE_URL`, `AUTH_API_BASE_URL` | `resolveBackendBaseUrl()` | `172.20.10.14:8000` | Conditionally | Good for active merged auth path; fallback is still stale if Wi-Fi changes |
| `frontend/src/features/cultivator/services/api.ts` | `API_BASE_URL` | `resolveBackendBaseUrl()` | `172.20.10.14:8002` | Conditionally | Good for active Cultivator path; fallback is still stale if Wi-Fi changes |
| `frontend/lib/apiConfig.ts` | `getPricingAPIEndpoint()` | Expo hostUri / experienceUrl | `192.168.1.3`, `10.0.2.2`, `localhost` | No | Duplicate host inference remains |
| `frontend/services/api.ts` | `getPricingAPIEndpoint()` | Expo hostUri / experienceUrl | `172.20.10.14`, `10.0.2.2`, `localhost` | No | Duplicate helper with stale hard-coded fallback |
| `frontend/services/apiService.ts` | `BASE_URL` | `Constants.expoConfig?.hostUri` | `192.168.1.1:8001` | No | Separate hard-coded path still exists |

### Base URL audit conclusion

- Centralization is real for the merged auth path and the Cultivator path.
- Centralization is not repo-wide.
- Stale host inference remains elsewhere in the merged frontend.

## Runtime Loop Risk Table

| File | Effect / listener / polling path | Cleanup exists | Duplicate navigation guard | Remount risk |
|---|---|---|---|---|
| `frontend/src/features/cultivator/CultivatorModule.tsx` | token injection `useEffect` | n/a | n/a | Low |
| `frontend/src/features/cultivator/CultivatorModule.tsx` | incoming-call polling interval | Yes | Yes | Low |
| `frontend/src/features/cultivator/screens/IncomingCallScreen.tsx` | vibration interval + animation loop | Yes | n/a | Low |
| `frontend/src/features/cultivator/screens/AdminCallScreen.tsx` | call-status polling interval | Partial | No | Medium |
| `frontend/src/features/cultivator/screens/AdminCallScreen.tsx` | analysis polling interval + timeout | Partial | n/a | Medium |
| `frontend/src/features/cultivator/screens/ClientCallScreen.tsx` | call-status polling interval | Yes | n/a | Medium |
| `frontend/src/features/cultivator/screens/ClientCallScreen.tsx` | upload auto-close timeouts | Partial | n/a | Low |
| `frontend/src/features/cultivator/screens/InPersonInterviewScreen.tsx` | recording timer interval | Yes | n/a | Low |
| `frontend/app/_layout.tsx` | `AuthGate` redirects via `router.replace` | n/a | n/a | Low |

### Runtime loop conclusion

- The specific duplicate `IncomingCall` navigation loop described in the prior report is genuinely fixed.
- No render-time side effect remains in `CultivatorModule.tsx`.
- Some call screens still have interval/timeout logic that is not fully centralized or cancellable on every branch, but this is a general churn risk, not proof of the original duplicate-navigation bug still existing.

## Backend DB Guard Coverage Table

| Endpoint file | Route / function | DB access path | Explicit 503 guard | Residual generic-500 risk |
|---|---|---|---|---|
| `backend/cultivator/api/v1/endpoints/jobs.py` | `get_jobs` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/jobs.py` | `get_my_jobs` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/jobs.py` | `create_job` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/jobs.py` | `update_job_status` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/jobs.py` | `get_job_call_analyses` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/jobs.py` | `get_job_interview_analyses` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/notifications.py` | `get_notifications` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/notifications.py` | `mark_notifications_read` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/notifications.py` | `get_unread_count` | `get_db_or_raise()` | Yes | No |
| `backend/cultivator/api/v1/endpoints/notifications.py` | `create_notification` helper | `get_db()` | No | Low: helper returns `None` instead of dereferencing |
| `backend/cultivator/api/v1/endpoints/applications.py` | `apply_to_job` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/applications.py` | `get_applications` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/applications.py` | `update_application_status` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `initiate_call` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `check_incoming_call` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `accept_call` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `reject_call` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `end_call` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `upload_recording` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `get_call` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `start_cloud_recording` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/calls.py` | `stop_cloud_recording` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/interviews.py` | `invite_for_interview` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/interviews.py` | `analyze_interview_video` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/interviews.py` | `get_interview_status` | `get_db()` | No | Yes |
| `backend/cultivator/api/v1/endpoints/interviews.py` | `reject_application` | `get_db()` | No | Yes |

## What the Code Actually Proves

### Verified fixes

- The Cultivator module no longer configures auth in render.
- The Cultivator module no longer mounts protected screens before merged auth and Cultivator API readiness.
- The duplicate `IncomingCall` navigation guard exists.
- Debug logs and error classification exist in the Cultivator API client.

### Partial fixes

- Backend DB unavailability handling is only partially applied.
- Backend URL resolution is centralized only for the merged auth path and Cultivator path, not the whole frontend repo.

### Missed auth paths

- No hidden second Cultivator auth path was found in the active Cultivator flow.
- No alternate Cultivator API client was found in the active Cultivator screens.
- `ViewAnalysisScreen` still masks one-sided endpoint failures by converting each failed fetch into `{ analyses: [] }`, which weakens debuggability.

### Missed base URL / env paths

- Legacy pricing-related helpers still infer hosts independently and still contain stale fallback hosts or `localhost`/emulator assumptions.

### Remaining backend masking risks

- DB-unavailable cases can still fall into generic 500 handling for major Cultivator routes in `applications.py`, `calls.py`, and `interviews.py`.

## Final Verdict

`PATCH MOSTLY CORRECT WITH GAPS`

The implemented patch is not fake and not broadly misrepresented. The key frontend Cultivator auth-readiness and runtime-loop claims are supported by code. However, the earlier reports overstated:

- the completeness of backend DB guard coverage
- the breadth of backend URL centralization across the repo

## Recommended Next Actions

1. Apply the same `get_db_or_raise()` pattern consistently to request handlers in:
   - `backend/cultivator/api/v1/endpoints/applications.py`
   - `backend/cultivator/api/v1/endpoints/calls.py`
   - `backend/cultivator/api/v1/endpoints/interviews.py`
2. Decide whether the repo-wide host-resolution helpers outside the Cultivator path should be consolidated, or explicitly leave them as module-specific exceptions.
3. Remove or narrow the per-request `.catch(() => ({ analyses: [] }))` masking in `ViewAnalysisScreen.tsx` if stronger debugging is required.
