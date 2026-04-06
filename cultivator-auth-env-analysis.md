# Cultivator Auth and Environment Analysis

## Findings Summary

The cultivator failures came from a combination of frontend initialization timing, duplicated physical-device URL resolution, and backend error masking.

The highest-confidence runtime chain was:

1. merged app bootstrap hydrates `user` and `token` in `frontend/context/AuthContext.tsx`
2. `frontend/src/features/cultivator/CultivatorModule.tsx` rendered cultivator navigators as soon as `loading === false` and `user` existed
3. cultivator API auth token was injected into the cultivator API singleton via an effect, not before navigator mount
4. first-screen `useFocusEffect` loaders such as `AdminApplicationsScreen`, `ClientJobsScreen`, and `ClientNotificationsScreen` could fire before the cultivator API singleton had the merged token
5. cultivator requests then failed with `Missing merged auth token`

Separately, physical-device backend targeting was fragile because the merged frontend and cultivator frontend each resolved their own backend host with separate logic and a stale hard-coded fallback host.

Separately again, the cultivator backend had endpoint helpers that used `get_db()` without guarding `None`, so failed DB connectivity could surface as the generic global 500 response:

- `An unexpected error occurred. Please try again later.`

## Relevant files

Frontend bootstrap and auth:
- `frontend/app/_layout.tsx`
- `frontend/context/AuthContext.tsx`
- `frontend/src/config.ts`

Cultivator frontend:
- `frontend/src/features/cultivator/CultivatorModule.tsx`
- `frontend/src/features/cultivator/services/api.ts`
- `frontend/src/features/cultivator/screens/AdminApplicationsScreen.tsx`
- `frontend/src/features/cultivator/screens/ClientJobsScreen.tsx`
- `frontend/src/features/cultivator/screens/ClientNotificationsScreen.tsx`

Cultivator backend:
- `backend/cultivator/main.py`
- `backend/cultivator/core/database.py`
- `backend/cultivator/api/v1/endpoints/jobs.py`
- `backend/cultivator/api/v1/endpoints/notifications.py`
- `backend/cultivator/api/v1/endpoints/calls.py`
- `backend/cultivator/api/v1/endpoints/interviews.py`
- `backend/cultivator/api/v1/endpoints/applications.py`

## Current auth lifecycle

### Merged auth

In `frontend/context/AuthContext.tsx`:
- token is stored in `AsyncStorage` under `smartagri_token`
- user is stored in `AsyncStorage` under `smartagri_user`
- startup init reads both values
- if both exist, it restores them into React state and verifies the token against `AUTH_API_BASE_URL/auth/me`
- `loading` remains `true` until the init flow completes

In `frontend/app/_layout.tsx`:
- `AuthProvider` is mounted globally
- `AuthGate` redirects based on `user` and route group

### Cultivator auth usage after single-login unification

In `frontend/src/features/cultivator/CultivatorModule.tsx`:
- cultivator entry uses merged `useAuth()`
- cultivator requests depend on `frontend/src/features/cultivator/services/api.ts`
- that API client expects a merged bearer token to be set via `api.setAuthToken(token)`

## Current base URL and environment lifecycle

Before the fix:
- `frontend/src/config.ts` resolved the merged backend host on its own
- `frontend/src/features/cultivator/services/api.ts` resolved the cultivator backend host on its own
- both used separate logic
- both had hard-coded fallback host `172.20.10.14`
- both could become wrong after Wi-Fi or LAN changes on physical phones

This was especially risky for Expo development builds on physical Android devices because loopback and stale fallback assumptions are not reliable across networks.

## Root cause proof

### Primary root cause

Non-deterministic cultivator API readiness in the frontend.

Proof:
- `frontend/src/features/cultivator/CultivatorModule.tsx` previously mounted `AdminNavigator` or `ClientNavigator` immediately when `user` existed
- the merged token was injected via `useEffect(() => { api.setAuthToken(token); }, [token])`
- first-screen loaders use focus-driven effects:
  - `AdminApplicationsScreen.tsx` -> `useFocusEffect(() => loadJobs())`
  - `ClientJobsScreen.tsx` -> `useFocusEffect(() => loadJobs())`
  - `ClientNotificationsScreen.tsx` -> `useFocusEffect(() => loadNotifications())`
- `frontend/src/features/cultivator/services/api.ts` throws immediately from `getAuthHeaders()` when no token is present

Causal chain:
- app bootstrap
- merged auth finishes
- cultivator screen mounts
- screen fetch fires
- cultivator API singleton not ready yet
- `getAuthHeaders()` throws
- interviewer/admin flow shows `Missing merged auth token`

### Secondary root cause

Physical-device backend URL resolution was duplicated and brittle.

Proof:
- `frontend/src/config.ts` and `frontend/src/features/cultivator/services/api.ts` both independently inferred backend hosts
- both used old fallback host `172.20.10.14`
- both relied on Expo runtime metadata that may be absent or inconsistent in development builds

This explains why changing Wi-Fi materially changed app behavior.

### Supporting cause: backend generic error masking

Proof:
- `backend/cultivator/main.py` has a global exception handler returning:
  - `An unexpected error occurred. Please try again later.`
- `backend/cultivator/core/database.py` explicitly allows the app to continue when MongoDB is unavailable
- several endpoint helpers previously used `get_db()` without guarding `None`
- examples:
  - `jobs.py` helper and route paths
  - `notifications.py` helper path
  - `calls.py` helper path
  - `interviews.py` helper path
  - `applications.py` helper path

This means a DB outage or startup DB failure could produce backend 500s that look generic from the phone UI even when auth is correct.

## Primary and secondary root causes

Primary:
- cultivator protected screens could fire before the cultivator API singleton had the merged auth token

Secondary:
- duplicated backend host resolution made physical-device connectivity brittle across Wi-Fi changes

Supporting:
- backend DB-unavailable paths could degrade into generic 500 errors instead of explicit 503 responses

## Observed risks

- merged frontend and cultivator frontend were not using one shared backend URL resolver
- physical-device testing depended on implicit host inference and a stale hard-coded LAN fallback
- cultivator screen fetches were focus-based and could run immediately on first mount
- backend generic 500 handling could hide DB-connectivity failures from the UI
- polling-based navigation in the cultivator shell needed duplicate-call guarding to avoid remount-like churn in dev
