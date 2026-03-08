# Frontend Analyzer Merge Status

Date: 2026-03-08
Scope: Read-only analysis only. No implementation changes were made.

## 1) Current Dashboard Navigation Architecture

### Dashboard file and button rendering
- Dashboard is rendered in `frontend/app/index.tsx`.
- The card/button grid is rendered by mapping `COMPONENTS` in `frontend/app/index.tsx`.
- Navigation is handled by:
  - `handlePress(route)` in `frontend/app/index.tsx`
  - `router.push(route)` in `frontend/app/index.tsx`

### Idle Land section and second button route
From `frontend/app/index.tsx`:
- First card: `id: "idle_land"`, `route: "/overview"`
- Second card: `id: "job_seeker"`, `title: "Looking For a Job?"`, `route: "/cultivator"`

This confirms the second dashboard button currently routes to `/cultivator`.

## 2) Expo Router Structure and Linked Routes

### Main router entry
- Root stack is defined in `frontend/app/_layout.tsx`.
- The `cultivator` route group is included via:
  - `<Stack.Screen name="cultivator" options={{ headerShown: false }} />`

### Active cultivator routes under `frontend/app/cultivator`
- `frontend/app/cultivator/_layout.tsx`
- `frontend/app/cultivator/incoming-call.tsx`
- `frontend/app/cultivator/client/profile.tsx`
- `frontend/app/cultivator/client/jobs.tsx`
- `frontend/app/cultivator/client/notifications.tsx`
- `frontend/app/cultivator/client/call.tsx`
- `frontend/app/cultivator/admin/applications.tsx`
- `frontend/app/cultivator/admin/call.tsx`

### Route tied to second dashboard button
- Second button points to `/cultivator`.
- `frontend/app/cultivator/_layout.tsx` then redirects by role:
  - `interviewer` -> `/cultivator/admin/applications`
  - `client` -> `/cultivator/client/profile`
  - fallback -> `/cultivator/client/profile`

Conclusion: it is wired to cultivator experience, but role handling has mismatches (see sections 5 and 6).

## 3) Analyzer Frontend Architecture (`_cultivator_intention_analyzer/frontend`)

### Original navigation system
- Original analyzer uses React Navigation stack/tab setup in `_cultivator_intention_analyzer/frontend/App.tsx`.
- Navigators:
  - Auth stack: `Login`, `Register`
  - Client tab + client stack
  - Admin tab + admin stack

### Original CLIENT experience screens
- `_cultivator_intention_analyzer/frontend/screens/ClientProfileScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/ClientJobsScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/ClientNotificationsScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/ClientCallScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/IncomingCallScreen.tsx`

### Original ADMIN/INTERVIEWER experience screens
- `_cultivator_intention_analyzer/frontend/screens/AdminApplicationsScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/AdminCallScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/InPersonInterviewScreen.tsx`
- `_cultivator_intention_analyzer/frontend/screens/ViewAnalysisScreen.tsx`

### API style in original analyzer
- `_cultivator_intention_analyzer/frontend/services/api.ts` uses base ending in `/api/v1` and endpoints like:
  - `/auth/login`, `/auth/me`
  - `/calls/*`
  - `/admin/interviews/*`
  - `/notifications/*`

### Comparison to Smart-Agri-Suite router
- Main app uses Expo Router file routes in `frontend/app/*`.
- Analyzer original app uses React Navigation route names (`AdminCall`, `ViewAnalysis`, `InPersonInterview`, etc.).
- Main merged cultivator files still contain several React Navigation route-name assumptions.

## 4) Integration Status: Is Analyzer Client UI Integrated?

### Integrated into active router
Yes, partially integrated and active under `frontend/app/cultivator/*`:
- `ClientCallScreen` equivalent exists at `frontend/app/cultivator/client/call.tsx`
- `AdminCallScreen` equivalent exists at `frontend/app/cultivator/admin/call.tsx`
- `IncomingCallScreen` equivalent exists at `frontend/app/cultivator/incoming-call.tsx`

### How integrated
- These are local copied/ported files in main frontend.
- There are no imports from `_cultivator_intention_analyzer` in active main routes.

## 5) Broken or Missing Links Found

### A) Role mismatch in cultivator redirect logic
- `frontend/app/cultivator/_layout.tsx` only treats `interviewer` as admin flow.
- Original analyzer role gate in `_cultivator_intention_analyzer/frontend/App.tsx` used `admin` for admin flow.
- Current effect: users with role `admin` in main app are sent to client fallback instead of admin applications.

### B) Missing routes for screens referenced by admin applications screen
- `frontend/app/cultivator/admin/applications.tsx` calls:
  - `navigation.navigate('ViewAnalysis', ...)`
  - `navigation.navigate('InPersonInterview', ...)`
  - `navigation.navigate('AdminCall', ...)`
- But Expo Router group currently has only file routes for:
  - `admin/applications`, `admin/call`, `client/*`, `incoming-call`
