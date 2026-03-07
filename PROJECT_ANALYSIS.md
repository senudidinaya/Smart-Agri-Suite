# PROJECT_ANALYSIS

## 1. Repository Overview

### Project Name
- **Smart-Agri-Suite**

### Main Purpose
Smart-Agri-Suite is a cross-platform agricultural intelligence platform that combines:
- a **mobile app** (Expo + React Native)
- a **single FastAPI backend**
- **geospatial + ML analysis** (Google Earth Engine + XGBoost)
- a **land marketplace workflow** (listing, review, verification, media/doc uploads)

Primary business goal: help farmers and land stakeholders analyze land quality/usability, estimate land class composition, and publish/list land parcels with AI-assisted insights.

### Key Features Implemented
- User authentication (register/login/profile) with JWT and MongoDB user store.
- AOI and polygon analysis (Malabe AOI local raster pipeline).
- Global point/polygon/city land complexity analysis using Google Earth Engine.
- ML land-class prediction (Idle / Vegetation / Built).
- Land listing marketplace with area validation, duplicate checks, restricted zones, status workflow.
- Media/document upload and serving (`/media/...`).
- Admin dashboard operations (listing status updates, deletion, restricted zone CRUD).
- Notification flow for listing status changes (MongoDB collection).

---

## 2. Technology Stack Detection

### Programming Languages
- Python (backend)
- TypeScript (frontend/mobile)
- JavaScript (frontend config/scripts)
- PowerShell / Batch (run scripts)

### Backend Frameworks and Libraries
- **FastAPI** (HTTP API layer)
- **Uvicorn** (ASGI server)
- **SQLAlchemy** + **GeoAlchemy2** (PostgreSQL/PostGIS ORM)
- **Motor** (async MongoDB client)
- **python-jose** + **bcrypt** (JWT + password hashing)
- **python-dotenv** (env loading)
- **python-multipart** (file uploads)

### Geospatial / ML
- **XGBoost**, **scikit-learn**, **joblib**, **numpy**, **pandas**
- **Google Earth Engine API** (`earthengine-api`)
- **rasterio**, **shapely**, **mercantile**, **pyproj**, **rio-tiler**, **geopy**
- **Pillow** (PNG tile/image generation)

### Frontend / Mobile Frameworks
- **Expo SDK 54**
- **React 19** + **React Native 0.81**
- **expo-router** (file-based routing)
- **react-native-maps** + map clustering
- **react-native-reanimated**, gesture handler, screens, safe-area-context
- **@react-native-async-storage/async-storage**
- **TypeScript strict mode**

### Databases
- **PostgreSQL + PostGIS**: marketplace entities and geospatial geometry columns.
- **MongoDB**: user auth docs + notification docs.

### Dev / Build Tooling
- npm / Expo CLI
- Python venv + pip
- TypeScript compiler
- No Docker, no compose, no CI/CD config found in repository root.

---

## 3. Project Folder Structure (Tree + Purpose)

```text
Smart-Agri-Suite/
  backend/
    idle_land_api.py              # Primary FastAPI app (monolithic API)
    gee_service.py                # Global GEE analysis service functions
    auth_utils.py                 # JWT + Mongo auth helpers
    marketplace/
      database.py                 # SQLAlchemy engine/session/base
      models.py                   # ORM models (PostGIS geometry + relations)
      crud.py                     # Listing/restricted-zone DB operations
      schemas.py                  # Pydantic request/response models
    media/                        # Uploaded docs/photos served via /media
    model/                        # ML model artifacts (xgb_land_classifier.pkl)
    rasters/                      # AOI raster datasets (classified/features tif)
    scripts/                      # Manual DB migration scripts
    tests/                        # Present but effectively empty
    app/                          # Scaffold dirs only (mostly empty/__pycache__)
    requirements.txt
    .env.example

  frontend/
    app/                          # Expo Router screens (auth, map, analytics, admin)
      _layout.tsx                # Root navigator + auth gate
      index.tsx                  # Home/launch page
      (main)/                    # Tabbed app area
      auth/                      # Login/register screens
      land/                      # Listing form + detail flow
      listings/                  # Public/my listing screens
      admin/                     # Restricted zone and listing admin screens
    context/                      # Auth + language providers
    components/                   # Reusable UI components
    src/
      config.ts                  # Dynamic API base URL detection
      api.ts / api/ml.ts         # API wrappers
      services/mlApi.ts          # ML API helper
      styles/                    # Screen styles
      features/                  # Feature-oriented folders (sparse placeholders)
    package.json
    app.json

  run-backend.ps1/.bat            # Convenience scripts for backend startup
  run-frontend.ps1/.bat           # Convenience scripts for frontend startup
  README.md
  _cultivator-intention-analyzer/ # Empty directory in current snapshot
  temp-login-branch/              # Empty directory in current snapshot
```

