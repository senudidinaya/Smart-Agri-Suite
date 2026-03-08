# Authentication and Role Migration Report

## Scope

This report documents completion of the requested 6-phase backend auth and role migration for `Smart-Agri-Suite`.

Target outcomes:
- Consolidate auth behavior around shared `backend/auth_utils.py`.
- Remove duplicate cultivator auth logic.
- Normalize roles to:
	- Global/original auth schema: `client | helper | interviewer`
	- Cultivator schema: `client | interviewer`
- Replace legacy `admin`/`farmer` authorization semantics with `interviewer` where applicable.
- Migrate MongoDB user roles: `admin` and `farmer` -> `interviewer`.
- Validate runtime behavior before and after refactor.

## Phase 1: Baseline Runtime Verification (Pre-change)

Verification executed before structural changes:
- Backend startup and OpenAPI/docs reachable.
- Both auth route sets reachable:
	- Original auth routes.
	- Cultivator auth routes.
- Register/login/me flow checked for both auth stacks.
- Cross-token compatibility checked:
	- Original token accepted by cultivator `/me`.
	- Cultivator token accepted by original `/me`.

Result: baseline behavior confirmed operational prior to refactor.

## Phase 2: Auth Consolidation

### Changes

- Refactored cultivator auth usage to shared auth primitives from `backend/auth_utils.py`.
- Eliminated manual bearer parsing patterns in updated cultivator endpoints and switched to dependency-driven auth (`Depends(require_auth)` pattern).
- Reworked `backend/cultivator/core/auth.py` into a compatibility wrapper over shared auth functions instead of maintaining duplicate auth implementation.

### Outcome

- Single logical source of truth for password hashing, token creation, and token verification behavior.
- Reduced drift risk between original and cultivator auth behavior.

## Phase 3: Role Normalization

### Schema / Literal updates

- `backend/auth_utils.py`
	- Updated role literals from legacy set to: `client`, `helper`, `interviewer`.
- `backend/cultivator/schemas/user.py`
	- Updated cultivator role literals to: `client`, `interviewer`.

### Outcome

- Legacy role inputs such as `admin` are no longer accepted by schema validation in registration payloads.

## Phase 4: Endpoint Authorization Updates

Updated endpoints from legacy role checks to normalized `interviewer` checks and dependency-based auth extraction:

- `backend/cultivator/api/v1/endpoints/auth.py`
- `backend/cultivator/api/v1/endpoints/jobs.py`
- `backend/cultivator/api/v1/endpoints/applications.py`
- `backend/cultivator/api/v1/endpoints/call_tasks.py`
- `backend/cultivator/api/v1/endpoints/notifications.py`
- `backend/cultivator/api/v1/endpoints/calls.py`
- `backend/cultivator/api/v1/endpoints/interviews.py`

Service/script role-dependent updates:
- `backend/cultivator/services/admin_assignment.py` (role query changed to interviewer semantics)
- `backend/scripts/cultivator/list_admins.py` (updated to interviewer query/labels)

## Phase 5: MongoDB Role Migration

Migration executed against users collection.

### Before
- `admin`: 6
- `farmer`: 3
- `interviewer`: 2

### Applied updates
- `admin` -> `interviewer`: 6
- `farmer` -> `interviewer`: 3

### After
- `admin`: 0
- `farmer`: 0
- `interviewer`: 11

Result: role normalization completed at data layer without residual legacy role documents.

## Phase 6: Final Runtime Verification (Post-change)

Final end-to-end verification was re-run after migration and refactor on a clean backend instance.

### Operational checks

- Original auth flow:
	- register: `200`
	- login: `200`
	- me: `200`
- Cultivator auth flow:
	- register: `200`
	- login: `200`
	- me: `200`
- Interviewer-only endpoint check:
	- `/api/cultivator/call-tasks/admin/today`: `200`
- Cross-token compatibility:
	- original token -> cultivator `/me`: `200`
	- cultivator token -> original `/me`: `200`
- Legacy role rejection check:
	- register with role `admin`: `422` (expected)
- JWT payload check:
	- role claim decoded as `interviewer` for newly verified users.

### Runtime caveat resolved during verification

An intermediate discrepancy was caused by multiple processes listening on port `8000`. Conflicting PIDs were terminated and verification was repeated on a clean instance to produce the final results above.

## Files Modified (Auth/Role Migration)

- `backend/auth_utils.py`
- `backend/cultivator/core/auth.py`
- `backend/cultivator/schemas/user.py`
- `backend/cultivator/api/v1/endpoints/auth.py`
- `backend/cultivator/api/v1/endpoints/jobs.py`
- `backend/cultivator/api/v1/endpoints/applications.py`
- `backend/cultivator/api/v1/endpoints/call_tasks.py`
- `backend/cultivator/api/v1/endpoints/notifications.py`
- `backend/cultivator/api/v1/endpoints/calls.py`
- `backend/cultivator/api/v1/endpoints/interviews.py`
- `backend/cultivator/services/admin_assignment.py`
- `backend/scripts/cultivator/list_admins.py`

Temporary scripts used for verification/migration were removed after execution.

## Compatibility and Risk Notes

- Client/helper/interviewer paths remain functional under normalized role model.
- Legacy role payloads now fail fast via schema validation, preventing reintroduction of deprecated roles.
- Cross-stack token interoperability remained intact after consolidation.

## Final Status

Migration complete.

- Auth logic consolidated.
- Role model normalized in code and database.
- Endpoint authorization updated.
- Runtime behavior validated pre- and post-change.
