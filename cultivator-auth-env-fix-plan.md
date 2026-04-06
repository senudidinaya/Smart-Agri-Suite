# Cultivator Auth and Environment Fix Plan

## Minimal fix strategy

1. Make merged backend URL resolution shared and explicit.
2. Make cultivator API readiness deterministic before protected cultivator screens mount.
3. Improve cultivator API debug visibility for physical-phone testing.
4. Convert likely generic backend 500s into explicit 503s where DB availability is known to be optional.
5. Preserve the merged single-login architecture and existing cultivator navigation.

## Files to change

### Frontend

- `frontend/src/shared/backendUrl.ts`
  - add one shared backend URL resolver for merged and cultivator modules

- `frontend/src/config.ts`
  - switch merged backend URL resolution to the shared resolver
  - log resolved merged base URL in development

- `frontend/src/features/cultivator/services/api.ts`
  - switch cultivator backend URL resolution to the shared resolver
  - add request/response/auth debug logs
  - classify auth, network, 4xx, 5xx, and 503 failures more clearly

- `frontend/src/features/cultivator/CultivatorModule.tsx`
  - gate navigator mounting until merged auth token is injected into the cultivator API client
  - keep token-setting out of render
  - keep duplicate incoming-call navigation guard

### Backend

- `backend/cultivator/api/v1/endpoints/jobs.py`
- `backend/cultivator/api/v1/endpoints/notifications.py`
- `backend/cultivator/api/v1/endpoints/calls.py`
- `backend/cultivator/api/v1/endpoints/interviews.py`
- `backend/cultivator/api/v1/endpoints/applications.py`
  - add small DB guards so `get_db() is None` becomes explicit `503 Database not available` instead of generic 500 masking

## Reason for each change

- shared backend URL resolver:
  - removes hidden drift between merged and cultivator modules
  - makes two-phone physical-device testing more deterministic

- cultivator API readiness gating:
  - prevents first-screen fetches from racing ahead of merged token injection
  - directly addresses `Missing merged auth token`

- debug logs:
  - make physical-device LAN targeting observable
  - make request failures diagnosable without guessing

- backend DB guards:
  - convert opaque generic backend failure into actionable service-unavailable errors
  - directly improves the client pages that were surfacing the generic backend message

## Risks

- very low frontend behavior risk:
  - cultivator screens now wait for token readiness before first mount
  - this slightly delays first render but improves determinism

- low backend behavior risk:
  - DB-unavailable cases now return `503` instead of crashing into the generic 500 handler
  - normal connected-db behavior is unchanged

## Non-goals

- no broad auth rewrite
- no new state library
- no route architecture rewrite
- no removal of existing merged app features
- no unrelated cleanup outside cultivator auth/env/runtime stability