### Important Structural Observations
- Active backend is **`backend/idle_land_api.py`** (single large module).
- `backend/app/*` appears to be an abandoned scaffold, not current runtime path.
- Frontend has both route-centric app code (`frontend/app`) and utility/feature code (`frontend/src`).

---

## 4. Entry Points and System Startup

### Backend Entry Point
- `backend/idle_land_api.py` defines `app = FastAPI(...)`.
- Startup script used in repo:

```powershell
# run-backend.ps1
Set-Location backend
& .venv\Scripts\Activate.ps1
python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
```

- `idle_land_api.py` also supports direct module run:

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Frontend/Mobile Entry Point
- `frontend/package.json` sets:

```json
"main": "expo-router/entry"
```

- Root app layout/navigation starts at:
- `frontend/app/_layout.tsx` (AuthProvider + LanguageProvider + route stack)
- `frontend/app/index.tsx` (home screen)

### How the System Starts (Runtime Sequence)
1. Backend starts FastAPI app.
2. On startup, backend attempts PostgreSQL table creation and Mongo warm-up.
3. Frontend starts Expo dev server.
4. Mobile app computes API host (`frontend/src/config.ts`) from Expo host URI and calls backend over HTTP on port 8000.

---

## 5. How to Run the Project Locally

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL with PostGIS extension
- MongoDB instance
- Google Earth Engine account and local auth

### Backend Setup
1. Open terminal in repo root.
2. Create and activate virtual environment (recommended inside `backend/`):

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Configure env:
- Copy `backend/.env.example` -> `backend/.env`
- Set at minimum:
  - `DATABASE_URL`
  - `GEE_PROJECT`
- Recommended additional vars (used in code):
  - `AUTH_SECRET`
  - `MONGODB_URL`
  - `MONGODB_DATABASE`

5. Authenticate Earth Engine:

```bash
earthengine authenticate
```

6. Run backend:

