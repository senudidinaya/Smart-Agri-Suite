# FRONTEND_ANALYZER_DIAGNOSTIC_REPORT

Date: 2026-03-08
Scope: Analysis only. No implementation files were changed.

## Executive Summary
The analyzer experience is only **partially migrated** into `frontend/app/cultivator`. The dashboard card correctly routes to `/cultivator`, but the migrated flow does not reproduce the original analyzer navigation model (client tabs + incoming-call polling + named stack routes). As a result, users land on the job posting page and do not see the original tabbed client experience, and several call/interview paths are unreachable or broken.

Primary root causes:
1. Missing client tab container in Expo Router (`frontend/app/cultivator/client` has no `_layout.tsx`).
2. Default redirect sends client users directly to `client/profile` (`frontend/app/cultivator/_layout.tsx`).
3. Legacy React Navigation named-route calls still used (`AdminCall`, `ClientCall`, `ViewAnalysis`, `InPersonInterview`) without matching Expo file-route wiring.
4. Incoming-call polling mechanism from original analyzer `App.tsx` is not present in main frontend.
5. API path mismatches between new frontend client and backend interview/notification endpoints.
6. Main frontend dependency set is missing analyzer-critical packages (notably `react-native-agora`).

---

## Phase 1: Dashboard Routing Investigation

File inspected: `frontend/app/index.tsx`

1. Component rendering Idle Land cards:
- `AppHome` renders card grid via `COMPONENTS.map(...)`.

2. Second card route:
- Second card (`id: "job_seeker"`) has `route: "/cultivator"`.

3. Route flow trace:
- Card press -> `handlePress(comp.route)` -> `router.push(route)` -> `/cultivator`.
- Root stack includes cultivator group in `frontend/app/_layout.tsx` via `<Stack.Screen name="cultivator" ... />`.

Conclusion:
- Dashboard button wiring is correct up to `/cultivator`.

---

## Phase 2: Cultivator Router Analysis

Files inspected:
- `frontend/app/cultivator/_layout.tsx`
- `frontend/app/cultivator/client/*`
- `frontend/app/cultivator/admin/*`

1. Default route behavior for `/cultivator`:
- `/cultivator` resolves to `frontend/app/cultivator/_layout.tsx`, which immediately redirects.

2. Redirection logic:
- `interviewer` -> `/cultivator/admin/applications`
- `client` -> `/cultivator/client/profile`
- fallback -> `/cultivator/client/profile`

3. First screen for client users:
- `frontend/app/cultivator/client/profile.tsx`.

4. Why only job posting/job management appears:
- There is no tab layout under `frontend/app/cultivator/client/` (no `client/_layout.tsx` using `Tabs`).
- Client is redirected straight to profile page.

Conclusion:
- Router currently implements single-page landing, not the original multi-tab client dashboard.

---

## Phase 3: Missing Analyzer Tabs

Original analyzer architecture file:
- `_cultivator_intention_analyzer/frontend/App.tsx`

Original model:
- React Navigation with:
  - `ClientTabNavigator` (`Profile`, `Jobs`, `Notifications`)
  - Client stack overlay screens (`IncomingCall`, `ClientCall`, `ViewAnalysis`)
  - Admin stack (`Applications`, `AdminCall`, `InPersonInterview`, `ViewAnalysis`)

Original client dashboard screens:
- `_cultivator_intention_analyzer/frontend/screens/ClientProfileScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/ClientJobsScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/ClientNotificationsScreen.tsx`

Current Expo Router implementation:
- Individual pages exist in `frontend/app/cultivator/client/*.tsx`.
- But tab container/navigation scaffold is missing.

Lost during migration (behavioral, not file existence):
- Tabbed client navigation experience.
- Easy in-UI access between Profile/Jobs/Notifications.

---

## Phase 4: Navigation API Mismatch

Search results in main cultivator pages show legacy navigation usage:
- `useNavigation()` in call/admin screens.
- `navigation.navigate('AdminCall'...)` in `frontend/app/cultivator/admin/applications.tsx`.
- `navigation.navigate('ViewAnalysis'...)` in `frontend/app/cultivator/admin/applications.tsx`.
- `navigation.navigate('InPersonInterview'...)` in `frontend/app/cultivator/admin/applications.tsx`.

