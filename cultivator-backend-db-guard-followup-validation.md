# Cultivator Backend DB Guard Follow-up Validation

## Goal

Validate that predictable database-unavailable conditions in the scoped Cultivator backend routes now return explicit `503 Database not available` failures instead of degrading into the generic `500` error path.

## How to Validate Manually

### 1. Start the Cultivator backend in a DB-unavailable state

Use one of these approaches:

- set `SKIP_MONGODB=true`
- or break MongoDB connectivity temporarily
- or use an invalid MongoDB connection string

Then start the Cultivator backend normally.

Expected startup behavior:

- backend logs should indicate MongoDB connection failure or skipped DB startup
- app should still boot so endpoints can be exercised

### 2. Hit the scoped endpoints

These endpoints should now return explicit `503`-style failures.

#### Applications

- `POST /applications/`
- `GET /applications/`
- `PATCH /applications/{application_id}/status`

#### Calls

- `POST /calls/initiate`
- `GET /calls/incoming`
- `POST /calls/{call_id}/accept`
- `POST /calls/{call_id}/reject`
- `POST /calls/{call_id}/end`
- `POST /calls/{call_id}/recording`
- `GET /calls/{call_id}`
- `POST /calls/{call_id}/recording/start`
- `POST /calls/{call_id}/recording/stop`

#### Interviews

- `POST /admin/interviews/{job_id}/{client_id}/invite`
- `POST /admin/interviews/{job_id}/{client_id}/analyze-video`
- `GET /admin/interviews/{job_id}/{client_id}`
- `POST /admin/interviews/{job_id}/{client_id}/reject`

## Expected Response Shape

Because the global HTTP exception handler is already in place, the expected failure should be an HTTP `503` with structured error content derived from `HTTPException`.

Expected key signal:

- HTTP status code is `503`
- error message indicates:
  - `Database not available`

Typical response structure should look like:

```json
{
  "success": false,
  "error": {
    "code": "HTTP_ERROR",
    "message": "Database not available"
  },
  "correlation_id": "..."
}
```

Exact wrapper fields may vary slightly based on the global exception handler, but the important behavior is:

- explicit `503`
- explicit database-unavailable message
- not the generic internal-error message

## What Logs / Responses to Expect

Expected backend behavior:

- no generic unhandled exception traceback for these predictable DB-unavailable route hits
- no fallback response:
  - `"An unexpected error occurred. Please try again later."`
- instead, structured `HTTPException(503, "Database not available")` handling

## What Would Still Indicate a Remaining Gap

Any of the following would mean the gap is still not fully closed:

- one of the scoped endpoints returns HTTP `500` under DB-unavailable conditions
- one of the scoped endpoints returns the generic internal error message instead of explicit DB-unavailable messaging
- a scoped request route still dereferences `db` after `get_db()` returned `None`

## Notes on Intentionally Deferred Behavior

- `calls.py -> check_missed_calls` still uses raw `get_db()`
- this is not a request route and was intentionally left out of this narrow fix
- if background-task DB-unavailable behavior is later considered important, it should be handled in a separate scoped follow-up rather than mixed into this request-route correction
