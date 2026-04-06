# Cultivator Auth and Environment Implementation Report

## Files changed

Frontend:
- `frontend/src/shared/backendUrl.ts`
- `frontend/src/config.ts`
- `frontend/src/features/cultivator/services/api.ts`
- `frontend/src/features/cultivator/CultivatorModule.tsx`

Backend:
- `backend/cultivator/api/v1/endpoints/jobs.py`
- `backend/cultivator/api/v1/endpoints/notifications.py`
- `backend/cultivator/api/v1/endpoints/calls.py`
- `backend/cultivator/api/v1/endpoints/interviews.py`
- `backend/cultivator/api/v1/endpoints/applications.py`

## What was changed

### Shared backend URL resolution

Added `frontend/src/shared/backendUrl.ts` to:
- resolve backend base URLs from explicit `EXPO_PUBLIC_*` variables first
- otherwise infer host from Expo runtime metadata
- otherwise fall back with a warning

Updated:
- `frontend/src/config.ts`
- `frontend/src/features/cultivator/services/api.ts`

So the merged backend and cultivator backend no longer use separate host-resolution logic.

### Deterministic cultivator auth readiness

Updated `frontend/src/features/cultivator/CultivatorModule.tsx` so:
- protected cultivator navigators do not mount until merged auth is done
- merged token is present
- cultivator API client has received the token

This prevents first-screen focus effects from firing before cultivator auth headers are available.

### Cultivator request visibility and error classification

Updated `frontend/src/features/cultivator/services/api.ts` to:
- log resolved cultivator base URL in development
- log token attached or cleared in development
- log request method + URL + auth state
- log response status
- classify 401, 403, 404, 503, and 5xx responses into clearer messages

### Backend DB guards

Updated the cultivator endpoint files listed above to add a tiny `get_db_or_raise()` helper so DB-unavailable states return:
- `503 Database not available`

instead of falling through to the backend global generic 500 handler.

## Why it was changed

- interviewer-side `Missing merged auth token` was caused by a token-readiness race
- client-side generic error was being masked by the backend generic exception handler
- two physical phones need a predictable and inspectable way to resolve backend hosts in Expo development builds

## Diff summary in plain English

- the cultivator module now waits until the merged token is actually ready before mounting screens that fetch data
- the merged and cultivator frontend now share one backend URL resolution strategy
- cultivator API calls now emit helpful debug logs in development
- cultivator backend routes now fail cleanly with 503 if the database is not connected

## Temporary debug logs added

Merged frontend:
- `[MergedAPI] Base URL resolved to ... via ...`

Cultivator frontend:
- `[CultivatorAPI] Base URL resolved to ... via ...`
- `[CultivatorAPI] Merged auth token attached`
- `[CultivatorAPI] Merged auth token cleared`
- `[CultivatorAPI] METHOD URL auth=yes|no|n/a`
- `[CultivatorAPI] METHOD URL -> STATUS`
- `[CultivatorAPI] Request failed ...`

These are intentionally easy to remove later.

## Verification notes

- backend touched files passed a no-write Python AST syntax parse
- `npx tsc --noEmit` still reports pre-existing unrelated repo errors in:
  - `frontend/app/_layout.tsx`
  - `frontend/components/dashboard/SeasonalTrendAnalysis.tsx`
  - `frontend/components/dashboard/StockHandlingGuidance.tsx`
- no new cultivator-specific TypeScript error was surfaced in the touched files during this pass

## Remaining issues or follow-ups

- for best two-phone reliability, set explicit environment values rather than relying only on host inference:
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_CULTIVATOR_API_BASE_URL`
  - or `EXPO_PUBLIC_DEV_SERVER_HOST`

- if you still see backend 503s after this fix, check:
  - MongoDB connectivity
  - Atlas IP whitelist
  - whether `SKIP_MONGODB=true` is set