Compatibility assessment:
- These are legacy React Navigation route names from analyzer `App.tsx`.
- Expo Router uses file-based route paths (for example `/cultivator/admin/call`) unless explicit compatible navigator names are set.
- There are no file routes for `ViewAnalysis` and `InPersonInterview` in main frontend.

Impact:
- Admin actions depending on these named routes are likely broken or no-op at runtime.

---

## Phase 5: Screen Mapping Comparison

| Original Analyzer Screen | Current Smart-Agri-Suite Screen | Status |
|---|---|---|
| `ClientProfileScreen` | `frontend/app/cultivator/client/profile.tsx` | Integrated (default landing) |
| `ClientJobsScreen` | `frontend/app/cultivator/client/jobs.tsx` | Integrated but weakly reachable (no tabs/menu) |
| `ClientNotificationsScreen` | `frontend/app/cultivator/client/notifications.tsx` | Integrated but weakly reachable (no tabs/menu) |
| `ClientCallScreen` | `frontend/app/cultivator/client/call.tsx` | Partially integrated (routing API mismatch risk) |
| `IncomingCallScreen` | `frontend/app/cultivator/incoming-call.tsx` | Partially integrated (no global incoming-call polling) |
| `AdminApplicationsScreen` | `frontend/app/cultivator/admin/applications.tsx` | Integrated (primary admin page) |
| `AdminCallScreen` | `frontend/app/cultivator/admin/call.tsx` | Partially integrated (called via legacy named navigation) |
| `ViewAnalysisScreen` | No corresponding active file route | Missing |
| `InPersonInterviewScreen` | No corresponding active file route | Missing |

---

## Phase 6: Agora Integration Verification

Files inspected:
- `frontend/src/hooks/useAgora.ts`
- `frontend/app/cultivator/client/call.tsx`
- `frontend/app/cultivator/admin/call.tsx`
- `frontend/src/api/cultivatorApi.ts`
- `backend/agora_service.py`
- `frontend/src/config.ts`
- `backend/.env`, `backend/.env.example`

Findings:
1. Agora App ID usage:
- Frontend reads `EXPO_PUBLIC_AGORA_APP_ID` in `frontend/src/config.ts`.
- Call screens use fallback `agora.appId || EXPO_PUBLIC_AGORA_APP_ID`.

2. Token generation endpoint usage:
- `frontend/src/api/cultivatorApi.ts` calls `POST /api/agora/generate-token` via `getAgoraToken(...)`.
- Backend endpoint exists in `backend/agora_service.py`.

3. Channel join logic:
- `useAgora` initializes engine and calls `joinChannel(token, channelName, uid, options)`.
- Client/admin call screens fetch/refresh token then invoke `joinChannel`.

4. Audio engine initialization:
- Implemented in `frontend/src/hooks/useAgora.ts` with event handlers and permission checks.

5. Recording logic:
- Local recording start/stop in `useAgora`.
- Client call uploads recording through `cultivatorApi.uploadRecording(...)`.

6. Environment variable presence:
- `EXPO_PUBLIC_AGORA_APP_ID` is referenced in code, but no `frontend/.env*` file is present in main frontend directory.
- `AGORA_APP_ID` and `AGORA_CERT` exist in backend env files (`backend/.env`, `backend/.env.example`), but `backend/.env` currently has blank values.

Conclusion:
- Agora code path is present, but runtime readiness is not guaranteed without installed SDK + populated env values.

---

## Phase 7: Third-Party Library Verification

Compared:
- `frontend/package.json`
- `_cultivator_intention_analyzer/frontend/package.json`

Required libraries check (main frontend):
- `@react-native-async-storage/async-storage`: Present
- `expo-router`: Present
- `react-native-reanimated`: Present
- `react-native-gesture-handler`: Present
- `react-native-agora`: **Missing**

Analyzer dependencies missing in main frontend:
- `@react-navigation/bottom-tabs`
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `expo-asset`
- `expo-av`
- `expo-camera`
- `expo-constants`
- `expo-file-system`
- `expo-font`
- `react-native-agora`
- `react-native-web`

