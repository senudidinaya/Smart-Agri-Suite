# Cultivator Backend DB Guard Follow-up Report

## Summary

This follow-up closed the specific backend gap identified by the post-fix audit: live Cultivator request handlers in `applications.py`, `calls.py`, and `interviews.py` were still using raw `get_db()` and could therefore degrade predictable DB-unavailable cases into the generic `500` handler.

The fix reused the existing safe pattern already present in `jobs.py` and `notifications.py`:

- keep the local `get_db_or_raise()` helper
- replace raw `get_db()` in live request handlers with `get_db_or_raise()`
- remove redundant inline `if db is None: raise HTTPException(503, ...)` checks where they became unnecessary

Result: within the scoped live route handlers, predictable DB-unavailable cases now fail explicitly with `503 Database not available` instead of falling through to generic `500`.

## Files Changed

- `backend/cultivator/api/v1/endpoints/applications.py`
- `backend/cultivator/api/v1/endpoints/calls.py`
- `backend/cultivator/api/v1/endpoints/interviews.py`

## Exact Fix Pattern Used

Reference pattern reused from existing safe files:

```python
def get_db_or_raise():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    return db
```

Applied usage style:

- request handler resolves `db = get_db_or_raise()`
- business logic remains unchanged
- auth behavior remains unchanged
- route decorators and response payloads remain unchanged

## Route-by-Route Before / After Coverage

### `backend/cultivator/api/v1/endpoints/applications.py`

| Route handler | Before | After |
|---|---|---|
| `POST /applications/` -> `apply_to_job` | raw `get_db()` | `get_db_or_raise()` |
| `GET /applications/` -> `get_applications` | raw `get_db()` | `get_db_or_raise()` |
| `PATCH /applications/{application_id}/status` -> `update_application_status` | raw `get_db()` | `get_db_or_raise()` |

Other functions:
- `get_current_user` already used `get_db_or_raise()`
- `get_db_or_raise` intentionally still uses raw `get_db()` as the shared guard implementation

### `backend/cultivator/api/v1/endpoints/calls.py`

| Route handler | Before | After |
|---|---|---|
| `POST /calls/initiate` -> `initiate_call` | raw `get_db()` | `get_db_or_raise()` |
| `GET /calls/incoming` -> `check_incoming_call` | raw `get_db()` | `get_db_or_raise()` |
| `POST /calls/{call_id}/accept` -> `accept_call` | raw `get_db()` | `get_db_or_raise()` |
| `POST /calls/{call_id}/reject` -> `reject_call` | raw `get_db()` | `get_db_or_raise()` |
| `POST /calls/{call_id}/end` -> `end_call` | raw `get_db()` | `get_db_or_raise()` |
| `POST /calls/{call_id}/recording` -> `upload_recording` | raw `get_db()` | `get_db_or_raise()` |
| `GET /calls/{call_id}` -> `get_call` | raw `get_db()` | `get_db_or_raise()` |
| `POST /calls/{call_id}/recording/start` -> `start_cloud_recording` | raw `get_db()` | `get_db_or_raise()` |
| `POST /calls/{call_id}/recording/stop` -> `stop_cloud_recording` | raw `get_db()` | `get_db_or_raise()` |

Other functions:
- `get_current_user` already used `get_db_or_raise()`
- `check_missed_calls` still uses raw `get_db()`
  - this remains intentional in this narrow patch because it is an internal background helper, not a live request handler
- `get_db_or_raise` intentionally still uses raw `get_db()` as the shared guard implementation

### `backend/cultivator/api/v1/endpoints/interviews.py`

| Route handler | Before | After |
|---|---|---|
| `POST /admin/interviews/{job_id}/{client_id}/invite` -> `invite_for_interview` | raw `get_db()` + inline `if db is None` | `get_db_or_raise()` |
| `POST /admin/interviews/{job_id}/{client_id}/analyze-video` -> `analyze_interview_video` | raw `get_db()` + inline `if db is None` | `get_db_or_raise()` |
| `GET /admin/interviews/{job_id}/{client_id}` -> `get_interview_status` | raw `get_db()` + inline `if db is None` | `get_db_or_raise()` |
| `POST /admin/interviews/{job_id}/{client_id}/reject` -> `reject_application` | raw `get_db()` + inline `if db is None` | `get_db_or_raise()` |

Other functions:
- `get_interviewer_user` already used `get_db_or_raise()`
- `get_db_or_raise` intentionally still uses raw `get_db()` as the shared guard implementation

## Route Coverage After Fix

### applications.py

- `apply_to_job`: guarded
- `get_applications`: guarded
- `update_application_status`: guarded

### calls.py

- `initiate_call`: guarded
- `check_incoming_call`: guarded
- `accept_call`: guarded
- `reject_call`: guarded
- `end_call`: guarded
- `upload_recording`: guarded
- `get_call`: guarded
- `start_cloud_recording`: guarded
- `stop_cloud_recording`: guarded

### interviews.py

- `invite_for_interview`: guarded
- `analyze_interview_video`: guarded
- `get_interview_status`: guarded
- `reject_application`: guarded

## Whether the Original Audit Gap Is Fully Closed

Within the stated scope, yes.

The original gap was specifically about live Cultivator request handlers in:

- `applications.py`
- `calls.py`
- `interviews.py`

Those live route handlers now consistently use the existing `get_db_or_raise()` pattern.

## Intentionally Deferred Items

- `calls.py -> check_missed_calls`
  - still uses raw `get_db()`
  - intentionally left unchanged because it is an internal background helper, not a request handler
  - changing it would broaden scope beyond the stated audit follow-up

- `get_db_or_raise` implementations themselves still call raw `get_db()`
  - this is intentional and required for the guard pattern to function
