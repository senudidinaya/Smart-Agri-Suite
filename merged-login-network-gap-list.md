# Merged Login Network Gap List

## Confirmed Gap

| Gap | Severity | Evidence | Required action |
| --- | --- | --- | --- |
| No backend listener on the login target port `8000` | Critical | `netstat -ano` showed no listener on `8000`; probes to `192.168.1.36:8000` and `127.0.0.1:8000` failed before HTTP response. | Start the merged backend on `0.0.0.0:8000` or intentionally update the merged login base URL if the login backend has moved. |

## Non-Gaps

| Candidate cause | Verdict | Evidence |
| --- | --- | --- |
| Stale Individual-Project `.env.example` | Rejected | Running app is Merged-Project frontend; runtime logs show resolution via `Constants.expoConfig.hostUri`, not the viewed example file. |
| Hardcoded localhost in login path | Rejected | Login uses `AUTH_API_BASE_URL` from `frontend/src/config.ts`; runtime resolved to `http://192.168.1.36:8000`. |
| Login accidentally using Cultivator API client | Rejected | Login uses `frontend/context/AuthContext.tsx`, not `frontend/src/features/cultivator/services/api.ts`. |
| Bad credentials | Rejected for the observed error | Bad credentials would produce an HTTP response such as `401`; the failing `8000` request cannot connect at all. |
| Phone cannot reach laptop generally | Not proven | Laptop IP is `192.168.1.36`; `8002` is reachable on that IP and returns HTTP response for `/auth/login`. |

## Remaining Checks

After starting the merged backend on `8000`, verify from the laptop:

```powershell
Invoke-WebRequest -Uri 'http://192.168.1.36:8000/api/v1/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"__audit__","password":"__audit__"}'
```

Expected result for bogus credentials is an HTTP response such as `401`, not `Unable to connect`.

Then retry login on the physical Android device.