```bash
python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
1. In new terminal:

```bash
cd frontend
npm install
```

2. For dev-client workflow (needed by maps in this project):

```bash
npx expo prebuild --clean
npx expo run:android
```

3. Start frontend:

```bash
npx expo start --dev-client -c
```

### Convenience Scripts (Repo Root)
- Backend: `run-backend.ps1`
- Frontend: `run-frontend.ps1`

### Build/Run Notes
- API URL is dynamic at runtime via `frontend/src/config.ts` and Expo host URI.
- Ensure backend and mobile device are on same network when using physical device.

---

## 6. Dependencies and Their Roles

### Python (`backend/requirements.txt`)
Major dependencies:
- `fastapi`, `uvicorn[standard]`: API framework/server
- `sqlalchemy`, `geoalchemy2`, `psycopg2-binary`: relational + geospatial DB access
- `motor`: MongoDB async client
- `python-jose[cryptography]`, `bcrypt`: auth token + password security
- `xgboost`, `scikit-learn`, `joblib`, `numpy`, `pandas`: ML model inference tooling
- `earthengine-api`: Google Earth Engine integration
- `rasterio`, `shapely`, `mercantile`, `pyproj`, `rio-tiler`: geospatial raster/vector processing
- `python-dotenv`, `python-multipart`, `pillow`, `geopy`: config/uploads/imaging/geocoding support

### JavaScript/TypeScript (`frontend/package.json`)
Major dependencies:
- `expo`, `react`, `react-native`, `expo-router`: mobile app shell + routing
- `react-native-maps`, `react-native-map-clustering`: map visualization
- `@tanstack/react-query` (installed, not dominant in current fetch usage)
- `@react-native-async-storage/async-storage`: local auth/session persistence
- `react-native-reanimated`, gesture handler, screens, safe-area-context: UX/runtime infra
- `axios` present but project mostly uses native `fetch`

### Other Manifests
- No `pyproject.toml`, `environment.yml`, `pom.xml`, Gradle build files, or Docker manifests were found in active project folders.

---

## 7. Architecture Overview

### Detected Architecture Pattern
- **Mobile + API backend** architecture.
- Backend is effectively **layered but monolithic**:
  - API/controller layer: `idle_land_api.py`
  - Service/helper logic: `gee_service.py`, local helper functions in `idle_land_api.py`
  - Data layer: `marketplace/*`, Mongo helpers in `auth_utils.py`
- Includes an **AI/geospatial inference pipeline** embedded in backend request handling.

### Component Communication
- Frontend (Expo app) -> HTTP -> FastAPI backend.
- Backend -> PostgreSQL/PostGIS for listings/zones/media metadata.
- Backend -> MongoDB for user/auth/notifications.
- Backend -> GEE API for global geospatial inference.
- Backend -> local raster/model files for AOI and model inference.

### High-Level Diagram
```text
[Expo Mobile App]
    |
    | HTTP (fetch)
    v
[FastAPI: idle_land_api.py]
    |-- SQLAlchemy/GeoAlchemy2 --> [PostgreSQL + PostGIS]
    |-- Motor async client ------> [MongoDB]
    |-- earthengine-api ---------> [Google Earth Engine]
    |-- joblib/xgboost ----------> [Local model .pkl]
    |-- rasterio/shapely --------> [Local raster .tif + geometry ops]
```

---

## 8. API and Data Flow

### API Endpoint Surface (Primary)

#### Auth/User
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/user/notifications`
- `PATCH /api/v1/user/notifications/{notif_id}/read`

#### AOI + ML
- `GET /aoi`
- `POST /predict`
- `GET /aoi/inspect`
- `POST /aoi/analyze-polygon`
- `GET /aoi/summary`
- `GET /intelligence/evaluate`
- `GET /tiles/classified/{z}/{x}/{y}.png`

#### Global GEE Complexity
- `GET /api/analysis/city`
- `GET /api/analysis/point`
- `POST /api/analysis/polygon`

#### Marketplace
- `GET /api/listings`
- `GET /api/listings/{listing_id}`
- `GET /api/listings/my`
- `POST /api/listings/validate-area`
- `POST /api/listings/create`
- `POST /api/listings/{listing_id}/photos`
- `POST /api/listings/{listing_id}/documents`
- `PATCH /api/listings/{listing_id}/status`
- `DELETE /api/listings/{listing_id}`

#### Admin Restricted Zones
- `GET /api/admin/stats`
- `POST /api/restricted-zones`
- `GET /api/restricted-zones`
- `DELETE /api/restricted-zones/{zone_id}`

### Service Layer and DB Interactions
- Marketplace validation and persistence go through `marketplace/crud.py`.
- Geospatial validations use PostGIS functions (`ST_Intersects`, `ST_GeomFromGeoJSON`, `ST_AsGeoJSON`).
- Listing creation can include embedded ML analytics and crop suitability records in one transaction.

### ML Inference Flow (Typical Polygon Listing)
1. Frontend sends polygon coordinates.
2. Backend validates geometry and AOI/rules.
3. Backend computes features (raster or GEE path depending endpoint).
4. XGBoost model predicts class and confidence.
5. Backend computes composition, spice suitability, intercropping, health summary.
6. Marketplace listing + analytics + crop scores persisted.
7. Frontend receives listing metadata + analysis payload.

### Frontend Request Flow
- Most screens call backend directly with `fetch` and `API_BASE_URL` from `frontend/src/config.ts`.
- Auth state managed in `AuthContext` with token/user in AsyncStorage.
- Role-based UI behavior is in routing/tab layout and screen-level guards.

---

## 9. Integration Points for a New Module (Safe Options)

### Best Integration Seams
1. **Backend service boundary**
- Add a new file under `backend/` (for now) or introduce a proper module under `backend/app/services/` and call it from existing endpoints.
- Reason: current monolithic `idle_land_api.py` can delegate to dedicated service functions safely.

2. **Marketplace extension path**
- Add DB entities to `backend/marketplace/models.py`, CRUD in `backend/marketplace/crud.py`, and expose endpoints in `idle_land_api.py`.
- Reason: existing domain shape already uses this pattern.

3. **Frontend feature module**
- Add UI route in `frontend/app/` and shared logic in `frontend/src/features/<new-feature>/`.
- Reason: aligns with current Expo Router + source utility split.

4. **API client wrapper cleanup path**
- Consolidate API calls into `frontend/src/api/*` and `frontend/src/services/*`, then consume from screens.
- Reason: reduces repeated endpoint strings and simplifies merge conflicts.

### Recommended Merge Strategy
- Keep new module decoupled from `idle_land_api.py` internals initially.
- Introduce a thin endpoint adapter in `idle_land_api.py` that calls your module.
- Add explicit request/response schema classes for your module payloads.
- Add minimal integration tests before broad refactor.

---

## 10. Risks and Observations Before Merging

### High-Risk Technical Areas
1. **Monolithic backend file**
- `backend/idle_land_api.py` contains routing, service logic, geospatial ops, inference, and admin flows in one large file.
- Merge conflict probability is high for any backend feature work.

2. **Mixed persistence model without strict boundary**
- PostgreSQL/PostGIS + MongoDB used together in single endpoint flows.
- Potential consistency gaps across stores (no distributed transaction handling).

3. **Security and access-control concerns**
- Admin mutation endpoints (`/api/listings/{id}/status`, delete, zone CRUD) do not enforce explicit server-side role checks.
- CORS is fully open (`allow_origins=["*"]`).
- Default fallback auth secret is hardcoded in code.

4. **Run-script inconsistency**
- `run-backend.bat` references `python main.py`, but no `backend/main.py` exists.
- PowerShell script uses uvicorn correctly.

5. **Frontend API contract drift**
- Some helper files call `/health` (not implemented in backend) and use payload shape variants.
- Indicates stale API wrappers and potential runtime errors if used.

6. **Sparse automated testing**
- Little to no formal tests in active backend/frontend paths.
- Regression risk is high during module merge.

### Medium-Risk / Debt Indicators
- `backend/app/*` scaffold exists but appears unused.
- Manual migration scripts in `backend/scripts/` instead of formal migration flow.
- Empty auxiliary folders (`_cultivator-intention-analyzer`, `temp-login-branch`) add ambiguity.
- Possible large/non-source assets and generated folders committed (`frontend/node_modules`, media data) can complicate repo hygiene.

---

## 11. Practical Merge Guidance

### Pre-Merge Checklist
1. Add missing backend health endpoint or remove stale frontend callers.
2. Introduce auth/role dependency for admin endpoints.
3. Decide target architecture for your module:
- short-term: integrate via `idle_land_api.py` adapter
- medium-term: extract route groups and services from monolith
4. Add at least smoke tests for your module endpoint(s) and one end-to-end flow.
5. Normalize API client usage in frontend (single source wrapper).

### Suggested First Refactor (Low Risk, High Value)
- Create new backend module file with pure functions.
- Add endpoint in `idle_land_api.py` that only validates/request-maps and calls that module.
- Keep DB and auth dependencies injected via parameters for testability.

---

## Appendix A: Notable Startup/Config Snippets

### Backend App Initialization (excerpt)
```python
app = FastAPI(title="Idle Land Mobilization API", version="2.3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

### Frontend API Base Resolution (excerpt)
```ts
const hostUri = Constants.expoConfig?.hostUri || Constants.experienceUrl;
// -> derives http://<host-ip>:8000
export const API_BASE_URL = getAPIEndpoint();
```

### Frontend Entry (excerpt)
```json
"main": "expo-router/entry"
```

---

## Appendix B: Environment Variables Detected

From `backend/.env.example` and source:
- `DATABASE_URL`
- `API_BASE_URL` (example only; backend code uses `DATABASE_URL`/others directly)
- `GEE_PROJECT`
- `AUTH_SECRET`
- `MONGODB_URL`
- `MONGODB_DATABASE`

---

## Final Assessment
The repository is feature-rich and operationally coherent as a mobile + geospatial ML API system, but it has merge-sensitive architecture due to monolithic backend composition, mixed datastores, and minimal test coverage. A new module can be integrated safely if introduced behind a thin adapter boundary, with immediate attention to auth hardening and API contract cleanup.