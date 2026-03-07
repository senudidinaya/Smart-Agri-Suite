# 🔧 Backend Readiness Check - Smart Agri Suite

**Generated:** March 7, 2026  
**Target:** Fresh clone setup verification

---

## 1. Backend Entry Point

**Main API File:** `backend/idle_land_api.py`

**Framework:** FastAPI 
**Runtime:** Python 3.9+  
**Server:** Uvicorn (ASGI)

**Startup Command:**
```bash
cd backend
python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
```

**Alternative (using provided script):**
```powershell
.\run-backend.ps1  # From project root
```

---

## 2. Dependencies Inventory

### Core Framework
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI server
- `python-dotenv` - Environment variable loader
- `python-multipart` - File upload support
- `pydantic` (implicit) - Data validation

### Database & ORM
- `sqlalchemy` - ORM for PostgreSQL
- `psycopg2-binary` - PostgreSQL adapter
- `geoalchemy2` - PostGIS spatial extensions
- `alembic` - Database migrations (installed but not currently used)
- `motor` - Async MongoDB driver

### Authentication
- `python-jose[cryptography]` - JWT token handling
- `bcrypt` - Password hashing

### Machine Learning
- `joblib` - Model serialization
- `numpy` - Numerical arrays
- `scikit-learn` - ML utilities
- `xgboost` - XGBoost classifier (primary ML model)
- `pandas` - Data manipulation

### Geospatial & Remote Sensing
- `earthengine-api` - Google Earth Engine SDK
- `rasterio` - Raster data I/O
- `rio-tiler` - Map tile generation
- `shapely` - Geometric operations
- `pyproj>=3.0.0` - Coordinate transformations
- `mercantile` - Map tile utilities
- `geopy` - Geocoding services

### Image Processing
- `pillow` - Image manipulation

---

## 3. Environment Variables Checklist

**File Location:** `backend/.env`  
**Template:** `backend/.env.example`

### Required Variables

| Variable | Purpose | Example | Blocker? |
|----------|---------|---------|----------|
| `DATABASE_URL` | PostgreSQL+PostGIS connection | `postgresql://postgres:1234@localhost:5432/land_marketplace` | ⛔ **BLOCKER** |
| `MONGODB_URL` | MongoDB connection for auth | `mongodb://localhost:27017` or Atlas URL | ⛔ **BLOCKER** |
| `MONGODB_DATABASE` | MongoDB database name | `smartagri` | ⚠️ Optional (defaults to `smartagri`) |
| `AUTH_SECRET` | JWT signing key | `smartagri_secret_key_change_in_production` | ⚠️ Optional (has default, but should change) |
| `GEE_PROJECT` | Google Cloud Project ID for GEE | `my-first-project-471714` | ⚠️ **SOFT BLOCKER** (GEE features fail) |

### Current .env Status

Your current `.env` file contains:
```env
DATABASE_URL=postgresql://postgres:1234@localhost:5432/land_marketplace
AUTH_SECRET=smartagri_secret_key_change_in_production
MONGODB_URL=mongodb+srv://senudidrupasinghe_db_user:***@cluster0.xucnmcs.mongodb.net/
MONGODB_DATABASE=smartagri
GEE_PROJECT=my-first-project-471714
```

✅ **Environment variables are configured**

---

## 4. External Service Dependencies

### 4.1 PostgreSQL + PostGIS (BLOCKER)

**Purpose:** Stores marketplace listings, photos, documents, analytics, crop suitability, and restricted zones.

**Requirements:**
- PostgreSQL 12+ with PostGIS extension
- Database name: `land_marketplace`
- Tables auto-created on startup via SQLAlchemy

**Test Connection:**
```bash
# From Windows (using psql if installed)
psql -h localhost -U postgres -d land_marketplace -c "\dt"

# Or test from Python
python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://postgres:1234@localhost:5432/land_marketplace'); print(engine.connect())"
```

**What Fails Without It:**
- ⛔ Startup will show: `⚠️ Could not create marketplace tables`
- ⛔ All `/api/listings/*` endpoints will fail with 500 errors
- ⛔ `/api/restricted-zones/*` endpoints fail
- ⛔ `/api/admin/stats` fails

