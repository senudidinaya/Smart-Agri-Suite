# Merged Backend Startup Audit

## Executive Summary

The merged login route is still owned by the original merged backend service, `backend/idle_land_api.py`, and is still intended to run on `0.0.0.0:8000`.

The current runtime failure is not caused by a frontend URL regression, auth route removal, host/port config change, or route registration change. The current observed runtime has no listener on `8000`, so the merged login backend is not serving.

The most likely change is workflow drift after the Cultivator split: the repository now has a separate Cultivator backend on `8002`, and it can be started independently, but login still depends on the original merged backend on `8000`. Running only the Cultivator backend leaves login broken.

## Intended Merged Backend Startup Map

| Service | File | App object | Intended host | Intended port | How it is started |
| --- | --- | --- | --- | --- | --- |
| Merged / Idle Land / auth backend | `backend/idle_land_api.py` | `app = FastAPI(...)` | `0.0.0.0` | `8000` | `python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000` from `run-backend.ps1`, also documented in `README.md`. |
| Pricing backend | `backend/pricing/server.js` | Node/Express app | not audited deeply | `5000` | `node server.js` from `run-backend.ps1`. |
| Stock backend | `backend/stock/stock_prediction_api.py` | `stock_prediction_api:app` | `0.0.0.0` | `8001` | `python -m uvicorn stock_prediction_api:app --reload --host 0.0.0.0 --port 8001` from `run-backend.ps1`. |
| Cultivator screening backend | `backend/cultivator/main.py` | `app = create_app()` | `0.0.0.0` | `8002` in launcher | `python -m uvicorn cultivator.main:app --reload --host 0.0.0.0 --port 8002` from `run-backend.ps1`. |

## Login Route Ownership

| Route | File | App/router | Expected process/port | Current status |
| --- | --- | --- | --- | --- |
| `/api/v1/auth/login` | `backend/idle_land_api.py` | Direct FastAPI route on `idle_land_api.app` | Merged backend on `8000` | Route still exists in code, but no process is listening on `8000`. |
| `/auth/login` | `backend/cultivator/api/v1/endpoints/auth.py` | `APIRouter(prefix="/auth")`, mounted in `backend/cultivator/api/v1/routes.py` and `backend/cultivator/main.py` | Cultivator backend on `8002` when started by launcher | Separate route; not the merged login target. |

## Startup Scripts / Docs Audit

| Source | Finding |
| --- | --- |
| `run-backend.ps1` | Still starts `idle_land_api:app` on `8000`, pricing on `5000`, stock on `8001`, and Cultivator on `8002`. |
| `README.md` | Still documents `uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000` as the backend startup command. |
| `frontend/src/config.ts` | Still resolves merged API/auth to port `8000`. |
| `frontend/src/features/cultivator/services/api.ts` | Resolves Cultivator feature API to port `8002`, separate from merged auth. |
| `.vscode` | No active launch/task config was found in the repository root during this audit. |
| Git history | Commit `b20e29a` introduced the separate Cultivator backend service on `8002`; `f6eec1e` changed `run-backend.ps1` from activating `.venv` inside child windows to requiring the terminal's current Python environment. |

## Intended vs Current Runtime Comparison

| Component | Intended state | Current observed state | Mismatch | Impact |
| --- | --- | --- | --- | --- |
| Merged auth backend | `idle_land_api:app` listening on `0.0.0.0:8000` | No listener on `8000` | Yes | Physical-device login cannot connect to `/api/v1/auth/login`. |
| Cultivator backend | `cultivator.main:app` listening on `0.0.0.0:8002` when running | Earlier reachable on `8002`; later no matching listener after processes changed | Runtime changed during audit | Confirms services are independently started/stopped. |
| Frontend merged auth target | `http://<Expo host>:8000/api/v1/auth/login` | Runtime resolved to `http://192.168.1.36:8000/api/v1/auth/login` | No mismatch | Frontend points at intended merged backend. |
| Route registration | `/api/v1/auth/login` in `idle_land_api.py` | Route remains in code | No mismatch | The route is not removed; the process is absent. |
| Host/port config | `idle_land_api.py` direct startup uses `0.0.0.0:8000` | No process bound | No config mismatch proven | Startup not active or process exited. |

## Exact Root Cause

Chosen conclusion: **A. merged backend startup path still exists, but the merged backend is no longer being started or is exiting before serving `8000`.**

Stronger operational framing: **F. multiple backend split caused startup workflow drift.**

Proof:

- `run-backend.ps1` still contains the correct `idle_land_api:app` startup command for `8000`.
- `README.md` still documents `idle_land_api:app` on `8000`.
- `backend/idle_land_api.py` still owns `/api/v1/auth/login` and still has a direct `uvicorn.run(app, host="0.0.0.0", port=8000)` path.
- `frontend/src/config.ts` still targets `8000` for merged auth.
- Runtime `netstat` showed no listener on `8000`.
- Local probes to `127.0.0.1:8000` and `192.168.1.36:8000` failed before HTTP response.
- Port `8002` was separately reachable earlier and served `/auth/login`, proving the services are split and the reachable Cultivator service is not the merged login service.

## What Most Likely Changed

When login worked before, the original merged backend `idle_land_api:app` was running on `8000`.

Now, the workflow appears to have shifted toward starting the Cultivator service on `8002` during Gate-2 work, while the original merged backend on `8000` is not running. This is consistent with the integration history:

- Commit `b20e29a` added Cultivator as a separate backend process on `8002`.
- The frontend keeps two base URLs: merged auth/general API on `8000`, Cultivator feature API on `8002`.
- Running only the Cultivator backend cannot satisfy merged login, because login uses `/api/v1/auth/login` on `8000`, not `/auth/login` on `8002`.

There is one secondary startup fragility:

- Commit `f6eec1e` changed `run-backend.ps1` to say the terminal must already have the Python virtual environment activated and removed explicit venv activation from the launched backend windows.
- If `run-backend.ps1` is launched from a terminal without the correct environment, one or more services could fail immediately.
- This is a plausible contributor, but the current hard proof is simpler: `8000` is not listening.

## Recommended Next Action

Start the full merged backend launcher from the repository root with the correct Python environment active:

```powershell
cd c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite
.\backend\.venv\Scripts\Activate.ps1
.\run-backend.ps1
```

Then verify:

```powershell
netstat -ano | Select-String -Pattern ':8000'
Invoke-WebRequest -Uri 'http://192.168.1.36:8000/api/v1/auth/login' -Method POST -ContentType 'application/json' -Body '{"username":"__audit__","password":"__audit__"}'
```

Expected result for bogus credentials is an HTTP response such as `401`, not `Unable to connect`.
