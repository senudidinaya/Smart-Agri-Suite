# Merged Login Network Audit

## Executive Summary

Physical-device login fails with `Network request failed` because the merged login request targets `http://192.168.1.36:8000/api/v1/auth/login`, but no backend service is listening on port `8000` on this machine during the audit.

The viewed `Individual-Project/frontend/.env.example` is not the active source of truth for the running merged app. The merged frontend runtime resolves the login host from Expo runtime metadata through `frontend/src/config.ts` and `frontend/src/shared/backendUrl.ts`.

## Phase 1 - Login Request Path

| Item | Evidence |
| --- | --- |
| Login screen | `frontend/app/auth/login.tsx` calls `useAuth().login(username.trim(), password)`. |
| Login implementation | `frontend/context/AuthContext.tsx` `login()` performs a `fetch`. |
| Request URL | `${AUTH_API_BASE_URL}/auth/login`. |
| Base URL constant | `AUTH_API_BASE_URL = ${API_BASE_URL}/api/v1` in `frontend/src/config.ts`. |
| Runtime base URL evidence | Runtime log says `[MergedAPI] Base URL resolved to http://192.168.1.36:8000 via Constants.expoConfig.hostUri`. |
| Exact target | `http://192.168.1.36:8000/api/v1/auth/login`. |
| API client used | Merged AuthContext raw fetch path, not the Cultivator API service client. |

## Phase 2 - Base URL Source Of Truth

| Question | Finding |
| --- | --- |
| Does login use `8000`? | Yes. `AUTH_API_BASE_URL` is based on `API_BASE_URL`, and runtime logs resolve `[MergedAPI]` to `http://192.168.1.36:8000`. |
| Can stale `Individual-Project/frontend/.env.example` override this? | No evidence. That file is not in the running merged frontend path and `.env.example` is not a runtime env source. |
| Can hardcoded localhost override this path? | No evidence in the login path. `resolveBackendBaseUrl()` uses explicit env first, then Expo host metadata, then fallback host. Runtime chose `Constants.expoConfig.hostUri`. |
| What about `CultivatorAPI` on `8002`? | It is a separate feature API client in `frontend/src/features/cultivator/services/api.ts`; login does not use it. |

## Phase 3 - Login Endpoint Target

| Item | Finding |
| --- | --- |
| Method | `POST` |
| Path used by merged login | `/api/v1/auth/login` |
| Payload shape | `{ username, password, rememberMe: true }` |
| Backend route on merged port | `backend/idle_land_api.py` defines `@app.post("/api/v1/auth/login")`. |
| Backend route on cultivator router | `backend/cultivator/api/v1/endpoints/auth.py` defines `@router.post("/login")` under router prefix `/auth`; in the currently listening `8002` service, `/auth/login` responds. |
| Failure timing | The `8000` request failed before any backend HTTP response. |

## Phase 4 - Most Likely Failure Mode

Chosen failure mode: **C. backend not running / wrong port**.

Proof:

- Local probe to `http://192.168.1.36:8000/api/v1/auth/login` failed with `Unable to connect to the remote server`.
- Local probe to `http://127.0.0.1:8000/api/v1/auth/login` also failed with `Unable to connect to the remote server`.
- `netstat -ano` showed no listener on `8000`.
- `netstat -ano` did show `0.0.0.0:8002` listening.
- Probe to `http://192.168.1.36:8002/auth/login` returned a real HTTP `401` for bogus credentials, proving the phone/laptop IP path to the machine and the `8002` service are viable, but `8002` is not the merged login target.

## Phase 5 - Tiny Debug Fix Applied

Added login-specific development logging in `frontend/context/AuthContext.tsx`:

- Logs the exact login URL and base URL source before the request.
- Logs the exact login URL again if fetch fails at the network layer.
- Does not alter auth behavior or request payload.

## Conclusion

The current physical-device login is not failing because of a bad username/password, stale `.env.example`, or the Cultivator `8002` base URL. It is failing because the merged login client targets port `8000`, and port `8000` is not serving the expected backend during the audit.

## Recommended Action

Start the merged backend on `0.0.0.0:8000` so the device can reach `http://192.168.1.36:8000/api/v1/auth/login`, or intentionally reconfigure the merged auth base URL only if the intended backend for login has changed.