**Tables Created:**
- `land_listings` - Main parcel listings
- `land_photos` - Listing photos
- `land_documents` - Ownership documents
- `land_analytics` - Cached ML predictions
- `crop_suitability` - Spice suitability scores (Cinnamon, Pepper, Clove, Cardamom, Nutmeg)
- `restricted_zones` - Admin-defined restricted areas

---

### 4.2 MongoDB (BLOCKER for Auth)

**Purpose:** User authentication and registration (shared with separate Login-Register service).

**Requirements:**
- MongoDB 4.4+
- Database: `smartagri`
- Collection: `users`

**Test Connection:**
```bash
# From MongoDB shell or Compass
# Or test from Python
python -c "from motor.motor_asyncio import AsyncIOMotorClient; client = AsyncIOMotorClient('mongodb://localhost:27017'); print(client.server_info())"
```

**What Fails Without It:**
- ⛔ Startup shows: `⚠️ MongoDB not available (auth will fail)`
- ⛔ `/api/v1/auth/register` returns 503
- ⛔ `/api/v1/auth/login` returns 503
- ⛔ `/api/v1/auth/me` returns 503
- ⛔ Any endpoint using `require_auth` dependency fails
- ✅ Non-auth endpoints work (read-only marketplace, predictions, GEE analysis)

**User Schema:**
```json
{
  "_id": ObjectId,
  "fullName": String,
  "username": String (unique),
  "email": String (unique),
  "address": String (optional),
  "age": Number (optional),
  "role": "client" | "admin" | "helper" | "farmer",
  "passwordHash": String (bcrypt),
  "createdAt": DateTime,
  "updatedAt": DateTime
}
```

---

### 4.3 Google Earth Engine (SOFT BLOCKER)

**Purpose:** Global satellite imagery analysis for idle land detection anywhere in the world.

**Requirements:**
- Google Cloud Project with Earth Engine API enabled
- Local authentication: `earthengine authenticate` (one-time)
- `GEE_PROJECT` environment variable set

**Test GEE:**
```bash
cd backend
python diagnose_gee.py
# Expected output:
# ✅ GEE Data Operation Success
# ✅ GEE Collection Access Success
```

**What Fails Without It:**
- ⚠️ Startup shows: `⚠️ GEE Initialization failed`
- ⛔ `/api/analysis/city` returns error
- ⛔ `/api/analysis/point` returns error
- ⛔ `/api/analysis/polygon` returns error
- ✅ Local raster-based endpoints still work (`/aoi/*`, `/tiles/*`)
- ✅ Marketplace CRUD still works

**GEE Features:**
- Sentinel-2 satellite imagery composites
- NDVI, EVI, SAVI, NDWI vegetation indices
- SRTM elevation and slope data
- Universal point/polygon analysis

---

### 4.4 ML Model File (SOFT BLOCKER)

**Location:** `backend/model/xgb_land_classifier.pkl`

**Status:** ✅ File exists in cloned repo

**Purpose:** XGBoost classifier for land use prediction (IDLE_LAND, VEGETATION_LAND, BUILT_LAND)

**What Fails Without It:**
- ⚠️ Predictions return `null` for ML results
- ⛔ `/predict` endpoint fails
- ⛔ Point/polygon analysis returns incomplete results
- ✅ GEE feature extraction still works
- ✅ Marketplace CRUD still works

**Features Expected (15 total):**
- NDVI, EVI, SAVI, NDWI
- ELEV, SLOPE, ASPECT
- B2, B3, B4, B8 (Sentinel-2 bands)
- NDVI_mean_3x3, NDVI_std_3x3, NIR_mean_3x3, NIR_std_3x3

---

### 4.5 Raster Files (SOFT BLOCKER)

**Location:** `backend/rasters/`

**Files:**
- `malabe_classified_map.tif` - Pre-classified land use map for Malabe AOI
- `malabe_feature_stack.tif` - 15-band feature stack for Malabe AOI

**Status:** ✅ Files exist

