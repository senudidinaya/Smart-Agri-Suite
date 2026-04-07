# Merged Login Network Fix Report

## Files Changed

| File | Change | Why safe |
| --- | --- | --- |
| `frontend/context/AuthContext.tsx` | Added dev-only login request logging for the exact URL and source; added dev-only network failure logging for the same URL. | Logging only. No auth flow, payload, backend, or base URL behavior changed. |

## Exact Change

Before login fetch, development builds now log:

```text
[AuthAPI] POST <login-url> via <base-url-source>
```

If `fetch()` fails before an HTTP response, development builds now log:

```text
[AuthAPI] Network failure POST <login-url>
```

## Why This Was Needed

Existing merged/cultivator base URL logs showed the two API clients, but the login path itself did not log the exact URL. The added log makes it clear that login uses merged auth on port `8000`, not the Cultivator API client on `8002`.

## Non-Changes

- No backend logic changed.
- No request payload changed.
- No auth behavior changed.
- No environment configuration changed.
- No unrelated Cultivator code changed.