Impact:
- Missing `react-native-agora` is critical for call experience on native.
- Missing explicit React Navigation packages increases risk for current legacy navigation usages in migrated screens.

---

## Phase 8: Incoming Call Mechanism

Original analyzer mechanism:
- `_cultivator_intention_analyzer/frontend/App.tsx` starts polling every 3 seconds:
  - `api.checkIncomingCall()` in `setInterval(...)`
  - If incoming call exists, navigates to `IncomingCall` modal route.

Main frontend status:
- `frontend/src/api/cultivatorApi.ts` still provides `checkIncomingCall()`.
- No equivalent centralized polling loop found in `frontend/app/cultivator/*`.

Impact:
- Incoming calls may not automatically pop open in the new app flow.

---

## Phase 9: API Compatibility

Compared service layers:
- `_cultivator_intention_analyzer/frontend/services/api.ts`
- `frontend/src/api/cultivatorApi.ts`

Compatible endpoint families (mapped with new `/cultivator` prefix):
- auth/login/me
- jobs
- applications
- calls initiate/incoming/accept/reject/end/status/recording
- explain gate1/gate2/questions

Mismatches discovered:
1. Notifications:
- Original client used `POST /notifications/mark-read` and `GET /notifications/unread-count`.
- New client uses `PATCH /cultivator/notifications/read`.
- Backend notifications router currently exposes:
  - `POST /notifications/mark-read`
  - `GET /notifications/unread-count`
  - `GET /notifications/`
- `PATCH /notifications/read` is not present in inspected backend router.

2. Interviews:
- New client uses `/cultivator/interviews/{job}/{client}/...`.
- Backend interviews router prefix is `/admin/interviews`.
- This affects methods like invite/status/reject in `frontend/src/api/cultivatorApi.ts`.

Conclusion:
- Interview and notification APIs are not fully aligned between main frontend and current backend endpoints.

---

## Phase 10: Final Root Cause and Fix Strategy

### Root cause for "Jobs tab not appearing"
The app does not currently provide the analyzer's tabbed client shell in Expo Router. Entering `/cultivator` redirects directly to `/cultivator/client/profile`, and there is no client tab navigator (`client/_layout.tsx`) to expose `Jobs` and `Notifications` as tabs. Therefore users only see the profile/job-posting page unless they manually route to other URLs.

### Additional compounding issues
- Legacy named-route navigation still present and partially incompatible with file-based routing.
- Missing `ViewAnalysis` and `InPersonInterview` routes in active router.
- Missing incoming-call polling orchestration.
- API path mismatches for interview and notifications endpoints.
- Missing `react-native-agora` dependency in main frontend.

### Recommended fix strategy (no code applied in this phase)
1. Add an Expo Router client tab layout under `frontend/app/cultivator/client/_layout.tsx` to replicate original client tabs.
2. Normalize role redirects in `frontend/app/cultivator/_layout.tsx` (`admin` and/or `interviewer` policy).
3. Replace legacy `navigation.navigate('RouteName')` with Expo Router path navigation or provide explicit compatible screen names.
4. Add missing route files for view-analysis and in-person interview screens.
5. Re-introduce incoming-call polling (or socket/push equivalent) in main app flow.
6. Align frontend interview/notification API paths with backend route prefixes.
7. Install missing analyzer-critical dependencies, especially `react-native-agora`.
8. Populate runtime env values for Agora (`EXPO_PUBLIC_AGORA_APP_ID`, `AGORA_APP_ID`, `AGORA_CERT`).

---

## Navigation Flow Diagram

```mermaid
flowchart TD
  A[Login Success] --> B[/ dashboard index]
  B --> C[Tap Looking For a Job?]
  C --> D[router.push('/cultivator')]
  D --> E[frontend/app/cultivator/_layout.tsx]
  E -->|role interviewer| F[/cultivator/admin/applications]
  E -->|role client| G[/cultivator/client/profile]
  E -->|fallback| G
  G --> H[No client tab shell present]
  H --> I[Jobs/Notifications not surfaced as tabs]
```