**What Fails Without Them:**
- ⛔ `/aoi/inspect` returns errors
- ⛔ `/tiles/classified/{z}/{x}/{y}.png` returns transparent tiles (no map display)
- ⛔ `/aoi/summary` fails
- ⛔ `/intelligence/evaluate` fails
- ✅ GEE universal analysis (/api/analysis/*) still works
- ✅ Marketplace still works

**These only affect the legacy Malabe AOI demo features.**

---

### 4.6 Media Folders (AUTO-CREATED)

**Locations:**
- `backend/media/photos/` - User-uploaded land photos
- `backend/media/docs/` - User-uploaded ownership documents

**Status:** Auto-created on startup with `os.makedirs(exist_ok=True)`

**Static File Serving:** Mounted at `/media`

---

## 5. Setup Steps from Fresh Clone

### Step-by-Step Checklist

#### ✅ Step 1: Navigate to backend
```bash
cd backend
```

#### ✅ Step 2: Create Python virtual environment
```bash
python -m venv .venv
```

**Common Issue:** If `python` is not found, try `python3` or `py`.

#### ✅ Step 3: Activate virtual environment
```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Windows CMD
.\.venv\Scripts\activate.bat

# macOS/Linux
source .venv/bin/activate
```

**Verification:** Your prompt should show `(.venv)`

#### ✅ Step 4: Install dependencies
```bash
pip install -r requirements.txt
```

**Expected Duration:** 2-5 minutes (depends on internet speed and GDAL binaries)

**Common Issue:** `rasterio` or `geoalchemy2` may fail on Windows if GDAL is not available. If this happens:
- Try installing wheel packages from [Christoph Gohlke's site](https://www.lfd.uci.edu/~gohlke/pythonlibs/) for rasterio
- Or install via conda: `conda install -c conda-forge rasterio`

#### ✅ Step 5: Verify environment variables
```bash
# Check if .env exists
cat .env  # Linux/Mac
type .env  # Windows

# Ensure DATABASE_URL, MONGODB_URL, GEE_PROJECT are set
```

**Your Status:** ✅ `.env` file already configured

#### ✅ Step 6: Setup PostgreSQL
1. Install PostgreSQL 12+ with PostGIS extension
2. Create database:
   ```sql
   CREATE DATABASE land_marketplace;
   \c land_marketplace
   CREATE EXTENSION postgis;
   ```
3. Update `DATABASE_URL` in `.env` with correct password

**Test:**
```bash
psql -h localhost -U postgres -d land_marketplace -c "SELECT PostGIS_Version();"
```

#### ✅ Step 7: Setup MongoDB
1. Install MongoDB Community Server OR use MongoDB Atlas (cloud)
2. Ensure it's running on `localhost:27017` or update `MONGODB_URL`

**Test:**
```bash
mongosh "mongodb://localhost:27017" --eval "db.version()"
```

**Your Status:** Using MongoDB Atlas (cloud) - should work if credentials are valid

#### ✅ Step 8: Authenticate Google Earth Engine
```bash
earthengine authenticate
```

**This opens browser for OAuth flow. One-time setup per machine.**

**Test:**
```bash
python diagnose_gee.py
```

#### ✅ Step 9: Start the backend
```bash
uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
```

**Or use the convenience script from project root:**
```powershell
.\run-backend.ps1
```

#### ✅ Step 10: Verify startup logs
**Expected Output:**
```
✅ Marketplace tables ready
✅ MongoDB connection ready
✅ Google Earth Engine Initialized with project: my-first-project-471714
✅ XGBoost model loaded from model/xgb_land_classifier.pkl
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Partial Success Output (MongoDB fail):**
```
✅ Marketplace tables ready
⚠️ MongoDB not available (auth will fail): ...
✅ Google Earth Engine Initialized with project: ...
```

**Failure Indicators:**
```
⚠️ Could not create marketplace tables: ...  [PostgreSQL issue]
⚠️ GEE Initialization failed: ...  [GEE auth issue]
⚠️ XGBoost model not found at ...  [Model file missing]
```

---

## 6. Health Check & Verification

### 6.1 Root Endpoint (Always Available)
```bash
curl http://localhost:8000/
```

**Expected Response:**
```json
{
  "ok": true,
  "service": "idle-land-mobilization",
  "model_loaded": true,
  "model_path": "model/xgb_land_classifier.pkl"
}
```

### 6.2 API Documentation (FastAPI Auto-Generated)
**Swagger UI:** http://localhost:8000/docs  
**ReDoc:** http://localhost:8000/redoc

✅ **These are automatically available with FastAPI**

### 6.3 Test Authentication Flow
```bash
# 1. Register a user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "username": "testuser",
    "email": "test@example.com",
    "password": "test1234",
    "role": "farmer"
  }'

# 2. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test1234"
  }'

# Returns: {"token": "eyJ...", "user": {...}}
```

### 6.4 Test Marketplace Listing (Requires PostgreSQL)
```bash
curl http://localhost:8000/api/listings
```

### 6.5 Test GEE Point Analysis (Requires GEE)
```bash
curl "http://localhost:8000/api/analysis/point?lat=6.9&lng=79.95"
```

---

## 7. Likely Startup Failure Points

### 🔴 Critical Blockers

| Issue | Symptom | Fix |
|-------|---------|-----|
| **PostgreSQL not running** | `⚠️ Could not create marketplace tables` | Install PostgreSQL+PostGIS, create `land_marketplace` database |
| **PostgreSQL wrong credentials** | `psycopg2.OperationalError` | Update `DATABASE_URL` in `.env` |
| **PostGIS extension missing** | `ERROR: type "geometry" does not exist` | Run `CREATE EXTENSION postgis;` in database |
| **MongoDB not running** | `⚠️ MongoDB not available` | Install MongoDB or verify Atlas connection |
| **MongoDB wrong URL** | `ServerSelectionTimeoutError` | Update `MONGODB_URL` in `.env` |
| **Python version < 3.9** | Import errors, syntax errors | Upgrade to Python 3.9+ |
| **Missing GDAL/rasterio** | `ImportError: DLL load failed` | Install via conda or use wheel files |

### 🟡 Soft Blockers (Partial Functionality)

| Issue | Impact | Workaround |
|-------|--------|-----------|
| **GEE not authenticated** | `/api/analysis/*` endpoints fail | Run `earthengine authenticate` |
| **GEE_PROJECT not set** | GEE initialization fails | Set `GEE_PROJECT` in `.env` |
| **Model file missing** | Predictions return `null` | Use pre-trained model from repo (should exist) |
| **Raster files missing** | Legacy `/aoi/*` endpoints fail | Use universal `/api/analysis/*` instead |

### 🟢 Non-Critical Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| **PORT 8000 already in use** | Cannot start server | Change port in command: `--port 8001` |
| **No write permission to media/** | File uploads fail | Check folder permissions |

---

## 8. Partial Run Capability

**Can the backend run with missing dependencies?**

### ✅ Minimum Viable Configuration

**What Works:**
- ✅ Server starts and responds to `/` health check
- ✅ API documentation at `/docs`
- ✅ Static file serving from `/media`

**What Fails:**
- ⛔ Authentication endpoints
- ⛔ Marketplace endpoints
- ⛔ GEE analysis endpoints
- ⛔ ML predictions

**Verdict:** Server starts but is largely non-functional without PostgreSQL + MongoDB.

---

### ✅ PostgreSQL Only (No MongoDB, No GEE)

**What Works:**
- ✅ Marketplace listing creation/retrieval
- ✅ Photo/document uploads (stored locally)
- ✅ Restricted zones (admin endpoints)
- ✅ Admin stats

**What Fails:**
- ⛔ User registration/login
- ⛔ `/api/listings/my` (requires auth)
- ⛔ GEE analysis endpoints
- ⛔ ML predictions (if model missing)

**Verdict:** Good for testing marketplace CRUD without auth.

---

### ✅ PostgreSQL + MongoDB (No GEE)

**What Works:**
- ✅ Full authentication flow
- ✅ Marketplace with user ownership
- ✅ Legacy Malabe AOI analysis (using rasters)
- ✅ `/predict` endpoint (if model exists)

**What Fails:**
- ⛔ `/api/analysis/city`
- ⛔ `/api/analysis/point`
- ⛔ `/api/analysis/polygon`

**Verdict:** Production-ready except for universal GEE features.

---

### ✅ Full Stack (PostgreSQL + MongoDB + GEE)

**What Works:**
- ✅ Everything!

**Verdict:** Fully operational.

---

## 9. Environment-Specific Considerations

### Windows-Specific Issues
- **PowerShell Execution Policy:** If `.ps1` scripts fail, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **GDAL/rasterio:** May need conda install or wheel files
- **Path length limits:** Enable long paths in registry if deep folder errors occur

### macOS/Linux Issues
- **Python 3.9 not default:** Use `python3.9` or `python3` explicitly
- **PostgreSQL locale:** May need `LC_ALL=en_US.UTF-8` export
- **Permission denied on venv:** Check `chmod +x .venv/bin/activate`

---

## 10. Quick Diagnostic Commands

### Test All External Services at Once
Create `backend/test_services.py`:
```python
import os
from dotenv import load_dotenv
load_dotenv()

# Test PostgreSQL
try:
    from sqlalchemy import create_engine
    engine = create_engine(os.getenv("DATABASE_URL"))
    engine.connect()
    print("✅ PostgreSQL connection successful")
except Exception as e:
    print(f"❌ PostgreSQL failed: {e}")

# Test MongoDB
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    import asyncio
    asyncio.run(client.server_info())
    print("✅ MongoDB connection successful")
except Exception as e:
    print(f"❌ MongoDB failed: {e}")

# Test GEE
try:
    import ee
    ee.Initialize(project=os.getenv("GEE_PROJECT"))
    ee.Number(42).getInfo()
    print("✅ Google Earth Engine initialized")
except Exception as e:
    print(f"❌ GEE failed: {e}")

# Test Model
try:
    import joblib
    model = joblib.load("model/xgb_land_classifier.pkl")
    print("✅ XGBoost model loaded")
except Exception as e:
    print(f"❌ Model failed: {e}")
```

Run:
```bash
cd backend
python test_services.py
```

---

## 11. Recommended First Steps

1. ✅ **Install PostgreSQL + PostGIS**
   - Create `land_marketplace` database
   - Enable PostGIS extension

2. ✅ **Verify MongoDB Atlas connection**
   - Test connection string in `.env`
   - Or install local MongoDB

3. ✅ **Authenticate Google Earth Engine**
   ```bash
   earthengine authenticate
   ```

4. ✅ **Install Python dependencies**
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

5. ✅ **Start the backend and check logs**
   ```bash
   uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
   ```

6. ✅ **Test root endpoint**
   ```bash
   curl http://localhost:8000/
   ```

7. ✅ **Open Swagger docs**
   - Navigate to http://localhost:8000/docs

8. ✅ **Register a test user**
   - Use `/api/v1/auth/register` endpoint in Swagger

9. ✅ **Test GEE analysis**
   - Use `/api/analysis/point` with any lat/lng globally

---

## 12. Summary

### 🎯 Minimum Requirements to Start
- ✅ Python 3.9+
- ✅ Virtual environment with dependencies installed
- ⛔ **PostgreSQL + PostGIS** (blocker for marketplace)
- ⛔ **MongoDB** (blocker for auth)
- ⚠️ **Google Earth Engine** (optional, but disables GEE features)

### 🎯 Expected First Run Result
If databases are ready:
```
✅ Marketplace tables ready
✅ MongoDB connection ready
✅ Google Earth Engine Initialized
✅ XGBoost model loaded
INFO:     Application startup complete.
```

### 🎯 Post-Startup Verification
1. Visit http://localhost:8000/ → Should return JSON
2. Visit http://localhost:8000/docs → Should show Swagger UI
3. Register user via `/api/v1/auth/register`
4. Login via `/api/v1/auth/login` → Should return token
5. Test GEE analysis: `/api/analysis/point?lat=6.9&lng=79.95`

---

**Status:** Ready to proceed with backend setup ✅  
**Next Step:** Follow checklist in Section 5

**Estimated Setup Time:** 30-60 minutes (if databases need installation)

---

*Generated for Smart Agri Suite - Backend Readiness Assessment*