- There are no route files for:
  - `InPersonInterview` equivalent
  - `ViewAnalysis` equivalent

### C) Navigation API mismatch risk (route-name navigation vs file-based routing)
- `frontend/app/cultivator/admin/applications.tsx` uses `useNavigation` and route names from legacy React Navigation flow.
- In Expo Router integration, route-name strings may not match registered screen names unless explicitly configured.

### D) Missing incoming-call polling logic in main merged flow
- Original analyzer had polling in `_cultivator_intention_analyzer/frontend/App.tsx` (`checkIncomingCall` interval).
- Main frontend does not have equivalent centralized polling orchestration in `frontend/app/cultivator/*`.
- Result: incoming call screen may not auto-open unless another trigger exists.

### E) Dashboard localization mapping bug for second card
- In `frontend/app/index.tsx`, label key mapping still checks `comp.id === 'buyer_intent'`.
- Second card id is now `job_seeker`.
- Result: displayed title/subtitle translations for second card may resolve to wrong keys or fallback behavior.

### F) API path strategy divergence (potential mismatch risk)
- Main `frontend/context/AuthContext.tsx` uses `${AUTH_API_BASE_URL}/auth/*`.
- Main `frontend/src/api/cultivatorApi.ts` uses `/cultivator/*` style endpoints and base without `/api/v1`.
- Original analyzer used `/api/v1` + non-prefixed (`/auth`, `/calls`, `/admin/interviews`) paths.
- This can be valid if backend supports both namespaces, but it is a clear integration seam to verify.

## 6) Role-Based Navigation Verification

### Current login redirect
- Login screen (`frontend/app/auth/login.tsx`) does `router.replace('/')` after success.
- Root auth gate in `frontend/app/_layout.tsx` only enforces auth/no-auth; it does not role-redirect.

### What happens by role today
- `client`:
  - Login -> `/` dashboard -> second button `/cultivator` -> redirected to `/cultivator/client/profile`
  - Client analyzer routes are reachable.
- `interviewer`:
  - Login -> `/` dashboard -> second button `/cultivator` -> redirected to `/cultivator/admin/applications`
  - Admin flow reachable by current logic.
- `admin`:
  - Login -> `/` dashboard -> second button `/cultivator` -> falls into fallback -> `/cultivator/client/profile`
  - This is inconsistent with expected admin/interviewer interview management access.

## 7) Is Analyzer Client Interface Properly Connected to Dashboard?

Short answer: **Partially connected, not fully correct**.

What is connected:
- Second dashboard card routes to `/cultivator`.
- Core client/admin call screen files exist inside active app routes.

What is not fully connected/correct:
- Admin role routing mismatch (`admin` not treated as admin in cultivator layout).
- Missing/invalid navigation targets (`ViewAnalysis`, `InPersonInterview`) from admin applications screen.
- Missing centralized incoming-call polling behavior from original analyzer flow.
- Translation key mismatch for renamed second card.

## 8) Recommended Merge Strategy (No Changes Applied Yet)

1. Normalize role-routing contract first.
- Decide canonical admin interviewer role(s): `admin`, `interviewer`, or both.
- Apply consistent checks in cultivator layout and register/login UI.

2. Replace legacy route-name navigation with Expo Router path navigation in cultivator screens.
- Especially in `admin/applications.tsx`.

3. Add missing Expo routes for full analyzer parity.
- In-person interview screen route.
- View analysis screen route.

4. Restore incoming-call polling orchestration.
- Add a focused polling mechanism (screen-level or shared provider) matching original behavior.

5. Harmonize API namespaces.
- Ensure auth/cultivator calls use a consistent route family expected by backend.

6. Fix dashboard translation key mapping for second card (`job_seeker`).

## 9) Files Most Likely Needing Modification for Proper Integration

### Dashboard and routing
- `frontend/app/index.tsx`
- `frontend/app/_layout.tsx`
- `frontend/app/cultivator/_layout.tsx`

### Cultivator navigation/screens
- `frontend/app/cultivator/admin/applications.tsx`
- `frontend/app/cultivator/incoming-call.tsx`
- `frontend/app/cultivator/client/call.tsx`
- `frontend/app/cultivator/admin/call.tsx`
- (add missing) `frontend/app/cultivator/admin/in-person-interview.tsx`
- (add missing) `frontend/app/cultivator/analysis/view.tsx`

### Auth and role consistency
- `frontend/context/AuthContext.tsx`
- `frontend/app/auth/register.tsx`

### API consistency
- `frontend/src/api/cultivatorApi.ts`
- `frontend/src/config.ts`

### Original analyzer references for parity checks
- `_cultivator_intention_analyzer/frontend/App.tsx`
- `_cultivator_intention_analyzer/frontend/services/api.ts`
- `_cultivator_intention_analyzer/frontend/screens/*`

## Final Status
- Analysis complete.
- Report generated.
- No code changes were applied to implementation files as requested.
