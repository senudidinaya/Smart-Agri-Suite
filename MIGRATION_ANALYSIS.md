# 🔄 MIGRATION ANALYSIS: Integrating Cultivator Intention Analyzer

**Generated:** March 8, 2026  
**Analysis Scope:** Smart-Agri-Suite Repository Merge  
**Status:** Ready for Migration Implementation

---

## TABLE OF CONTENTS

1. [Repository Architecture Diagram](#repository-architecture-diagram)
2. [Current System Architecture](#current-system-architecture)
3. [Cultivator Intention Analyzer Architecture](#cultivator-intention-analyzer-architecture)
4. [Detailed Dependency Comparison](#detailed-dependency-comparison)
5. [Integration Analysis](#integration-analysis)
6. [Frontend Impact Analysis](#frontend-impact-analysis)
7. [Step-by-Step Migration Plan](#step-by-step-migration-plan)
8. [Potential Risks & Mitigation](#potential-risks--mitigation)
9. [Recommended Integration Strategy](#recommended-integration-strategy)

---

## REPOSITORY ARCHITECTURE DIAGRAM

```
CURRENT STATE: Dual Backend Systems (Separate)
═════════════════════════════════════════════════════════════════

Smart-Agri-Suite/
│
├── backend/ [MAIN - Land Marketplace System]
│   ├── idle_land_api.py (FastAPI entry point - monolithic)
│   ├── gee_service.py (Google Earth Engine geospatial)
│   ├── auth_utils.py (MongoDB auth)
│   ├── marketplace/
│   │   ├── database.py → PostgreSQL + PostGIS
│   │   ├── models.py (ORM: LandListing, RestrictedZone, etc)
│   │   ├── crud.py
│   │   └── schemas.py
│   ├── model/ → XGBoost land classifier (xgb_land_classifier.pkl)
│   ├── rasters/ → GeoTIFFs (malabe dataset)
│   └── requirements.txt (22 packages - GEE focused)
│
├── frontend/ [MAIN - Mobile App]
│   ├── app/_layout.tsx (Expo Router root)
│   ├── app/auth/ (login/register)
│   ├── app/(main)/ (tabbed interface)
│   ├── app/land/ (land details, list forms)
│   ├── app/admin/ (admin dashboard)
│   ├── app/listings/ (marketplace UX)
│   └── package.json (React Native 0.81, Expo 54)
│
└── _cultivator_intention_analyzer/ [ISOLATED - Standalone System]
    │
    ├── backend/
    │   ├── app/
    │   │   ├── main.py (FastAPI entry point - modular)
    │   │   ├── api/v1/
    │   │   │   ├── routes.py
    │   │   │   └── endpoints/ [10 endpoint modules]
    │   │   │       ├── health.py
    │   │   │       ├── predict.py
    │   │   │       ├── auth.py
    │   │   │       ├── calls.py (Agora RTC integration)
    │   │   │       ├── interviews.py
    │   │   │       ├── jobs.py
    │   │   │       ├── applications.py
    │   │   │       ├── call_tasks.py
    │   │   │       ├── notifications.py
    │   │   │       └── explain.py (SHAP explainability)
    │   │   ├── core/
    │   │   │   ├── config.py (Pydantic BaseSettings)
    │   │   │   ├── database.py (MongoDB async)
    │   │   │   ├── logging.py
    │   │   │   ├── auth.py
    │   │   │   └── middleware.py (correlation ID, logging)
    │   │   ├── services/
    │   │   │   ├── inference.py (IntentRiskClassifier ML)
    │   │   │   ├── gate2_inference.py (Video analysis)
    │   │   │   ├── agora.py (RTC token generation)
    │   │   │   ├── decision_engine.py
    │   │   │   ├── deepseek_service.py (LLM integration)
    │   │   │   ├── explainability.py (SHAP)
    │   │   │   ├── admin_assignment.py
    │   │   │   ├── safety_assessment.py
    │   │   │   ├── combined_analysis.py
    │   │   │   └── gate2_unified_analyzer.py
    │   │   ├── schemas/ (Pydantic models)
    │   │   └── utils/
    │   │       ├── audio.py
    │   │       └── ... (misc utilities)
    │   ├── models/ [ML Artifacts]
    │   │   ├── intent_risk_model.pkl
    │   │   ├── intent_risk_scaler.pkl
    │   │   ├── intent_risk_label_encoder.pkl
    │   │   ├── gate1_deception_model.pkl
    │   │   ├── gate1_deception_metadata.json
    │   │   └── gate2/ (video analysis models)
    │   ├── scripts/ (data generation, training)
    │   ├── tests/
    │   ├── data/ (labeled datasets)
    │   └── requirements.txt (60+ packages - ML/Audio focused)
    │
    └── frontend/
        ├── App.tsx (Expo root)
        ├── screens/ (voice recording, interview UX)
        └── ... (independent React Native app)


TARGET STATE: Unified Backend System
═════════════════════════════════════════════════════════════════

Smart-Agri-Suite/
│
├── backend/
│   ├── idle_land_api.py [UPDATED - merged entry point]
│   ├── gee_service.py
│   ├── auth_utils.py [UPDATED - merged auth]
│   │
│   ├── marketplace/ [UNCHANGED]
│   │   ├── database.py → PostgreSQL
│   │   ├── models.py
│   │   ├── crud.py
│   │   └── schemas.py
│   │
│   ├── cultivator/ [NEW - from _cultivator_intention_analyzer/backend/app/]
│   │   ├── core/
│   │   │   ├── config.py [MERGED with main config]
│   │   │   ├── database.py [MongoDB specific]
│   │   │   ├── logging.py
│   │   │   ├── auth.py
│   │   │   └── middleware.py
│   │   ├── services/
│   │   │   ├── inference.py
│   │   │   ├── gate2_inference.py
│   │   │   ├── agora.py
│   │   │   ├── decision_engine.py
│   │   │   ├── deepseek_service.py
│   │   │   ├── explainability.py
│   │   │   ├── admin_assignment.py
│   │   │   ├── safety_assessment.py
│   │   │   ├── combined_analysis.py
│   │   │   └── gate2_unified_analyzer.py
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── routes.py [MERGED into main router]
│   │   │       └── endpoints/ (all 10 modules)
│   │   ├── schemas/
│   │   └── utils/
│   │
│   ├── models/ [MERGED - all model artifacts]
│   │   ├── xgb_land_classifier.pkl
│   │   ├── intent_risk_model.pkl
│   │   ├── gate2/ (video models)
│   │   └── ...
│   │
│   ├── data/ [MOVED - all datasets]
│   │
│   ├── requirements.txt [MERGED & DEDUPLICATED]
│   ├── pyproject.toml [UNIFIED]
│   └── .env.example [MERGED configs]
│
├── frontend/ [MINIMAL CHANGES]
│   ├── Updated context/AuthContext.tsx
│   └── New service calls to cultivator endpoints
│
└── _cultivator_intention_analyzer/ [REMOVED after migration]
```

---

## CURRENT SYSTEM ARCHITECTURE

### Smart Agri Suite - Main Backend

**Purpose:** Land marketplace with geospatial analysis using Google Earth Engine and XGBoost.

**Framework & Entry Point:**
- **Framework:** FastAPI 0.109.2 + Uvicorn
- **Entry Point:** `backend/idle_land_api.py`
- **Startup:** `uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000`

**Architecture Style:** Monolithic (single file with inline routes)

**Key Components:**
```
idle_land_api.py:
├── FastAPI app initialization
├── CORS middleware (allow all origins)
├── MarketplaceBase SQLAlchemy setup
├── Static file mounting (/media)
├── ML model loading (xgb_land_classifier.pkl)
├── Inline route handlers for:
│   ├── /auth/* (user register, login, JWT)
│   ├── /aoi/* (area of interest analysis)
│   ├── /analyze/* (GEE + XGBoost analysis)
│   ├── /marketplace/* (listing CRUD)
│   ├── /admin/* (dashboard, zone management)
│   └── /media/* (static file serving)
└── Raster processing (GeoTIFFs, rasterio)
```

**Database Architecture:**
- **PostgreSQL + PostGIS:** Marketplace entities (LandListing, RestrictedZone, etc)
  - ORM: SQLAlchemy via `marketplace/models.py`
  - Port: 5432 (default)
- **MongoDB:** User authentication via `auth_utils.py`
  - Collections: `users`, `tokens`, `notifications`
  - Default: MongoDB Atlas or local `mongodb://localhost:27017`

**Dependencies (22 direct):**
```
Core:         fastapi, uvicorn[standard], python-dotenv, python-multipart
Database:     sqlalchemy, psycopg2-binary, geoalchemy2, motor
Auth:         python-jose[cryptography], bcrypt
ML/GIS:       xgboost, scikit-learn, joblib, numpy, pandas
Geospatial:   rasterio, shapely, mercantile, rio-tiler, pyproj, geopy
Cloud:        earthengine-api
Image:        pillow
```

**API Endpoints:**
- `GET  /` — health check
- `POST /auth/register` — user registration (MongoDB)
- `POST /auth/login` — JWT token generation
- `POST /aoi/analyze` — local Malabe AOI analysis + XGBoost classification
- `POST /analyze/global` — Google Earth Engine complex analysis
- `POST /marketplace/listing` — create land listing (PostgreSQL)
- `GET  /marketplace/listings` — list all listings
- `PUT  /marketplace/listings/{id}` — update listing
- `DELETE /marketplace/listings/{id}` — delete listing
- `POST /marketplace/listing/{id}/verify` — admin verification
- `GET  /media/{path}` — static file serving
- Admin zone CRUD endpoints

---

### Smart Agri Suite - Main Frontend

**Purpose:** Cross-platform mobile app for farmers and land stakeholders.

**Framework & Entry Point:**
- **Framework:** React Native 0.81 + Expo 54 + expo-router (file-based)
- **Language:** TypeScript (strict mode)
- **Entry Point:** `frontend/index.js` → `app/_layout.tsx` (Root Navigator)
- **Target Platforms:** iOS, Android
- **Dev Server:** `npx expo start`

**Architecture Style:** File-based routing with context providers + hooks

**Key Components:**
```
app/_layout.tsx:
├── AuthProvider (login state)
├── LanguageProvider (i18n)
├── Stack navigator (expo-router)
└── Auth gate (redirects unauthenticated users)

Screens:
├── auth/login.tsx, auth/register.tsx
├── (main)/ [Tabbed interface]
│   ├── index.tsx (home/dashboard)
│   ├── analytics/ (charts, demand forecasting)
│   ├── offerings/ (crop prices)
│   └── profile/
├── land/ [Land analysis]
│   ├── index.tsx (land map)
│   ├── [id].tsx (land detail view)
│   └── list-land-form.tsx (new listing form)
├── listings/ [Marketplace]
│   ├── all.tsx (browse all listings)
│   └── detail.tsx (listing detail)
└── admin/ [Admin dashboard]
    ├── listing-detail.tsx
    ├── zones.tsx
    └── add-zone.tsx

Services:
├── api.ts (Axios base configuration)
├── AuthContext.tsx (user state + JWT)
├── LanguageContext.tsx (localization)
└── Services/ (reusable API calls)

Components:
├── ComplexitySearch.tsx
├── marketplace-filter.tsx
├── ConfidenceBar.tsx
└── shared/ (UI components)
```

**API Integration:**
- **Base URL:** Configured in `src/api.ts`
- **Calls:** Axios with JWT Bearer token (from AuthContext)
- **Endpoints Called:**
  - POST `/auth/register`, `/auth/login`
  - POST `/aoi/analyze`, `/analyze/global`
  - GET/POST `/marketplace/listings/*`
  - GET `/media/{path}` (photo/doc serving)

**Dependencies (React Native focused):**
```
Core:         react 19, react-native 0.81, typescript
Routing:      expo-router 6.x, expo-linking
Maps:         react-native-maps, react-native-map-clustering
Animations:   react-native-reanimated, react-native-gesture-handler
UI:           react-native-screens, react-native-safe-area-context
Data/Async:   @react-native/async-storage, @tanstack/react-query
HTTP:         axios
Charts:       react-native-chart-kit
State:        zustand
```

---

## CULTIVATOR INTENTION ANALYZER ARCHITECTURE

### Purpose & Domain

**Purpose:** AI-driven voice & video analysis system to predict cultivator (seller) intentions during land sale negotiations.

**Domain:** Voice/video interview analysis with LLM integration for explainability.

**Type:** Modular backend service (ready for integration) + standalone mobile app.

---

### Backend System

**Framework & Entry Point:**
- **Framework:** FastAPI 0.109.2 + Uvicorn (same as main backend)
- **Entry Point:** `_cultivator_intention_analyzer/backend/app/main.py`
- **Startup:** `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- **Architecture Style:** Modular (organized by feature/domain)

**Configuration:**
- **Settings:** Pydantic BaseSettings in `app/core/config.py`
- **Lifespan:** Async context manager for startup/shutdown
- **Middleware:** Correlation ID, request logging, CORS
- **Logging:** Structured JSON logging with correlation tracking

**Core Components:**

```
app/main.py:
├── Application lifespan manager (startup/shutdown)
├── MongoDB connection initialization
├── ML model preloading
│
app/core/:
├── config.py
│   ├── App settings (name, version, debug mode)
│   ├── Database (MongoDB URL + db name)
│   ├── Auth (JWT secret, passlib)
│   ├── Model settings (path, device)
│   ├── Audio settings (max duration, formats, sample rate)
│   ├── Agora settings (app ID, certificate, customer ID)
│   └── LLM settings (DeepSeek API key, base URL, model)
├── database.py → Async MongoDB connection management
├── logging.py → Structured logging with extras
├── auth.py → JWT token verification
└── middleware.py → Correlation ID extraction, request logging

app/api/v1/:
├── routes.py [Master router - includes all endpoint routers]
│   ├── /health
│   ├── /api/v1/predict (audio intent prediction)
│   ├── /api/v1/auth (user management)
│   ├── /api/v1/calls (Agora RTC integration)
│   ├── /api/v1/interviews (interview session mgmt)
│   ├── /api/v1/jobs (async processing jobs)
│   ├── /api/v1/applications (interview applications)
│   ├── /api/v1/call_tasks (call task scheduling)
│   ├── /api/v1/notifications (notification delivery)
│   └── /api/v1/explain (SHAP explainability)
│
app/services/:
├── inference.py
│   └── IntentRiskClassifier (scikit-learn based)
│       ├── Load intent_risk_model.pkl (trained classifier)
│       ├── Load intent_risk_scaler.pkl (feature scaling)
│       ├── Audio + text feature extraction
│       └── Prediction with fallback rules
├── gate2_inference.py → Video face detection + HOG features
├── gate2_unified_analyzer.py → Combined audio+video analysis
├── agora.py → Agora RTC token generation + cloud recording
├── decision_engine.py → Intent classification logic
├── deepseek_service.py → LLM API calls for explainability
├── explainability.py → SHAP feature importance
├── admin_assignment.py → Admin task assignment
├── safety_assessment.py → Content moderation
└── combined_analysis.py → Aggregated decision pipeline

app/schemas/:
├── prediction.py → PredictionResponse, AudioRequest
├── call.py → CallInitiate, CallResponse, AgoraTokenInfo
├── health.py → HealthResponse
├── auth.py → UserRegister, UserLogin, TokenResponse
└── ... (other domain schemas)

app/utils/:
├── audio.py → Audio file validation, format detection, duration check
└── ... (misc utilities)

models/:
├── intent_risk_model.pkl → Trained sklearn classifier
├── intent_risk_scaler.pkl → StandardScaler for features
├── intent_risk_label_encoder.pkl → LabelEncoder for classes
├── gate1_deception_model.pkl → Deception detection model
├── gate1_deception_metadata.json
└── gate2/ → Video analysis models

data/:
├── labeled_call_features.csv → Training dataset
├── call_features.csv → Feature extraction examples
└── deception/ → Specialized deception detection data

scripts/:
├── generate_call_features_dataset.py → Feature engineering
├── auto_label_dataset.py → Automated labeling
├── augment_and_retrain.py → Model retraining
├── generate_synthetic_data.py → Data augmentation
└── ... (other training utilities)

tests/:
├── test_deception_models.py
├── test_ml_verify.py
└── ... (unit + integration tests)
```

**Database Architecture:**
- **MongoDB (primary):** User auth, calls, interviews, notifications
  - Collections:
    - `users` → User profiles
    - `calls` → Call records with metadata
    - `interviews` → Interview sessions
    - `notifications` → Status notifications
    - `call_tasks` → Scheduled call tasks
    - `applications` → Interview applications
  - Connection: Async Motor driver
  - Default: `mongodb://localhost:27017/smartagri`

**Dependencies (60+ packages, ML-focused):**
```
Core Framework:
  fastapi 0.109.2, uvicorn[standard] 0.27.1, pydantic 2.6.1, python-multipart 0.0.9

Config/Settings:
  pydantic-settings 2.1.0, python-dotenv 1.0.1

Database:
  motor 3.3.2, pymongo 4.6.1 [async MongoDB]

HTTP/RPC:
  httpx 0.26.0, aiohttp 3.9.3 [async HTTP client]

Authentication:
  python-jose[cryptography] 3.3.0, passlib[bcrypt] 1.7.4, pytz 2024.1

Real-Time Communication:
  agora-token-builder 1.0.0 [RTC token generation]

ML/Inference:
  scikit-learn 1.4.0, joblib 1.3.0, numpy 1.26.0, pandas 2.2.0

Audio Processing:
  librosa 0.10.1, scipy 1.12.0 [feature extraction]

Computer Vision:
  opencv-python 4.9.0, Pillow 10.2.0 [face detection, image processing]

Video:
  imageio 2.34.0 [video frame extraction]

Testing:
  pytest 7.4.0, pytest-asyncio 0.23.4

Explainability:
  [SHAP library - implied by explainability.py]

LLM Integration:
  [DeepSeek API calls via httpx/aiohttp]
```

**API Endpoints:**
```
Health & Meta:
  GET    /health
  GET    /api/v1/health

Core Prediction:
  POST   /api/v1/predict/upload
  POST   /api/v1/predict/base64

Audio Calling:
  POST   /api/v1/calls/initiate
  POST   /api/v1/calls/incoming-response
  POST   /api/v1/calls/accept
  POST   /api/v1/calls/recording-upload
  GET    /api/v1/calls/{call_id}
  POST   /api/v1/calls/{call_id}/recording/start
  POST   /api/v1/calls/{call_id}/recording/stop

Interview Management:
  POST   /api/v1/interviews
  GET    /api/v1/interviews/{interview_id}
  GET    /api/v1/interviews (paginated list)

Authentication:
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/refresh

Admin & Jobs:
  POST   /api/v1/jobs (async processing)
  GET    /api/v1/jobs/{job_id}
  POST   /api/v1/admin/assign-interviewer
  POST   /api/v1/admin/call-tasks

Explainability:
  POST   /api/v1/explain
  GET    /api/v1/explain/{prediction_id}
```

---

### Frontend System

**Purpose:** Standalone React Native app for cultivators to participate in interview calls.

**Framework:** React Native 0.81 + TypeScript

**Architecture:** Independent Expo app with local screens for:
- Call recording/initiation
- Interview session UX
- Audio playback + waveform visualization

**Note:** Not directly integrated with main Smart Agri Suite frontend; operates as separate microservice consumer.

---

## DETAILED DEPENDENCY COMPARISON

### Shared Dependencies (Exact Versions)

| Package | Main Backend | Cultivator Module | Status | Notes |
|---------|--------------|-------------------|--------|-------|
| fastapi | (implicit) | 0.109.2 | ⚠️ PIN IN BOTH | Use exact `0.109.2` |
| uvicorn[standard] | (no version pin) | 0.27.1 | ⚠️ PIN CULTIVATOR | Align to `0.27.1` |
| python-jose[crypto] | (no version) | 3.3.0 | ⚠️ MANAGE | Consolidate version |
| bcrypt | (no version) | (in passlib) | ⚠️ TRANSITIVE | Check compatibility |
| pydantic | (implicit) | 2.6.1 | ⚠️ ENSURE MATCH | Must match main |
| python-dotenv | (no version) | 1.0.1 | ✅ COMPATIBLE | Can use 1.0.1 |
| python-multipart | (no version) | 0.0.9 | ✅ COMPATIBLE | Stable version |
| motor | (no version) | 3.3.2 | ⚠️ NEW REQUIREMENT | Add to main |
| pymongo | (no version) | 4.6.1 | ⚠️ TRANSITIVE | Comes with motor |
| numpy | (no version) | 1.26.0 | ✅ COMPATIBLE | Add to main |
| scikit-learn | (no version) | 1.4.0 | ✅ COMPATIBLE | Add to main |
| joblib | (no version) | 1.3.0 | ✅ COMPATIBLE | Add to main |
| pandas | (no version) | 2.2.0 | ✅ COMPATIBLE | Add to main |
| Pillow | 10 (implicit) | 10.2.0 | ✅ COMPATIBLE | Use 10.2.0 |

### Cultivator-Unique Dependencies (Not in Main)

| Package | Version | Purpose | Size | Risk |
|---------|---------|---------|------|------|
| librosa | 0.10.1 | Audio feature extraction | ~500 KB | ❌ LARGE |
| scipy | 1.12.0 | Audio signal processing | ~50 MB | ⚠️ HEAVY |
| opencv-python | 4.9.0 | Face detection (Haar cascade) | ~100 MB | ⚠️ LARGE |
| imageio | 2.34.0 | Video frame extraction | ~200 KB | ✅ OK |
| agora-token-builder | 1.0.0 | RTC token generation | ~50 KB | ✅ OK |
| pytest | 7.4.0 | Testing framework | ~1 MB | ✅ DEV |
| pytest-asyncio | 0.23.4 | Async test support | ~100 KB | ✅ DEV |
| passlib[bcrypt] | 1.7.4 | Password hashing | ~100 KB | ✅ OK |
| pydantic-settings | 2.1.0 | Settings management | ~50 KB | ✅ OK |
| httpx | 0.26.0 | Async HTTP client | ~200 KB | ✅ OK |
| aiohttp | 3.9.3 | Alternative HTTP client | ~500 KB | ✅ OK |
| pytz | 2024.1 | Timezone handling | ~30 KB | ✅ OK |

### Main-Unique Dependencies (Not in Cultivator)

| Package | Version | Purpose | Conflict Risk |
|---------|---------|---------|----------------|
| sqlalchemy | (no pin) | ORM for PostgreSQL | ✅ NONE - different DB |
| psycopg2-binary | (no pin) | PostgreSQL driver | ✅ NONE - different DB |
| geoalchemy2 | (no pin) | PostGIS extension | ✅ NONE - geospatial only |
| alembic | (no pin) | DB migrations | ✅ NONE - different DB |
| rasterio | (no pin) | GeoTIFF reading | ✅ NONE - geospatial only |
| shapely | (no pin) | Geometry operations | ✅ NONE - geospatial only |
| mercantile | (no pin) | Tile math | ✅ NONE - geospatial only |
| rio-tiler | (no pin) | Raster tile rendering | ✅ NONE - geospatial only |
| pyproj | 3.0.0+ | Coordinate projection | ✅ NONE - geospatial only |
| xgboost | (no pin) | ML land classifier | ✅ NONE - different domain |
| earthengine-api | (no pin) | Google Earth Engine | ✅ NONE - different domain |
| geopy | (no pin) | Geocoding | ✅ NONE - different domain |

### Dependency Conflict Summary

**✅ NO BREAKING CONFLICTS DETECTED**

- **Framework Compatibility:** Both use FastAPI 0.109.x → Safe to merge
- **Database Separation:** PostgreSQL + MongoDB (geospatial vs. intent) → No conflicts
- **ML Stack Orthogonal:** XGBoost (land) vs. scikit-learn (intent) → No overlap
- **Audio/Video Unique:** librosa, opencv only in cultivator → Isolated dependencies

**⚠️ REQUIRED ACTIONS:**

1. **Pin versions explicitly** in merged `requirements.txt`:
   ```
   fastapi==0.109.2
   pydantic==2.6.1
   uvicorn[standard]==0.27.1
   python-jose[cryptography]==3.3.0
   ```

2. **Add cultivator dependencies** to main backend:
   ```
   # Audio/ML
   librosa>=0.10.1
   scipy>=1.12.0
   scikit-learn>=1.4.0
   joblib>=1.3.0
   
   # Video
   opencv-python>=4.9.0
   imageio>=2.34.0
   
   # Agora
   agora-token-builder==1.0.0
   
   # Database
   motor>=3.3.2
   pymongo>=4.6.1
   
   # Settings
   pydantic-settings>=2.1.0
   ```

3. **Manage transitive dependencies:**
   - librosa → numpy, scipy → large install
   - opencv-python → binary with OS-specific requirements
   - Consider `opencv-python-headless` for server environments

---

## INTEGRATION ANALYSIS

### Backend Integration Points

#### 1. Entry Point Consolidation

**Current State (Two Separate Servers):**
```
Main Backend:        Port 8000 (idle_land_api.py)
Cultivator Module:   Port 8000 (app/main.py) - requires port change
```

**Target State (Single Server):**
```
Unified Backend:     Port 8000 (idle_land_api.py + cultivator routers)
```

**Implementation:**

```python
# OPTION A: Modular Routes (Recommended)
# backend/idle_land_api.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Smart Agri Suite", version="3.0.0")

# Existing marketplace CORS
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# Import cultivator routers
from cultivator.core.config import get_settings as cultivator_settings
from cultivator.api.v1.routes import router as cultivator_router

# Mount cultivator routes
app.include_router(cultivator_router)

# Keep existing marketplace routes inline or move to marketplace/routes.py
# ... existing routes ...
```

**Alternative: Full Modular Refactor**
```python
# backend/app.py (refactored)
from fastapi import FastAPI
from marketplace.routes import marketplace_router
from cultivator.routes import cultivator_router

app = FastAPI(...)
app.include_router(marketplace_router, prefix="/marketplace", tags=["Marketplace"])
app.include_router(cultivator_router, prefix="/api/v1", tags=["Cultivator"])
```

#### 2. Authentication System Merge

**Current State:**
- **Main Backend:** `auth_utils.py` - JWT + MongoDB
- **Cultivator Module:** `app/core/auth.py` + `app/api/v1/endpoints/auth.py`

**Conflict Analysis:**
- Both use same JWT library (`python-jose`)
- Both use same password hashing (`bcrypt`)
- Both target MongoDB

**Integration Strategy:**

```python
# Decision: Consolidate both auth systems

# backend/auth_unified.py (NEW - merged file)
from fastapi import Depends, HTTPException
from typing import Optional
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

# Reuse settings from unified config
from backend.config import get_settings

settings = get_settings()

# Create single auth context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Unified token verification - works for both modules"""
    # ... validation logic ...
    pass

# KEEP BOTH:
# - auth_utils.py for marketplace auth (backward compat)
# - cultivator/core/auth.py as internal (refactor to use shared)
```

**No Breaking Changes:** Both systems can coexist with unified verification.

#### 3. Configuration System Merge

**Current State:**
- **Main Backend:** `.env.example` + inline `idle_land_api.py` config
- **Cultivator Module:** `app/core/config.py` (Pydantic BaseSettings - best practice)

**Integration Strategy:**

```python
# backend/config.py (NEW - unified settings)
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Marketplace settings (from main)
    DATABASE_URL: str = "postgresql://..."
    MONGODB_URL: str = "mongodb://..."
    
    # Cultivator settings (from cultivator/core/config.py)
    AGORA_APP_ID: str = ""
    AGORA_APP_CERTIFICATE: str = ""
    MODEL_PATH: Path = Path("models/intent_classifier.pt")
    
    # Shared Auth
    JWT_SECRET: str = "your_secret"
    JWT_ALGORITHM: str = "HS256"
    
    class Config:
        env_file = ".env"

# Both modules import from this unified config
```

**Action:** Migrate main backend to use Pydantic BaseSettings (like cultivator).

#### 4. Database Connection Management

**Current State:**
- **PostgreSQL:** Direct SQLAlchemy session (synchronous)
- **MongoDB:** Async Motor driver (cultivator uses correctly)

**Risk Assessment:** ✅ LOW RISK

- **PostgreSQL transactions** isolated to marketplace module → No changes needed
- **MongoDB connection** managed by cultivator → Move `get_db()` to unified location

**Integration Strategy:**

```python
# backend/database.py (NEW - unified DB)
from marketplace.database import engine as pg_engine, SessionLocal as PgSessionLocal
from cultivator.core.database import connect_db, close_db, get_db as get_mongodb

async def startup():
    await connect_db()  # MongoDB
    # PostgreSQL ready (synchronous)

async def shutdown():
    await close_db()   # MongoDB
    # PostgreSQL cleanup
```

**Action:** Create unified `database.py` that initializes both connections at startup.

#### 5. Model & Data Artifacts

**Current State:**
```
backend/models/                         main_backend/models/
├── xgb_land_classifier.pkl             ├── intent_risk_model.pkl
└── ...                                  ├── gate2_models/
                                         └── ...

backend/rasters/                        cultivator/models/
├── malabe_feature_stack.tif            ├── intent_risk_scaler.pkl
└── ...


cultivator/data/
├── labeled_call_features.csv
└── deception/
```

**Integration:**

```
MERGED: backend/models/
├── land_classification/
│   ├── xgb_land_classifier.pkl          (rename from xgb_land_classifier.pkl)
│   └── xgb_metadata.json
├── intent_prediction/
│   ├── intent_risk_model.pkl
│   ├── intent_risk_scaler.pkl
│   └── intent_risk_label_encoder.pkl
└── video_analysis/
    ├── gate2_deception_model.pkl
    └── gate2_metadata.json

MERGED: backend/data/
├── land_classification/
│   ├── malabe_features_train.csv
│   └── rasters/
├── intention_analysis/
│   ├── labeled_call_features.csv
│   ├── call_features.csv
│   └── deception/
```

**Action:** Reorganize models/ and data/ into subfolders by domain.

#### 6. API Route Organization

**Current Marketplace Routes (inline in idle_land_api.py):**
```
GET    /
POST   /auth/register
POST   /auth/login
POST   /aoi/analyze
POST   /analyze/global
POST   /marketplace/listing
GET    /marketplace/listings
PUT    /marketplace/listings/{id}
DELETE /marketplace/listings/{id}
GET    /media/{path}
```

**Cultivator Routes (in app/api/v1/):**
```
GET    /api/v1/health
POST   /api/v1/predict/upload
POST   /api/v1/calls/initiate
GET    /api/v1/interviews/{id}
... 10 more endpoints
```

**Integration Strategy (RECOMMENDED):**

```python
# backend/idle_land_api.py (refactored)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from marketplace.routes import marketplace_router
from cultivator.api.v1.routes import cultivator_router

app = FastAPI(title="Smart Agri Suite", version="3.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy"}

# Mount route modules
app.include_router(marketplace_router)        # /marketplace/*, /auth/*, /aoi/*, /analyze/*
app.include_router(cultivator_router)         # /api/v1/*

# Media serving
app.mount("/media", StaticFiles(directory="media"), name="media")
```

**No API breaking changes:** Cultivator endpoints stay at `/api/v1/*` namespace.

#### 7. Middleware & Logging SYNCing

**Main Backend:** Basic logging (if any)  
**Cultivator Module:** Structured logging with correlation IDs (BEST PRACTICE)

**Decision:** Adopt cultivator's logging system globally.

```python
# backend/core/logging.py (from cultivator, adapted)
from app.core.logging import setup_logging, get_logger

# In idle_land_api.py startup
setup_logging()
logger = get_logger(__name__)
```

**Action:** Integrate cultivator's logging into main FastAPI app.

### File Movement Matrix

| Current Path | Target Path | Action | Complexity |
|---|---|---|---|
| `_cultivator_intention_analyzer/backend/app/` | `backend/cultivator/` | MOVE | Low |
| `_cultivator_intention_analyzer/backend/models/` | `backend/models/intention_prediction/` | MOVE + REORGANIZE | Medium |
| `_cultivator_intention_analyzer/backend/data/` | `backend/data/intention_analysis/` | MOVE + REORGANIZE | Low |
| `_cultivator_intention_analyzer/backend/scripts/` | `backend/scripts/cultivator/` | MOVE | Low |
| `_cultivator_intention_analyzer/backend/tests/` | `backend/tests/cultivator/` | MOVE | Low |
| `_cultivator_intention_analyzer/backend/requirements.txt` | MERGE into `backend/requirements.txt` | MERGE | Low |
| `auth_utils.py` | DEPRECATE (keep for compat) | REFACTOR | Medium |
| `idle_land_api.py` | REFACTOR (modularize) | REFACTOR | High |

---

## FRONTEND IMPACT ANALYSIS

### Current Frontend Features

**Existing Marketplace Features:**
- User authentication (login/register)
- Land map view with GEE analysis
- Land listing marketplace
- Admin dashboard

**New Required Features (from Cultivator Module):**
- Voice call interface (Agora RTC)
- Interview session management
- Audio recording + playback
- Prediction result display

### Frontend Integration Strategy

#### 1. Minimal Changes Approach (RECOMMENDED)

**Keep both frontends separate initially:**

```
Smart-Agri-Suite/
├── frontend/                     [Marketplace - unchanged]
├── _cultivator_intention_analyzer/frontend/  [Interviews - unchanged]
└── backend/                      [UNIFIED]
```

**Architecture:**
```
                    Smart Agri Main App
                    (Marketplace Frontend)
                              │
                              │ (JWT token)
                              ▼
                    +─────────────────────+
                    │   Unified Backend   │
                    │   Port 8000         │
                    ├─────────────────────┤
                    │ Marketplace routes  │
                    │ (GEE, listings)     │
                    ├─────────────────────┤
                    │ Cultivator routes   │
                    │ (Intent, calls)     │
                    └─────────────────────+
                              ▲
                              │ (as needed)
                              │
                    Cultivator Interview App
                    (Separate Expo App)
```

**Benefits:**
- ✅ Zero marketplace app changes
- ✅ Cultivator app untouched
- ✅ Independent deployment schedules
- ✅ Minimal risk to production

#### 2. Unified Frontend (Future Enhancement)

**If integrated later:**

```
Smart-Agri-Suite/
├── frontend/
│   ├── app/_layout.tsx         [UPDATED - auth gate handles both flows]
│   ├── app/interviews/         [NEW - intent analysis screens]
│   │   ├── call.tsx
│   │   ├── recording.tsx
│   │   └── results.tsx
│   ├── app/marketplace/        [EXISTING - unchanged]
│   ├── services/
│   │   ├── marketplaceApi.ts   [EXISTING]
│   │   ├── cultivatorApi.ts    [NEW]
│   │   └── api.ts              [UNIFIED base]
│   └── context/
│       └── CultivatorContext.tsx [NEW]
│
└── backend/ [UNIFIED]
```

**Screens to Add:**
- `app/interviews/schedule.tsx` → List upcoming interviews
- `app/interviews/call.tsx` → Agora RTC UI
- `app/interviews/results.tsx` → Intent prediction results

**Services to Add:**
```typescript
// services/cultivatorApi.ts
export const cultivatorAPI = {
  initiateCall: (recipientId: string) => POST /api/v1/calls/initiate,
  predictIntent: (audioFile: File) => POST /api/v1/predict/upload,
  getInterview: (id: string) => GET /api/v1/interviews/{id},
  listInterviews: () => GET /api/v1/interviews,
}
```

### Frontend Change Recommendations

**Immediate (Backend Merge Phase):**
- ✅ NO CHANGES REQUIRED to marketplace frontend
- ✅ Keep cultivator app running independently

**Phase 2 (3-6 months post-merge):**
- Add cultivator screens to main app (optional)
- Unified authentication context (already compatible)
- Shared API base URL (already flexible)

**Phase 3 (Future):**
- Consolidated deployment
- Unified app store submission
- Single binary for all features

---

## STEP-BY-STEP MIGRATION PLAN

### PHASE 1: PREPARATION (Day 1-2)

#### Step 1.1: Create Feature Branch
```bash
git checkout -b feature/merge-cultivator-module
```

#### Step 1.2: Backup Current Backend
```bash
# Create snapshot (non-destructive)
cp -r backend backend.backup
```

#### Step 1.3: Review Both codebases
```bash
# Document current structure
tree backend -L 2 > BACKEND_STRUCTURE.txt
tree _cultivator_intention_analyzer/backend -L 2 > CULTIVATOR_STRUCTURE.txt
```

#### Step 1.4: Create Unified .env.example
```bash
# Merge environment variables from both systems
# backend/.env.example + _cultivator_intention_analyzer/backend/.env.example
```

**Deliverable:** `backend/.env.example` with all settings from both systems.

---

### PHASE 2: FILE STRUCTURE MIGRATION (Day 2-3)

#### Step 2.1: Create Backend Module Structure
```bash
# Create new cultivator directory
mkdir -p backend/cultivator/{api,core,services,schemas,utils}
mkdir -p backend/models/{land_classification,intent_prediction,video_analysis}
mkdir -p backend/data/{land_classification,intention_analysis}
mkdir -p backend/scripts/cultivator
mkdir -p backend/tests/cultivator
```

#### Step 2.2: Move Cultivator App Files
```bash
# Move app modules (no Python imports changes yet)
cp -r _cultivator_intention_analyzer/backend/app/* backend/cultivator/

# Move models
cp _cultivator_intention_analyzer/backend/models/* backend/models/intention_prediction/

# Move data
cp -r _cultivator_intention_analyzer/backend/data/* backend/data/intention_analysis/

# Move scripts
cp -r _cultivator_intention_analyzer/backend/scripts/* backend/scripts/cultivator/

# Move tests
cp -r _cultivator_intention_analyzer/backend/tests/* backend/tests/cultivator/
```

#### Step 2.3: Verify File Integrity
```bash
# Check no files lost
find backend/cultivator -type f | wc -l
find backend/models/intention_prediction -type f | wc -l
```

**Deliverable:** All cultivator files moved to `backend/cultivator/` structure.

---

### PHASE 3: DEPENDENCY CONSOLIDATION (Day 3-4)

#### Step 3.1: Merge requirements.txt
```python
# backend/requirements.txt (MERGED)

# ============ FASTAPI FRAMEWORK ============
fastapi==0.109.2
uvicorn[standard]==0.27.1
pydantic==2.6.1
pydantic-settings==2.1.0
python-multipart==0.0.9

# ============ DATABASE ============
# PostgreSQL + PostGIS (Marketplace)
sqlalchemy
psycopg2-binary
geoalchemy2
alembic

# MongoDB (Intent + Auth)
motor>=3.3.2
pymongo>=4.6.1

# ============ AUTHENTICATION ============
python-jose[cryptography]
bcrypt
passlib[bcrypt]==1.7.4
python-dotenv==1.0.1

# ============ GEOSPATIAL (Marketplace) ============
rasterio
shapely
mercantile
rio-tiler
pyproj>=3.0.0
earthengine-api
geopy

# ============ ML - LAND CLASSIFICATION ============
xgboost
scikit-learn
joblib
numpy
pandas
pillow

# ============ ML - INTENT ANALYSIS ============
librosa>=0.10.1
scipy>=1.12.0

# ============ COMPUTER VISION ============
opencv-python>=4.9.0
imageio>=2.34.0

# ============ COMMUNICATION ============
agora-token-builder==1.0.0
httpx==0.26.0
aiohttp==3.9.3

# ============ UTILITIES ============
pytz==2024.1

# ============ TESTING ============
pytest>=7.4.0,<8.0.0
pytest-asyncio==0.23.4
typing-extensions==4.9.0
```

#### Step 3.2: Update pyproject.toml
```toml
[tool.pytest.ini_options]
testpaths = ["tests", "tests/cultivator"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
asyncio_mode = "auto"

[tool.mypy]
python_version = "3.11"
```

#### Step 3.3: Install Merged Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Deliverable:** Single unified requirements.txt + successful pip install.

---

### PHASE 4: CONFIGURATION MERGING (Day 4)

#### Step 4.1: Create Unified Config
```python
# backend/config.py (NEW - UNIFIED SETTINGS)
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ============ GENERAL ============
    app_name: str = Field(default="Smart Agri Suite")
    app_version: str = Field(default="3.0.0")
    debug: bool = Field(default=False)
    environment: str = Field(default="development")

    # ============ SERVER ============
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)

    # ============ CORS ============
    cors_origins: List[str] = Field(
        default=["*"],
        description="CORS allowed origins"
    )

    # ============ POSTGRESQL + POSTGIS (MARKETPLACE) ============
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/land_marketplace",
        description="PostgreSQL connection URL"
    )

    # ============ MONGODB (INTENT + AUTH) ============
    mongodb_url: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URL"
    )
    mongodb_database: str = Field(
        default="smartagri",
        description="MongoDB database name"
    )

    # ============ AUTHENTICATION ============
    jwt_secret: str = Field(
        default="your_secret_key_change_in_production",
        description="JWT secret key"
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT algorithm"
    )
    jwt_expiration_hours: int = Field(
        default=24,
        description="JWT token expiration in hours"
    )

    # ============ ML MODELS ============
    model_base_dir: Path = Field(
        default=Path("models"),
        description="Base directory for all ML models"
    )
    land_model_path: Path = Field(
        default=Path("models/land_classification/xgb_land_classifier.pkl"),
        description="Path to land classification model"
    )
    intent_model_path: Path = Field(
        default=Path("models/intent_prediction/intent_risk_model.pkl"),
        description="Path to intent classification model"
    )

    # ============ AUDIO SETTINGS (INTENT MODULE) ============
    max_audio_duration_seconds: float = Field(
        default=30.0,
        description="Maximum audio duration"
    )
    supported_audio_formats: List[str] = Field(
        default=["wav", "mp3", "ogg", "flac", "m4a"],
    )
    sample_rate: int = Field(default=16000)

    # ============ AGORA RTC ============
    agora_app_id: str = Field(default="")
    agora_app_certificate: str = Field(default="")
    agora_customer_id: str = Field(default="")
    agora_customer_secret: str = Field(default="")

    # ============ LLM (EXPLAINABILITY) ============
    deepseek_api_key: str = Field(default="")
    deepseek_base_url: str = Field(
        default="https://api.deepseek.com/v1"
    )

    # ============ GOOGLE EARTH ENGINE ============
    gee_project_id: str = Field(default="")
    gee_private_key_path: Optional[str] = Field(default=None)

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

#### Step 4.2: Update idle_land_api.py
```python
# backend/idle_land_api.py (UPDATED)
from config import get_settings

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# Remove hardcoded config
# DATABASE_URL = os.getenv(...)  ❌ DELETE
# Use: DATABASE_URL = settings.database_url  ✅
```

#### Step 4.3: Update Cultivator Config References
```python
# backend/cultivator/core/config.py
# CHANGE: from app.core.config import get_settings
# TO:     from config import get_settings
```

**Deliverable:** Single unified `backend/config.py` used by both systems.

---

### PHASE 5: IMPORT PATH UPDATES (Day 5)

#### Step 5.1: Fix Cultivator Module Imports
```python
# File: backend/cultivator/**/*.py
# Replace imports RECURSIVELY

OLD:                                 NEW:
from app.core.config                from config
from app.services.inference         from cultivator.services.inference
from app.api.v1.endpoints           from cultivator.api.v1.endpoints
from app.schemas.prediction         from cultivator.schemas.prediction
from app.core.database              from cultivator.core.database
```

**Tool Script (Python):**
```python
import os
import re

def fix_imports_in_dir(directory):
    replacements = {
        r"from app\.": "from cultivator.",
        r"import app\.": "import cultivator.",
    }
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                for old, new in replacements.items():
                    content = re.sub(old, new, content)
                
                with open(filepath, 'w') as f:
                    f.write(content)

fix_imports_in_dir("backend/cultivator")
```

#### Step 5.2: Fix Model/Data Path References
```python
# File: backend/cultivator/services/inference.py
# CHANGE: models_dir = Path("models")
# TO:     models_dir = Path("models/intent_prediction")

# CHANGE: "intent_risk_model.pkl"
# TO:     "models/intent_prediction/intent_risk_model.pkl"
```

#### Step 5.3: Test Imports
```bash
cd backend
python -c "from cultivator.services.inference import IntentRiskClassifier; print('✅ Import OK')"
python -c "from marketplace.models import LandListing; print('✅ Import OK')"
```

**Deliverable:** All imports resolve correctly (no ModuleNotFoundError).

---

### PHASE 6: APPLICATION ENTRY POINT MERGING (Day 5-6)

#### Step 6.1: Refactor idle_land_api.py

**Option A: Minimal Changes (RECOMMENDED for this phase)**

```python
# backend/idle_land_api.py (UPDATED - VERSION 3.0.0)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import get_settings
from marketplace.database import engine, get_db, Base as MarketplaceBase
from cultivator.core.database import connect_db, close_db
from cultivator.api.v1.routes import router as cultivator_router

settings = get_settings()

# ============ STARTUP / SHUTDOWN ============

@app.on_event("startup")
async def startup():
    # PostgreSQL tables
    MarketplaceBase.metadata.create_all(bind=engine)
    print("✅ PostgreSQL (Marketplace) ready")
    
    # MongoDB connection
    await connect_db()
    print("✅ MongoDB (Cultivator) ready")

@app.on_event("shutdown")
async def shutdown():
    await close_db()
    print("✅ Shutdown complete")


# ============ FASTAPI APP ============

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Smart Agri Suite - Land Marketplace + Cultivator Intent Analysis"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Media serving
os.makedirs("media/photos", exist_ok=True)
os.makedirs("media/docs", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")


# ============ CULTIVATOR ROUTES ============

app.include_router(cultivator_router)


# ============ MARKETPLACE ROUTES (keep inline or move to marketplace/routes.py) ============

# ... existing routes from old idle_land_api.py ...
# (Keep as-is for now during Phase 1)

@app.get("/")
async def health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version
    }

@app.post("/auth/register")
async def register(...):
    # ... existing code ...
    pass

@app.post("/auth/login")
async def login(...):
    # ... existing code ...
    pass

# ... all other marketplace endpoints ...
```

#### Step 6.2: Verify Both Route Sets Work
```bash
cd backend
python -m uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000
```

**Test Endpoints:**
```bash
# Marketplace (existing)
curl http://localhost:8000/
curl -X POST http://localhost:8000/auth/register

# Cultivator (new)
curl http://localhost:8000/api/v1/health
curl -X POST http://localhost:8000/api/v1/predict/upload
```

**Deliverable:** Single FastAPI server running both marketplace + cultivator routes.

---

### PHASE 7: DATABASE CONNECTION VERIFICATION (Day 6)

#### Step 7.1: Test PostgreSQL Connection
```bash
cd backend
python << 'EOF'
from config import get_settings
from marketplace.database import SessionLocal

try:
    db = SessionLocal()
    db.execute("SELECT 1")
    print("✅ PostgreSQL connected")
    db.close()
except Exception as e:
    print(f"❌ PostgreSQL error: {e}")
EOF
```

#### Step 7.2: Test MongoDB Connection
```bash
cd backend
python << 'EOF'
import asyncio
from cultivator.core.database import connect_db, get_db

async def test():
    await connect_db()
    db = get_db()
    result = await db.command("ping")
    print(f"✅ MongoDB connected: {result}")

asyncio.run(test())
EOF
```

**Deliverable:** Both databases confirmed working.

---

### PHASE 8: TESTING & VALIDATION (Day 7)

#### Step 8.1: Run Marketplace Tests
```bash
cd backend
pytest tests/ -v --tb=short
```

#### Step 8.2: Run Cultivator Tests
```bash
cd backend
pytest tests/cultivator/ -v --tb=short
```

#### Step 8.3: Manual API Testing
```bash
# Create requests.http or use Postman

# Test 1: Marketplace - Land Analysis
POST http://localhost:8000/aoi/analyze
Content-Type: application/json

{
  "polygon": {"type": "Polygon", "coordinates": [...]}
}

# Test 2: Cultivator - Intent Prediction
POST http://localhost:8000/api/v1/predict/upload
Content-Type: multipart/form-data

audio_file=@sample.wav

# Test 3: Health Check (both systems)
GET http://localhost:8000/health
GET http://localhost:8000/api/v1/health
```

**Deliverable:** All tests passing, manual API calls working.

---

### PHASE 9: DOCUMENTATION & CLEANUP (Day 8)

#### Step 9.1: Update README.md
```markdown
# Smart Agri Suite - Unified Backend (v3.0.0)

Now includes both:
1. **Land Marketplace** - GEE + XGBoost land classification
   - Endpoints: /aoi/*, /analyze/*, /marketplace/*, /auth/*

2. **Cultivator Intention Analysis** - Voice intent prediction
   - Endpoints: /api/v1/recall/*, /api/v1/interviews/*, /api/v1/calls/*

## Setup

1. Install dependencies:
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt

2. Configure environment:
   cp .env.example .env
   # Fill in DATABASE_URL, MONGODB_URL, AGORA_*, GEE_*

3. Start server:
   python -m uvicorn idle_land_api:app --reload --port 8000
```

#### Step 9.2: Archive Old Folder
```bash
# Move original cultivator folder to archive (keep as reference)
mkdir -p archive
mv _cultivator_intention_analyzer archive/_cultivator_intention_analyzer.backup.20260308
```

#### Step 9.3: Update .gitignore
```bash
# Add new directories
*.pkl
models/
data/
```

#### Step 9.4: Create MIGRATION.log
```
MIGRATION_LOG.md:

Date: March 8, 2026
Status: ✅ COMPLETE

Changes:
- Moved _cultivator_intention_analyzer/backend/app/* → backend/cultivator/
- Reorganized models/ directory (land_classification/ + intent_prediction/)
- Merged requirements.txt (60+ packages)
- Created unified config.py (Pydantic BaseSettings)
- Refactored idle_land_api.py to include cultivator routes
- Fixed 150+ import statements
- PostgreSQL + MongoDB both operational

Testing:
- ✅ Marketplace endpoints: /aoi/*, /marketplace/*, /auth/*
- ✅ Cultivator endpoints: /api/v1/predict/*, /api/v1/calls/*, etc.
- ✅ Both databases: PostgreSQL + MongoDB
- ✅ All tests passing

Next Steps:
- Deploy to staging
- Run integration tests
- Update mobile frontend URLs (if applicable)
```

**Deliverable:** Cleaned repository, documented migration, old module archived.

---

### PHASE 10: FINAL CLEANUP & DEPLOYMENT (Day 9)

#### Step 10.1: Remove Cultivator Frontend (Optional for Phase 1)
```bash
# Determine if separate frontend needed
# If keeping as independent:
#   Keep: _cultivator_intention_analyzer/frontend/ (unchanged)
#   App calls: http://backend:8000/api/v1/*
# If merging later:
#   rm -rf _cultivator_intention_analyzer/frontend/
```

#### Step 10.2: Final Git Commit
```bash
git add -A
git commit -m "feat: Merge cultivator intention analyzer module into main backend

- Move cultivator backend (app/) to backend/cultivator/
- Reorganize models/ and data/ by domain
- Merge requirements.txt (pinned versions)
- Create unified config.py (Pydantic BaseSettings)
- Refactor idle_land_api.py to include cultivator routes
- Fix 150+ import paths (app.* → cultivator.*)
- Both PostgreSQL (marketplace) + MongoDB (intent) operational
- All endpoints functional (/aoi/*, /marketplace/*, /api/v1/*)

BREAKING: 
- Old cultivator standalone server (port 8000) no longer runs
- All cultivator APIs now at /api/v1/* under unified backend

Migration: See MIGRATION_ANALYSIS.md"

git push origin feature/merge-cultivator-module
```

#### Step 10.3: Create Pull Request
```
Title: Merge Cultivator Intention Analyzer into Main Backend

Description:
Consolidates the standalone _cultivator_intention_analyzer module into the main 
Smart Agri Suite backend. This enables:

1. Single unified API server (eliminates dual server management)
2. Shared authentication (JWT + MongoDB)
3. Shared configuration management
4. Simplified deployment (one venv, one requirements.txt)

Architecture:
- backend/cultivator/ → Intention analysis module
- backend/models/{land_classification,intent_prediction}/
- backend/data/{land_classification,intention_analysis}/
- Unified idle_land_api.py entry point (now on port 8000)

Impact:
- ✅ No breaking changes to marketplace features
- ✅ Cultivator APIs at /api/v1/* namespace [RFC 3986 compliant]
- ✅ Both PostgreSQL (marketplace) + MongoDB (intent) connected
- ⚠️ Requires .env update (MONGODB_URL, AGORA_*, additional models)

Testing:
- Marketplace: POST /auth/register, GET /marketplace/listings
- Cultivator: GET /api/v1/health, POST /api/v1/predict/upload
- Both DB connections verified

See: MIGRATION_ANALYSIS.md for detailed architecture
```

#### Step 10.4: Deploy to Staging
```bash
git pull origin feature/merge-cultivator-module
cd backend
pip install -r requirements.txt
uvicorn idle_land_api:app --port 8000
```

**Deliverable:** Merged feature branch, PR created, staging deployment ready.

---

## POTENTIAL RISKS & MITIGATION

### Risk 1: Import Path Chaos 🔴 HIGH

**Problem:** 150+ files with `from app.` imports won't resolve after moving to `backend/cultivator/`.

**Severity:** CRITICAL - Code won't run

**Mitigation:**
- ✅ Use automated script to fix imports (Step 5.1)
- ✅ Test each module independently before merge
- ✅ Use IDE refactoring tools (PyCharm rename > Move refactoring)

**Prevention:**
```python
# Verify imports before commit
python -m py_compile backend/cultivator/**/*.py
# OR
python -m pytest --collect-only tests/cultivator/
```

---

### Risk 2: Database Connection Deadlock 🟡 MEDIUM

**Problem:** Two async systems (PostgreSQL sync + MongoDB async) may conflict.

**Scenario:**
```python
# idle_land_api.py startup
on_event("startup"):
    ├── Create PostgreSQL tables (sync)        ← OK
    └── await connect_db()                     ← Async, may not await properly
```

**Severity:** MEDIUM - Marketplace works, cultivator may not

**Mitigation:**
- ✅ Use unified lifespan manager (async context)
- ✅ Test both connections separately, then together
- ✅ Add timeouts to MongoDB connection

**Prevention:**
```python
# Use FastAPI lifespan (Python 3.10+)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    MarketplaceBase.metadata.create_all(bind=engine)
    yield
    # Shutdown
    await close_db()

app = FastAPI(lifespan=lifespan)
```

---

### Risk 3: Dependency Conflicts 🟡 MEDIUM

**Problem:** librosa (500MB+) + opencv + scipy may cause install issues.

**Severity:** MEDIUM - Installation may fail or take 30+ minutes

**Mitigation:**
- ✅ Pin versions explicitly (`==` not `>=`)
- ✅ Test pip install in clean venv
- ✅ Consider `opencv-python-headless` for server

**Prevention:**
```bash
# Clean install test
python -m venv test_env
test_env/Scripts/activate
pip install -r requirements.txt --no-cache-dir
```

---

### Risk 4: Model Path Misconfiguration 🟡 MEDIUM

**Problem:** ML models at `models/*.pkl` won't be found after moving to `models/intent_prediction/*.pkl`.

**Severity:** MEDIUM - Cultivator features fail at runtime

**Mitigation:**
- ✅ Update all model path references in Step 5.2
- ✅ Use `get_settings().intent_model_path`
- ✅ Test model loading before deployment

**Prevention:**
```python
from config import get_settings
settings = get_settings()
model_path = settings.intent_model_path  # ✅ Use settings

# NOT: model_path = "models/intent_risk_model.pkl"  ❌ Hardcoded
```

---

### Risk 5: Auth System Conflicts 🟡 MEDIUM

**Problem:** Two auth implementations may interfere (auth_utils.py vs. cultivator/core/auth.py).

**Severity:** MEDIUM - Users may not authenticate properly

**Mitigation:**
- ✅ Keep auth_utils.py for marketplace (backward compat)
- ✅ Refactor cultivator auth to use shared JWT logic
- ✅ Test login with both systems

**Prevention:**
```python
# auth_utils.py (keep)
def verify_password(plain, hashed): ...
def create_token(user_id): ...

# cultivator/core/auth.py (delegate)
from auth_utils import verify_password, create_token  # ✅ Reuse
```

---

### Risk 6: CORS Policy Violations 🟡 MEDIUM

**Problem:** Frontend may be blocked if CORS not configured correctly for both systems.

**Severity:** MEDIUM - API calls fail from browser/app

**Mitigation:**
- ✅ Keep `allow_origins=["*"]` during dev
- ✅ Restrict in production with explicit origins
- ✅ Test CORS from mobile app

**Prevention:**
```python
# idle_land_api.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # ✅ From config
)

# .env.example
CORS_ORIGINS=["http://localhost:8080", "http://localhost:19006"]
```

---

### Risk 7: Port Conflicts 🟟 LOW

**Problem:** If developer forgets to move cultivator, `uvicorn` tries to bind port 8000 twice.

**Severity:** LOW - Clear error message

**Mitigation:**
- ✅ Archive old folder immediately after move
- ✅ Git ignore rules prevent accidental runs
- ✅ Document startup procedure

**Prevention:**
```bash
# Make sure this runs:
git rm --cached _cultivator_intention_analyzer/
git add .gitignore  # Already excludes node_modules, .venv, etc.
```

---

### Risk 8: Frontend API URL Updates 🟡 MEDIUM

**Problem:** Mobile app may still call `http://localhost:8000` for cultivator APIs (if separate server previously).

**Severity:** MEDIUM - Feature doesn't work, but EASY FIX

**Mitigation:**
- ✅ Cultivator endpoints at `/api/v1/*` (same host)
- ✅ No frontend changes needed (it already calls same backend)
- ✅ If separate cultivator app: ensure it points to unified backend

**Prevention:**
```typescript
// services/cultivatorApi.ts (already points to same host)
const API_BASE = "http://192.168.x.x:8000"

// Will work for both:
POST /marketplace/listings  (existing)
POST /api/v1/predict/upload (new)
```

---

### Risk 9: Testing Coverage Gaps 🟡 MEDIUM

**Problem:** Cultivator tests may fail if they expect isolated environment.

**Severity:** MEDIUM - CI/CD may block merge

**Mitigation:**
- ✅ Run cultivator tests independently first
- ✅ Fix any database connection issues
- ✅ Update test fixtures for shared DB

**Prevention:**
```bash
# Test each system in isolation
pytest tests/marketplace/ -v
pytest tests/cultivator/ -v

# Then together
pytest tests/ -v
```

---

### Risk 10: Performance Degradation 🟟 LOW

**Problem:** Single Uvicorn process now handles 2x endpoints; memory/CPU may increase.

**Severity:** LOW - Acceptable for development; monitor in production

**Mitigation:**
- ✅ Monitor Uvicorn memory usage
- ✅ Consider multi-worker deployment
- ✅ Optimize slow endpoints

**Prevention:**
```bash
# Run with multiple workers in production
python -m uvicorn idle_land_api:app --workers 4 --port 8000

# Monitor
watch -n 1 'ps aux | grep uvicorn'
```

---

## RECOMMENDED INTEGRATION STRATEGY

### Architecture Recommendation

```
┌─────────────────────────────────────────────────────────────┐
│  Smart Agri Suite - Merged Backend (Recommended)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FastAPI Application (idle_land_api.py)                     │
│  ├─ Framework: FastAPI 0.109.2 + Uvicorn 0.27.1           │
│  ├─ Port: 8000                                             │
│  └─ Lifespan: Async context manager (startup/shutdown)     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Middleware Stack                                       │ │
│  ├─ CORS (allow all origins during dev)                  │ │
│  ├─ Correlation ID (cultivator's best practice)          │ │
│  ├─ Request Logging (structured JSON)                    │ │
│  └─ Error Handling (unified)                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Route Modules (included in main router)                │ │
│  ├─ /marketplace/*      [Marketplace CRUD]                │ │
│  ├─ /aoi/*             [AOI Analysis]                    │ │
│  ├─ /analyze/*          [GEE + XGBoost]                  │ │
│  ├─ /auth/*            [JWT Auth (shared)]               │ │
│  ├─ /admin/*           [Admin Dashboard]                 │ │
│  ├─ /api/v1/health     [Cultivator Health]               │ │
│  ├─ /api/v1/predict/*  [Intent Prediction]               │ │
│  ├─ /api/v1/calls/*    [Agora RTC Integration]           │ │
│  ├─ /api/v1/interviews/* [Interview Management]          │ │
│  └─ /api/v1/explain/*  [SHAP Explainability]             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Configuration System (unified)                         │ │
│  ├─ config.py (Pydantic BaseSettings)                    │ │
│  ├─ .env (single source of truth)                        │ │
│  └─ All settings inherited by both modules                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Database Connections                                   │ │
│  ├─ PostgreSQL (Marketplace)                             │ │
│  │   └─ SQLAlchemy ORM + GeoAlchemy2                    │ │
│  │   └─ Tables: land_listings, restricted_zones, etc    │ │
│  │                                                       │ │
│  ├─ MongoDB (Cultivator Intent)                          │ │
│  │   └─ Motor (async driver)                            │ │
│  │   └─ Collections: calls, interviews, users            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Model & Data Artifacts                                │ │
│  ├─ models/land_classification/                         │ │
│  │   └─ xgb_land_classifier.pkl                         │ │
│  ├─ models/intent_prediction/                           │ │
│  │   ├─ intent_risk_model.pkl                           │ │
│  │   ├─ intent_risk_scaler.pkl                          │ │
│  │   └─ intent_risk_label_encoder.pkl                  │ │
│  ├─ models/video_analysis/ (Gate 2)                    │ │
│  ├─ data/land_classification/                          │ │
│  └─ data/intention_analysis/                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘


Frontend Layer (Unchanged)
┌─────────────────────────────────────┐
│ Smart Agri Suite Mobile App          │
│ (Marketplace + Land Analysis)        │
├─────────────────────────────────────┤
│ React Native / Expo / TypeScript     │
│ (Calls Marketplace API endpoints)    │
└─────────────────────────────────────┘
        │
        └──► http://backend:8000/marketplace/*
             http://backend:8000/aoi/*
             http://backend:8000/auth/*

┌─────────────────────────────────────┐
│ Cultivator Interview App             │
│ (Independent, Optional)              │
├─────────────────────────────────────┤
│ React Native / Expo / TypeScript     │
│ (Calls Cultivator API endpoints)     │
└─────────────────────────────────────┘
        │
        └──► http://backend:8000/api/v1/calls/*
             http://backend:8000/api/v1/predict/*
             http://backend:8000/api/v1/interviews/*
```

### Key Principles

1. **Single Responsibility:** Marketplace ≠ Intent analysis (separate modules, one server)
2. **Unified Configuration:** One .env file, one config.py
3. **Backward Compatibility:** Old marketplace routes unchanged at version 3.0.0
4. **Scalability:** Can split to microservices later if needed
5. **Testability:** Both modules tested independently + together

### Deployment Checklist

- [ ] All imports resolve (no ModuleNotFoundError)
- [ ] Both databases connected at startup
- [ ] All tests passing (marketplace + cultivator)
- [ ] Manual API testing complete
- [ ] CORS properly configured
- [ ] Model loading verified
- [ ] Logging structured and working
- [ ] Performance acceptable (CPU/memory)
- [ ] Documentation updated
- [ ] Git history clean

---

## SUMMARY

| Phase | Duration | Deliverable | Risk Level |
|-------|----------|-------------|-----------|
| 1. Preparation | 1-2 days | Branch, backup, structure | 🟢 LOW |
| 2. File Migration | 1 day | Files moved to cultivator/ | 🟢 LOW |
| 3. Dependencies | 1 day | Merged requirements.txt | 🟡 MEDIUM |
| 4. Configuration | 1 day | Unified config.py | 🟡 MEDIUM |
| 5. Import Fixes | 1 day | Import paths updated | 🔴 HIGH |
| 6. Entry Point | 1-2 days | Single API server | 🟡 MEDIUM |
| 7. DB Verification | 0.5 days | Both DBs working | 🟡 MEDIUM |
| 8. Testing | 1 day | All tests passing | 🟢 LOW |
| 9. Documentation | 1 day | Updated docs & changelog | 🟢 LOW |
| 10. Deployment | 1 day | Staging ready | 🟢 LOW |
| **TOTAL** | **~9 days** | **Unified Backend v3.0.0** | **MEDIUM** |

---

**Generated:** March 8, 2026  
**Status:** ✅ READY FOR IMPLEMENTATION  
**Next Step:** Execute PHASE 1 (Create feature branch)
