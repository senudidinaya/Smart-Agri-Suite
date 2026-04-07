# Merged Backend Startup Gap List

## Startup / Runtime Mismatches

| Gap | Severity | Exact file/path | Why it matters | Safest correction |
| --- | --- | --- | --- | --- |
| `8000` merged backend not listening | Critical | Runtime state; intended service is `backend/idle_land_api.py` | Login targets `http://192.168.1.36:8000/api/v1/auth/login`; with no listener, React Native reports `Network request failed`. | Start `idle_land_api:app` on `0.0.0.0:8000`. |
| Split backend workflow can start `8002` without `8000` | High | `run-backend.ps1`; `frontend/src/config.ts`; `frontend/src/features/cultivator/services/api.ts` | Cultivator API on `8002` may work while merged auth on `8000` is down. This makes the app look partly running but login remains broken. | Treat `8000` and `8002` as required separate services for physical-device Cultivator workflows. |
| Launcher now depends on pre-activated Python environment | Medium | `run-backend.ps1`, changed in commit `f6eec1e` | If the operator starts the launcher without the correct venv already active, child backend windows may fail to start. | Start the launcher from a terminal with `backend\.venv\Scripts\Activate.ps1` already active, or later make a deliberate script hardening change. |
| README documents only the original `8000` backend in the basic setup | Low | `README.md` | The basic README still correctly documents `8000`, but does not fully emphasize that Cultivator now also needs `8002` for feature APIs. | Future docs pass can clarify the full multi-service startup sequence. |

## Rejected Causes

| Candidate cause | Verdict | Evidence |
| --- | --- | --- |
| Merged auth route removed | Rejected | `backend/idle_land_api.py` still defines `@app.post("/api/v1/auth/login")`. |
| Merged auth frontend changed to `8002` | Rejected | `frontend/src/config.ts` still sets merged auth base on port `8000`. |
| Backend bind host changed away from LAN | Rejected for intended path | `idle_land_api.py` and `run-backend.ps1` both use `0.0.0.0` for the `8000` server. |
| Cultivator route should satisfy merged login | Rejected | Cultivator auth route is `/auth/login` on the separate `8002` service; merged login targets `/api/v1/auth/login` on `8000`. |
| Current failure is credentials or database | Rejected for observed error | The `8000` request fails before any HTTP response. Credentials/database would produce an HTTP response if the server were reachable. |

## Safest Immediate Correction

Run the intended merged backend service:

```powershell
cd c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite\backend
python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
```

If using the full launcher:

```powershell
cd c:\Projects\Senudi\Merged-Project\Smart-Agri-Suite
.\backend\.venv\Scripts\Activate.ps1
.\run-backend.ps1
```

Then confirm `8000` is listening before retrying Android login.
