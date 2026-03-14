from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Tuple, Any, Optional, AsyncGenerator
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
import asyncio
from contextlib import asynccontextmanager

load_dotenv()

import json  
import numpy as np
import joblib
from io import BytesIO
from PIL import Image
from functools import lru_cache
from datetime import datetime, timezone

import rasterio
from rasterio.enums import Resampling
from rasterio.features import rasterize, geometry_mask
from rasterio.transform import from_bounds
from rasterio.windows import from_bounds as window_from_bounds

from shapely.geometry import shape, Point, Polygon, mapping
import mercantile

# --- Marketplace imports ---
from marketplace.database import engine, get_db, Base as MarketplaceBase
from marketplace import models as mp_models
from marketplace import schemas as mp_schemas
from marketplace import crud as mp_crud
from cultivator.api.v1.routes import router as cultivator_router
from agora_service import router as agora_router
from cultivator.services.agora import validate_agora_credentials_at_startup

# --- Cultivator database imports ---
from cultivator.core.database import connect_db as cultivator_connect_db, close_db as cultivator_close_db

# --- Auth imports ---
from auth_utils import (
    get_mongo_db, close_mongo,
    hash_password, verify_password,
    create_token, verify_token,
    get_current_user_id, require_auth,
    user_doc_to_response,
    UserRegister, UserLogin,
)
from bson import ObjectId
import gee_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    Handles startup and shutdown events for unified backend.
    """
    # Startup
    print("=" * 60)
    print("🚀 STARTING UNIFIED BACKEND")
    print("=" * 60)
    
    # Create marketplace tables
    try:
        MarketplaceBase.metadata.create_all(bind=engine)
        print("✅ Marketplace tables ready")
    except Exception as e:
        print(f"⚠️ Could not create marketplace tables: {e}")

    # Initialize cultivator MongoDB connection (async)
    try:
        await cultivator_connect_db()
        print("✅ Cultivator MongoDB connection initialized")
    except Exception as e:
        print(f"⚠️ Cultivator MongoDB initialization failed: {e}")
        print("   Cultivator auth endpoints will not work until MongoDB is available")

    # Validate Agora credentials and token generation at startup.
    try:
        validate_agora_credentials_at_startup()
        print("✅ Agora credentials/token generation validated")
    except Exception as e:
        print(f"❌ Agora startup validation failed: {e}")
        raise RuntimeError(f"Failed to start application: Agora credentials invalid - {e}")

    # Pre-warm legacy MongoDB connection (for old auth_utils)
    try:
        get_mongo_db()
        print("✅ Legacy MongoDB connection ready")
    except Exception as e:
        print(f"⚠️ Legacy MongoDB not available: {e}")
    
    print("=" * 60)
    print("✅ Backend startup complete")
    print("=" * 60)
    
    yield
    
    # Shutdown
    print("\n" + "=" * 60)
    print("🛑 SHUTTING DOWN UNIFIED BACKEND")
    print("=" * 60)
    await cultivator_close_db()
    await close_mongo()
    print("✅ Shutdown complete")
    print("=" * 60)


app = FastAPI(
    title="Idle Land Mobilization API",
    version="2.3.0",
    lifespan=lifespan
)

# Cultivator module routes mounted under unified backend namespace.
app.include_router(
    cultivator_router,
    prefix="/cultivator",
    tags=["cultivator"],
)

app.include_router(agora_router)

# === RUNTIME DIAGNOSTICS MIDDLEWARE (Temporary) ===
@app.middleware("http")
async def log_requests(request, call_next):
    """Log incoming HTTP requests for debugging."""
    import time
    start_time = time.time()
    print(f"[BACKEND REQUEST] {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        print(f"[BACKEND RESPONSE] {response.status_code} {request.method} {request.url.path} ({duration:.3f}s)")
        return response
    except Exception as e:
        duration = time.time() - start_time
        print(f"[BACKEND ERROR] {request.method} {request.url.path} - {str(e)}")
        raise

# CORS — allow all origins for mobile app development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory for static file serving
os.makedirs("media/photos", exist_ok=True)
os.makedirs("media/docs", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")


MODEL_PATH_PRIMARY = os.path.join("model", "xgb_land_classifier.pkl")
MODEL_PATH_FALLBACK = os.path.join("models", "idle_land_model.pkl")

CLASSIFIED_TIF = os.path.join("rasters", "malabe_classified_map.tif")
FEATURES_TIF = os.path.join("rasters", "malabe_feature_stack.tif")

FEATURES = [
    "NDVI", "EVI", "SAVI", "NDWI",
    "ELEV", "SLOPE", "ASPECT",
    "B2", "B3", "B4", "B8",
    "NDVI_mean_3x3", "NDVI_std_3x3",
    "NIR_mean_3x3", "NIR_std_3x3",
]

CLASS_MAP = {0: "IDLE_LAND", 1: "VEGETATION_LAND", 2: "BUILT_LAND"}

PALETTE = {
    0: (139, 69, 19, 220),     
    1: (34, 139, 34, 220),     
    2: (128, 128, 128, 220),   
}

SPICES = ["Cinnamon", "Pepper", "Clove", "Cardamom", "Nutmeg"]

AOI_GEOJSON = {
    "type": "Polygon",
    "coordinates": [[
        [79.94847437720033, 6.905724758312024],
        [79.9456419644806, 6.904531844591811],
        [79.9427237210724, 6.904020594933855],
        [79.94152209143373, 6.9015495471341906],
        [79.94229456763001, 6.89933411400196],
        [79.9430670438263, 6.89720388006121],
        [79.94358202795716, 6.894647586686282],
        [79.94469782690736, 6.892091279520405],
        [79.94572779516908, 6.89055748860333],
        [79.9467577634308, 6.889534958568604],
        [79.94838854651185, 6.889961013017721],
        [79.95019099096986, 6.890301856301371],
        [79.95165011267396, 6.888682848521999],
        [79.95396754126283, 6.8883420040746595],
        [79.95568415503236, 6.886467355236092],
        [79.9577440915558, 6.885870874506584],
        [79.95988985876771, 6.884081427818913],
        [79.96297976355287, 6.883144095908589],
        [79.96572634558412, 6.883399732067721],
        [79.96804377417298, 6.884251851603701],
        [79.97010371069642, 6.883058883824962],
        [79.97267863135072, 6.883058883824962],
        [79.9742235837433, 6.885530028038754],
        [79.97576853613587, 6.8884272152094645],
        [79.97817179541322, 6.890387067084],
        [79.98048922400208, 6.892687752425709],
        [79.98074671606751, 6.895329266268259],
        [79.97980257849427, 6.898567230887149],
        [79.98048922400208, 6.9019755907786955],
        [79.98134753088685, 6.907769746262283],
        [79.98313695728268, 6.912228888815047],
        [79.98438150226559, 6.91646457059225],
        [79.98317987262692, 6.918126086220445],
        [79.981034105415, 6.918168689108402],
        [79.97506887256588, 6.917572248327208],
        [79.97446805774655, 6.921108279093947],
        [79.97202188312497, 6.9232810077520535],
        [79.96927530109372, 6.922215945934245],
        [79.96627122699704, 6.922982790685385],
        [79.96335298358883, 6.924686885670482],
        [79.96052057086911, 6.922940188231891],
        [79.95931894123044, 6.9199580069316005],
        [79.95794565021481, 6.918765129136236],
        [79.95584279834713, 6.917572248327208],
        [79.95652944385495, 6.915484699661326],
        [79.95721608936276, 6.913354538452102],
        [79.95657235919919, 6.911394781658595],
        [79.95459825336422, 6.911437385153542],
        [79.95163709461178, 6.911522592131959],
        [79.95116502582516, 6.909605431403038],
        [79.95198041736569, 6.9078586781929765],
        [79.95014156264016, 6.907175156503279],
        [79.94847437720033, 6.905724758312024]
    ]]
}
AOI_SHAPE = shape(AOI_GEOJSON)


# ==================== REQUEST SCHEMAS ====================
class PredictRequest(BaseModel):
    input: Dict[str, float]


class PolygonAnalysisRequest(BaseModel):
    coordinates: List[List[float]]  # [[lng, lat], [lng, lat], ...]


# ==================== ENDPOINTS ====================
@app.get("/")
def root():
    return {
        "ok": True,
        "service": "idle-land-mobilization",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH_PRIMARY if os.path.exists(MODEL_PATH_PRIMARY) else MODEL_PATH_FALLBACK,
    }


# ==================== AUTH ENDPOINTS ====================
@app.post("/api/v1/auth/register")
async def auth_register(data: UserRegister):
    """Register a new user (stores in MongoDB)."""
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    now = datetime.now(timezone.utc)
    normalized_role = "client" if data.role == "farmer" else data.role
    user_doc = {
        "fullName": data.fullName,
        "username": data.username,
        "email": data.email,
        "address": data.address,
        "age": data.age,
        "role": normalized_role,
        "passwordHash": hash_password(data.password),
        "createdAt": now,
        "updatedAt": now,
    }

    await db.users.insert_one(user_doc)
    print(f"✅ User registered: {data.username} (role: {normalized_role})")

    return JSONResponse({"success": True, "message": "Registration successful. Please login."})


@app.post("/api/v1/auth/login")
async def auth_login(data: UserLogin):
    """Login and get JWT token."""
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = await db.users.find_one({"username": data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(
        user_id=str(user["_id"]),
        username=user["username"],
        role=user["role"],
    )

    print(f"✅ User logged in: {data.username}")

    return JSONResponse({
        "token": token,
        "user": user_doc_to_response(user),
    })


@app.get("/api/v1/auth/me")
async def auth_me(user_id: str = Depends(require_auth)):
    """Get current user from token."""
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return JSONResponse(user_doc_to_response(user))


# ==================== MY LISTINGS ====================
@app.get("/api/listings/my")
def get_my_listings(
    db: Session = Depends(get_db),
    user_id: str = Depends(require_auth),
):
    """Get listings belonging to the currently authenticated user."""
    listings = mp_crud.get_listings_by_user(db, user_id)
    results = []
    for l in listings:
        pred_label = None
        if l.analytics:
            pred_label = l.analytics.prediction_label
        results.append({
            "id": l.id,
            "title": l.title,
            "owner_name": l.owner_name,
            "verification_code": l.verification_code,
            "area_acres": l.area_acres,
            "area_hectares": l.area_hectares,
            "listing_purpose": l.listing_purpose.value if l.listing_purpose else None,
            "status": l.status.value if l.status else None,
            "expected_price": l.expected_price,
            "admin_comment": l.admin_comment,
            "submitted_at": l.submitted_at.isoformat() if l.submitted_at else None,
            "analytics": {"prediction_label": pred_label} if pred_label else None,
            "photos": [
                {"id": p.id, "url": p.url, "is_primary": p.is_primary}
                for p in (l.photos or [])
            ],
        })
    return JSONResponse({"ok": True, "count": len(results), "listings": results})


@app.get("/aoi")
def get_aoi():
    return {"ok": True, "aoi": AOI_GEOJSON}


@app.post("/predict")
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not found")

    for f in FEATURES:
        if f not in req.input:
            raise HTTPException(status_code=400, detail=f"Missing feature: {f}")

    X = np.array([req.input[f] for f in FEATURES], dtype=float).reshape(1, -1)
    pred = int(model.predict(X)[0])

    probs = None
    conf = None
    if hasattr(model, "predict_proba"):
        p = model.predict_proba(X)[0]
        probs = {"idle_land": float(p[0]), "vegetation_land": float(p[1]), "built_land": float(p[2])}
        conf = float(max(p))

    return {"prediction": pred, "label": CLASS_MAP.get(pred, "UNKNOWN"), "probabilities": probs, "confidence": conf}


@app.get("/aoi/inspect")
def aoi_inspect(lat: float, lng: float):
    try:
        return JSONResponse(_inspect_point(lat, lng))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Missing raster: {FEATURES_TIF}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inspect failed: {str(e)}")


def _run_polygon_analysis(coords: List[List[float]]) -> Dict[str, Any]:
    """
    Shared helper: run full ML analysis on a polygon.
    Used by both /aoi/analyze-polygon and /api/listings/create.
    Returns a dict with area, stats, prediction, composition, intelligence.
    """
    if not isinstance(coords, list) or len(coords) < 3:
        raise HTTPException(status_code=400, detail="At least 3 coordinates required.")

    try:
        poly = Polygon(coords)
        if not poly.is_valid or poly.area == 0:
            raise HTTPException(status_code=400, detail="Invalid polygon geometry.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Polygon error: {str(e)}")

    # --- Area ---
    area_hectares = None
    area_acres = None
    area_m2 = None
    try:
        from pyproj import Geod
        g = Geod(ellps="WGS84")
        raw_area, _ = g.geometry_area_perimeter(poly)
        area_m2 = float(abs(raw_area))
        area_hectares = area_m2 / 10000
        area_acres = area_m2 / 4046.86
    except Exception as e:
        print(f"⚠️ Area calculation error: {e}")

    # --- Raster features ---
    try:
        ds = _open_features_ds()
        band_names = _band_names()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Missing raster: {FEATURES_TIF}")

    try:
        mask = geometry_mask(
            [poly], out_shape=(ds.height, ds.width),
            transform=ds.transform, invert=True, all_touched=True,
        ).astype(bool)
        pixel_count = int(np.sum(mask))
        if pixel_count == 0:
            raise HTTPException(status_code=400, detail="Polygon covers no raster pixels.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Masking error: {str(e)}")

    all_bands = []
    for i in range(ds.count):
        all_bands.append(ds.read(i + 1).astype("float32"))

    # --- Statistics ---
    stats: Dict[str, Dict[str, Optional[float]]] = {}
    for i, name in enumerate(band_names):
        if i < len(all_bands):
            valid = all_bands[i][mask]
            valid = valid[np.isfinite(valid)]
            if valid.size > 0:
                stats[name] = {"mean": float(np.mean(valid)), "min": float(np.min(valid)),
                               "max": float(np.max(valid)), "std": float(np.std(valid))}
            else:
                stats[name] = {"mean": None, "min": None, "max": None, "std": None}
        else:
            stats[name] = {"mean": None, "min": None, "max": None, "std": None}

    # --- ML classification ---
    pred = None; probs = None; confidence = None; label = "UNKNOWN"
    if model is not None and all(k in stats and stats[k]["mean"] is not None for k in FEATURES):
        try:
            X = np.array([stats[f]["mean"] if stats[f]["mean"] is not None else 0.0
                          for f in FEATURES], dtype=float).reshape(1, -1)
            pred = int(model.predict(X)[0])
            label = CLASS_MAP.get(pred, "UNKNOWN")
            if hasattr(model, "predict_proba"):
                p = model.predict_proba(X)[0]
                probs = {"idle_land": float(p[0]), "vegetation_land": float(p[1]), "built_land": float(p[2])}
                confidence = float(max(p))
        except Exception as e:
            print(f"⚠️ Model prediction error: {e}")

    # --- Composition ---
    composition = {"vegetation_pct": 0, "idle_pct": 0, "built_pct": 0}
    try:
        with rasterio.open(CLASSIFIED_TIF) as ds_cls:
            cls_mask = geometry_mask(
                [poly], out_shape=(ds_cls.height, ds_cls.width),
                transform=ds_cls.transform, invert=True, all_touched=True,
            ).astype(bool)
            cls_data = ds_cls.read(1)[cls_mask]
            total = cls_data.size
            if total > 0:
                composition = {
                    "vegetation_pct": float(np.sum(cls_data == 1) / total * 100),
                    "idle_pct": float(np.sum(cls_data == 0) / total * 100),
                    "built_pct": float(np.sum(cls_data == 2) / total * 100),
                }
    except Exception as e:
        print(f"⚠️ Composition error: {e}")

    # --- Spice suitability ---
    spices_list: List[Dict[str, Any]] = []
    try:
        feats_dict = {k: stats[k]["mean"] if k in stats else None for k in FEATURES}
        for spice_name in SPICES:
            spices_list.append(_evaluate_spice(spice_name, feats_dict, label))
    except Exception as e:
        print(f"⚠️ Spice evaluation error: {e}")

    # --- Intercropping ---
    try:
        feats_dict = {k: stats[k]["mean"] if k in stats else None for k in FEATURES}
        intercropping = _intercropping(spices_list, feats_dict)
    except Exception:
        intercropping = {"good_pairs": [], "avoid_pairs": [], "notes": []}

    # --- Health ---
    try:
        feats_dict = {k: stats[k]["mean"] if k in stats else None for k in FEATURES}
        health = _health_summary(feats_dict, label)
    except Exception:
        health = {"headline": "Unable to calculate health summary", "tags": []}

    return {
        "ok": True,
        "polygon": coords,
        "area_m2": area_m2,
        "area_hectares": round(area_hectares, 2) if area_hectares else None,
        "area_acres": round(area_acres, 2) if area_acres else None,
        "pixel_count": pixel_count,
        "statistics": stats,
        "prediction": {"prediction": pred, "label": label, "probabilities": probs, "confidence": confidence},
        "composition": composition,
        "intelligence": {"spices": spices_list, "intercropping": intercropping, "health": health},
        "lat": float(poly.centroid.y),
        "lng": float(poly.centroid.x),
    }


@app.post("/aoi/analyze-polygon")
async def analyze_polygon(req: PolygonAnalysisRequest):
    """
    Analyze a custom user-drawn polygon.
    - Input: polygon coordinates [[lng, lat], [lng, lat], ...]
    - Output: Area, land stats, ML predictions, spice suitability
    """
    print(f"📐 Processing polygon with {len(req.coordinates)} points")
    result = _run_polygon_analysis(req.coordinates)
    print("✅ Polygon analysis complete")
    return JSONResponse(result)


@app.get("/tiles/classified/{z}/{x}/{y}.png")
def tiles_classified(z: int, x: int, y: int, opacity: float = 1.0):
    if not os.path.exists(CLASSIFIED_TIF):
        raise HTTPException(status_code=404, detail=f"Missing raster: {CLASSIFIED_TIF}")

    # Clamp opacity to valid range
    opacity = max(0.0, min(1.0, opacity))

    try:
        b = mercantile.bounds(x, y, z)  
        with rasterio.open(CLASSIFIED_TIF) as ds:
            
            if ds.crs and not ds.crs.is_geographic:
                raise HTTPException(status_code=500, detail=f"CRS must be geographic")

            win = window_from_bounds(b.west, b.south, b.east, b.north, transform=ds.transform)

            nodata = ds.nodata
            fill = int(nodata) if nodata is not None else 255

            cls = ds.read(
                1,
                window=win,
                out_shape=(256, 256),
                resampling=Resampling.nearest,
                boundless=True,
                fill_value=fill,
            ).astype(np.int32)

        rgba = np.zeros((256, 256, 4), dtype=np.uint8)

        for k, color in PALETTE.items():
            rgba[cls == k] = np.array(color, dtype=np.uint8)

        rgba[cls == fill] = (0, 0, 0, 0)

        aoi_mask = aoi_mask_for_tile_wgs84(z, x, y, 256)
        rgba[aoi_mask == 0] = (0, 0, 0, 0)

        # Bake opacity into the alpha channel for iOS compatibility
        if opacity < 1.0:
            alpha = rgba[:, :, 3].astype(np.float32)
            alpha *= opacity
            rgba[:, :, 3] = alpha.astype(np.uint8)

        out = Image.fromarray(rgba, mode="RGBA")
        buf = BytesIO()
        out.save(buf, format="PNG")
        return Response(content=buf.getvalue(), media_type="image/png")

    except Exception:
        return Response(content=transparent_tile_png(), media_type="image/png")


@app.get("/intelligence/evaluate")
def intelligence_evaluate(lat: float, lng: float):
    base = _inspect_point(lat, lng)

    if not bool(base.get("inside_aoi")):
        base["intelligence"] = {
            "health": {"headline": "Outside AOI.", "tags": ["Outside AOI"]},
            "spices": [],
            "intercropping": {"good_pairs": [], "avoid_pairs": [], "notes": []}
        }
        return JSONResponse(base)

    feats = base.get("features") or {}
    pred = base.get("prediction") or {}
    land_label = str(pred.get("label") or "UNKNOWN")

    spices = [_evaluate_spice(s, feats, land_label) for s in SPICES]
    base["intelligence"] = {
        "spices": spices,
        "intercropping": _intercropping(spices, feats),
        "health": _health_summary(feats, land_label),
    }
    return JSONResponse(base)


@app.get("/aoi/summary")
def aoi_summary():
    if not os.path.exists(CLASSIFIED_TIF):
        raise HTTPException(status_code=404, detail=f"Missing raster: {CLASSIFIED_TIF}")
    if not os.path.exists(FEATURES_TIF):
        raise HTTPException(status_code=404, detail=f"Missing raster: {FEATURES_TIF}")

    with rasterio.open(CLASSIFIED_TIF) as ds_cls:
        if ds_cls.crs and not ds_cls.crs.is_geographic:
            raise HTTPException(status_code=500, detail=f"Invalid CRS: Not Geographic")

        cls = ds_cls.read(1)
        mask_cls = _aoi_mask_for_dataset(ds_cls)

        inside = cls[mask_cls]
        if inside.size == 0:
            raise HTTPException(status_code=400, detail="AOI mask produced 0 pixels.")

        total = float(inside.size)
        idle_pct = float(np.sum(inside == 0) / total * 100.0)
        veg_pct = float(np.sum(inside == 1) / total * 100.0)
        built_pct = float(np.sum(inside == 2) / total * 100.0)

    with rasterio.open(FEATURES_TIF) as ds_fs:
        if ds_fs.crs and not ds_fs.crs.is_geographic:
            raise HTTPException(status_code=500, detail=f"Invalid CRS: Not Geographic")

        mask_fs = _aoi_mask_for_dataset(ds_fs)

        ndvi = ds_fs.read(1).astype("float32")[mask_fs]
        ndwi = ds_fs.read(4).astype("float32")[mask_fs]
        elev = ds_fs.read(5).astype("float32")[mask_fs]
        slope = ds_fs.read(6).astype("float32")[mask_fs]

        def safe_mean(a: np.ndarray) -> Optional[float]:
            a = a[np.isfinite(a)]
            if a.size == 0:
                return None
            return float(a.mean())

        def safe_std(a: np.ndarray) -> Optional[float]:
            a = a[np.isfinite(a)]
            if a.size == 0:
                return None
            return float(a.std())

        ndvi_mean = safe_mean(ndvi)
        ndwi_mean = safe_mean(ndwi)
        elev_mean = safe_mean(elev)
        slope_mean = safe_mean(slope)

        ndvi_std = safe_std(ndvi)
        ndwi_std = safe_std(ndwi)

        hist = {
            "ndvi_bins": _hist_10bins(ndvi, -1.0, 1.0),
            "ndwi_bins": _hist_10bins(ndwi, -1.0, 1.0),
        }

    conf = _area_confidence(veg_pct, idle_pct, built_pct, ndvi_std, ndwi_std)
    inter = _area_intercropping_rules(ndvi_mean, ndwi_mean, slope_mean)

    payload = {
        "ok": True,
        "aoi_name": "Malabe AOI",
        "composition": {
            "vegetation_pct": round(veg_pct, 2),
            "idle_pct": round(idle_pct, 2),
            "built_pct": round(built_pct, 2),
        },
        "confidence": round(conf, 4),
        "means": {
            "NDVI": None if ndvi_mean is None else round(ndvi_mean, 4),
            "NDWI": None if ndwi_mean is None else round(ndwi_mean, 4),
            "ELEV": None if elev_mean is None else round(elev_mean, 2),
            "SLOPE": None if slope_mean is None else round(slope_mean, 2),
        },
        "hist": hist,
        "intercropping": inter,
    }

    return JSONResponse(payload)


# ==================== HELPER FUNCTIONS ====================
@lru_cache(maxsize=1)
def load_model():
    if os.path.exists(MODEL_PATH_PRIMARY):
        return joblib.load(MODEL_PATH_PRIMARY)
    if os.path.exists(MODEL_PATH_FALLBACK):
        return joblib.load(MODEL_PATH_FALLBACK)
    return None


model = load_model()


def transparent_tile_png(size: int = 256) -> bytes:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def aoi_mask_for_tile_wgs84(z: int, x: int, y: int, size: int = 256) -> np.ndarray:
    b = mercantile.bounds(x, y, z)
    transform = from_bounds(b.west, b.south, b.east, b.north, size, size)
    return rasterize(
        [(AOI_GEOJSON, 1)],
        out_shape=(size, size),
        transform=transform,
        fill=0,
        dtype="uint8",
        all_touched=False,
    )


@lru_cache(maxsize=1)
def _open_features_ds():
    if not os.path.exists(FEATURES_TIF):
        raise FileNotFoundError(FEATURES_TIF)
    return rasterio.open(FEATURES_TIF)


@lru_cache(maxsize=1)
def _band_names() -> List[str]:
    ds = _open_features_ds()
    names = list(ds.descriptions) if ds.descriptions else []
    if not names or any(n is None for n in names):
        names = FEATURES[: ds.count] if ds.count <= len(FEATURES) else [f"band_{i+1}" for i in range(ds.count)]
    return [str(n) for n in names]


def _inspect_point(lat: float, lng: float) -> Dict[str, object]:
    pt = Point(float(lng), float(lat))
    inside = AOI_SHAPE.contains(pt) or AOI_SHAPE.touches(pt)

    resp: Dict[str, object] = {"ok": True, "inside_aoi": bool(inside), "lat": float(lat), "lng": float(lng)}
    if not inside:
        return resp

    ds = _open_features_ds()
    names = _band_names()
    vals = list(ds.sample([(float(lng), float(lat))]))[0]

    feats: Dict[str, float] = {}
    for i in range(min(len(names), len(vals))):
        v = vals[i]
        if v is None:
            continue
        if isinstance(v, float) and np.isnan(v):
            continue
        feats[names[i]] = float(v)

    resp["features"] = feats

    if model is not None and all(k in feats for k in FEATURES):
        X = np.array([feats[k] for k in FEATURES], dtype=float).reshape(1, -1)
        pred = int(model.predict(X)[0])

        probs = None
        conf = None
        if hasattr(model, "predict_proba"):
            p = model.predict_proba(X)[0]
            probs = {"idle_land": float(p[0]), "vegetation_land": float(p[1]), "built_land": float(p[2])}
            conf = float(max(p))

        resp["prediction"] = {"prediction": pred, "label": CLASS_MAP.get(pred, "UNKNOWN"), "probabilities": probs, "confidence": conf}

    return resp


def _clamp01(v: float) -> float:
    return float(max(0.0, min(1.0, v)))


def _tri_score(v: float, lo0: float, lo1: float, hi1: float, hi0: float) -> float:
    if v <= lo0: return 0.0
    if v < lo1: return _clamp01((v - lo0) / (lo1 - lo0 + 1e-9))
    if v <= hi1: return 1.0
    if v < hi0: return _clamp01((hi0 - v) / (hi0 - hi1 + 1e-9))
    return 0.0


def _label(score: float) -> str:
    if score >= 80: return "Good"
    if score >= 55: return "Moderate"
    if score >= 30: return "Poor"
    return "Unsuitable"


def _land_feasibility(label: str) -> float:
    if label == "BUILT_LAND": return 0.0
    if label == "VEGETATION_LAND": return 1.0
    if label == "IDLE_LAND": return 0.75
    return 0.5


def _health_summary(feats: Dict[str, float], land_label: str) -> Dict[str, object]:
    ndvi = float(feats.get("NDVI", float("nan"))) if feats.get("NDVI") is not None else float("nan")
    ndwi = float(feats.get("NDWI", float("nan"))) if feats.get("NDWI") is not None else float("nan")
    slope = float(feats.get("SLOPE", float("nan"))) if feats.get("SLOPE") is not None else float("nan")

    tags: List[str] = []

    veg = "Vegetation unknown"
    if np.isfinite(ndvi):
        veg = "Healthy vegetation" if ndvi > 0.5 else "Moderate vegetation" if ndvi > 0.2 else "Low vegetation"
        tags.append(veg)

    moist = "Moisture unknown"
    if np.isfinite(ndwi):
        moist = "High moisture" if ndwi > 0.2 else "Moisture OK" if ndwi > 0.0 else "Dry tendency"
        tags.append(moist)

    risk = "Slope unknown"
    if np.isfinite(slope):
        risk = "Low slope risk" if slope <= 8 else "Moderate slope risk" if slope <= 20 else "High slope risk"
        tags.append(risk)

    if land_label == "BUILT_LAND":
        headline = "This location appears built-up, so agricultural suitability is very limited."
        tags = ["Built-up", "Limited feasibility"]
    else:
        if ("Healthy" in veg) and ("Moisture OK" in moist or "High" in moist) and ("Low" in risk):
            headline = "Healthy vegetation with adequate moisture and gentle terrain—good conditions for perennial spices."
        elif "Dry" in moist:
            headline = "Vegetation is present, but moisture looks limited—mulching, shade and water management may be needed."
        elif "High" in risk:
            headline = "Vegetation is acceptable, but slope is high—erosion control is important."
        else:
            headline = "Mixed vegetation and terrain signals—site management practices will affect suitability."

    return {"headline": headline, "tags": tags[:3]}


def _spice_rules(name: str) -> Dict[str, object]:
    if name == "Cinnamon":
        return {"ndvi": (0.15, 0.35, 0.80, 0.95), "ndwi": (-0.15, 0.0, 0.20, 0.35), "elev": (0, 50, 600, 1000), "slope": (0, 0, 15, 25)}
    if name == "Pepper":
        return {"ndvi": (0.20, 0.45, 0.85, 0.95), "ndwi": (-0.05, 0.05, 0.25, 0.40), "elev": (0, 80, 600, 850), "slope": (0, 0, 18, 28)}
    if name == "Clove":
        return {"ndvi": (0.25, 0.50, 0.85, 0.95), "ndwi": (-0.10, 0.0, 0.20, 0.35), "elev": (0, 150, 900, 1100), "slope": (0, 0, 15, 25)}
    if name == "Nutmeg":
        # Nutmeg thrives in humid tropical lowlands/midlands with consistent moisture,
        # good vegetation cover, and gentle to moderate slopes.
        return {"ndvi": (0.30, 0.55, 0.88, 0.96), "ndwi": (0.0, 0.08, 0.30, 0.45), "elev": (0, 100, 700, 900), "slope": (0, 0, 15, 22)}
    return {"ndvi": (0.35, 0.60, 0.90, 0.98), "ndwi": (-0.02, 0.05, 0.25, 0.40), "elev": (200, 600, 1200, 1700), "slope": (0, 0, 20, 30)}


def _improvement_plan(spice_name: str, feats: Dict[str, float], land_label: str, base_score: int) -> Dict[str, Any]:
    ndvi = float(feats.get("NDVI", float("nan"))) if feats.get("NDVI") is not None else float("nan")
    ndwi = float(feats.get("NDWI", float("nan"))) if feats.get("NDWI") is not None else float("nan")
    slope = float(feats.get("SLOPE", float("nan"))) if feats.get("SLOPE") is not None else float("nan")

    steps: List[str] = []
    boost = 0

    if np.isfinite(ndwi) and ndwi < 0.0:
        steps.append("💧 Use mulch (leaves/straw) to keep soil moisture.")
        steps.append("🌳 Add shade trees / support plants to reduce drying.")
        steps.append("🚿 Use drip irrigation in dry season if possible.")
        boost += 12 if spice_name in ("Pepper", "Cardamom", "Nutmeg") else 10

    if np.isfinite(ndvi) and ndvi < 0.6:
        steps.append("🌿 Add compost/manure and remove weeds to improve plant cover.")
        boost += 8

    if np.isfinite(slope) and slope > 20:
        steps.append("⛰️ Use contour planting/terraces to reduce erosion.")
        boost -= 6
    elif np.isfinite(slope) and slope > 8:
        steps.append("🧱 Use contour lines + mulch to reduce erosion in rains.")
        boost -= 2

    if land_label == "BUILT_LAND":
        steps.insert(0, "🏠 Built-up area is high — focus only on green pockets.")
        boost -= 20

    if land_label == "IDLE_LAND":
        steps.append("🟤 Idle land — clear weeds and prepare soil before planting.")
        boost += 3

    boost = int(max(-20, min(20, boost)))

    projected_score = int(max(0, min(100, base_score + boost)))
    projected_good_75 = bool(projected_score >= 75)

    return {
        "projected_score": projected_score,
        "projected_good_75": projected_good_75,
        "steps": steps[:6],
    }


def _evaluate_spice(name: str, feats: Dict[str, float], land_label: str) -> Dict[str, object]:
    r = _spice_rules(name)
    land_s = _land_feasibility(land_label)

    ndvi = float(feats.get("NDVI", float("nan"))) if feats.get("NDVI") is not None else float("nan")
    ndwi = float(feats.get("NDWI", float("nan"))) if feats.get("NDWI") is not None else float("nan")
    elev = float(feats.get("ELEV", float("nan"))) if feats.get("ELEV") is not None else float("nan")
    slope = float(feats.get("SLOPE", float("nan"))) if feats.get("SLOPE") is not None else float("nan")

    ndvi_s = _tri_score(ndvi, *r["ndvi"]) if np.isfinite(ndvi) else 0.5
    ndwi_s = _tri_score(ndwi, *r["ndwi"]) if np.isfinite(ndwi) else 0.5
    elev_s = _tri_score(elev, *r["elev"]) if np.isfinite(elev) else 0.5
    slope_s = _tri_score(slope, *r["slope"]) if np.isfinite(slope) else 0.5

    score01 = 0.25 * land_s + 0.25 * ndvi_s + 0.20 * ndwi_s + 0.20 * elev_s + 0.10 * slope_s
    score = float(round(100 * _clamp01(score01)))

    reasons: List[str] = []
    if land_label == "VEGETATION_LAND": reasons.append("Land is vegetation → good feasibility.")
    elif land_label == "IDLE_LAND": reasons.append("Idle land → possible with preparation.")
    elif land_label == "BUILT_LAND": reasons.append("Built-up land → very limited feasibility.")
    else: reasons.append("Land class uncertain → relying on indices & terrain.")

    if np.isfinite(ndvi): reasons.append(f"NDVI {ndvi:.2f} → {'strong' if ndvi_s>0.75 else 'moderate' if ndvi_s>0.45 else 'low'} vegetation signal.")
    if np.isfinite(ndwi): reasons.append(f"NDWI {ndwi:.2f} → {'adequate' if ndwi_s>0.60 else 'limited' if ndwi_s<0.40 else 'moderate'} moisture signal.")
    if np.isfinite(slope): reasons.append(f"Slope {slope:.0f}° → {'low' if slope<=8 else 'moderate' if slope<=20 else 'high'} erosion risk.")

    confidence = float(round(_clamp01(0.5 + 0.25 * land_s + 0.25 * np.mean([ndvi_s, ndwi_s, elev_s, slope_s])), 3))

    tips: List[str] = []
    if np.isfinite(ndwi) and ndwi < 0.0 and name in ("Pepper", "Cardamom", "Nutmeg"):
        tips.append("Moisture looks low—mulch/shade/irrigation can help.")
    if np.isfinite(ndwi) and ndwi < 0.05 and name == "Nutmeg":
        tips.append("Nutmeg needs consistent humidity—consider windbreaks and dense canopy cover.")
    if np.isfinite(slope) and slope > 20:
        tips.append("High slope—use contour planting and erosion control.")

    improvement = _improvement_plan(name, feats, land_label, int(score))

    return {
        "name": name,
        "score": int(score),
        "label": _label(score),
        "confidence": confidence,
        "reasons": reasons[:3],
        "tips": tips[:2],
        "improvement": improvement,
    }


def _intercropping(spices: List[Dict[str, object]], feats: Dict[str, float]) -> Dict[str, object]:
    best = sorted(spices, key=lambda s: int(s.get("score", 0)), reverse=True)
    good = [s for s in best if int(s.get("score", 0)) >= 55]
    names = [str(s["name"]) for s in good]
    sset = set(names)

    slope = float(feats.get("SLOPE", float("nan"))) if feats.get("SLOPE") is not None else float("nan")
    ndvi = float(feats.get("NDVI", float("nan"))) if feats.get("NDVI") is not None else float("nan")
    ndwi = float(feats.get("NDWI", float("nan"))) if feats.get("NDWI") is not None else float("nan")

    notes: List[str] = ["Rule-based intercropping using indices + terrain."]
    if np.isfinite(slope) and slope > 20:
        notes.append("Slope high—avoid complex intercropping; prioritize erosion control.")
        return {"good_pairs": [], "avoid_pairs": [], "notes": notes}

    good_pairs: List[Dict[str, str]] = []
    avoid_pairs: List[Dict[str, str]] = []

    def add_good(a: str, b: str, why: str):
        if a in sset and b in sset and a != b:
            good_pairs.append({"a": a, "b": b, "why": why})

    def add_avoid(a: str, b: str, why: str):
        if a in sset and b in sset and a != b:
            avoid_pairs.append({"a": a, "b": b, "why": why})

    if "Pepper" in sset and "Cinnamon" in sset:
        add_good("Pepper", "Cinnamon", "Similar terrain tolerance; maintain mulch and support plants.")
    if "Cardamom" in sset and (np.isfinite(ndvi) and ndvi < 0.6):
        add_avoid("Cardamom", "Cinnamon", "Cardamom prefers dense/shaded vegetation; cinnamon prefers more light.")
    if "Clove" in sset and "Cinnamon" in sset:
        add_good("Clove", "Cinnamon", "Both are perennial spices; manage erosion and spacing.")
    if "Nutmeg" in sset and "Pepper" in sset:
        add_good("Nutmeg", "Pepper", "Both prefer humid lowlands with shade; complement each other well.")
    if "Nutmeg" in sset and "Clove" in sset:
        add_good("Nutmeg", "Clove", "Both are tropical perennials with similar moisture and shade needs.")
    if "Nutmeg" in sset and (np.isfinite(ndwi) and ndwi < 0.0):
        add_avoid("Nutmeg", "Cardamom", "Both are moisture-sensitive; dry conditions stress both crops.")

    return {"good_pairs": good_pairs[:4], "avoid_pairs": avoid_pairs[:4], "notes": notes}


def _aoi_mask_for_dataset(ds: rasterio.io.DatasetReader) -> np.ndarray:
    mask = rasterize(
        [(AOI_GEOJSON, 1)],
        out_shape=(ds.height, ds.width),
        transform=ds.transform,
        fill=0,
        dtype="uint8",
        all_touched=True,
    )
    return mask.astype(bool)


def _hist_10bins(values: np.ndarray, vmin: float = -1.0, vmax: float = 1.0) -> List[float]:
    if values.size == 0:
        return [0.0] * 10
    v = values[np.isfinite(values)]
    if v.size == 0:
        return [0.0] * 10
    v = np.clip(v, vmin, vmax)
    hist, _ = np.histogram(v, bins=10, range=(vmin, vmax))
    s = hist.sum()
    if s <= 0:
        return [0.0] * 10
    return (hist / s).astype(float).tolist()


def _area_confidence(veg_pct: float, idle_pct: float, built_pct: float, ndvi_std: Optional[float], ndwi_std: Optional[float]) -> float:
    dom = max(veg_pct, idle_pct, built_pct) / 100.0
    dom_score = 0.55 + 0.45 * dom

    st_parts = []
    if ndvi_std is not None and np.isfinite(ndvi_std):
        st_parts.append(max(0.0, 1.0 - min(float(ndvi_std), 0.30) / 0.30))
    if ndwi_std is not None and np.isfinite(ndwi_std):
        st_parts.append(max(0.0, 1.0 - min(float(ndwi_std), 0.30) / 0.30))

    st_score = float(np.mean(st_parts)) if st_parts else 0.7
    conf = 0.6 * dom_score + 0.4 * st_score
    return float(max(0.0, min(1.0, conf)))


def _area_intercropping_rules(ndvi_mean: Optional[float], ndwi_mean: Optional[float], slope_mean: Optional[float]) -> Dict[str, Any]:
    ndvi = float(ndvi_mean) if (ndvi_mean is not None and np.isfinite(ndvi_mean)) else 0.4
    ndwi = float(ndwi_mean) if (ndwi_mean is not None and np.isfinite(ndwi_mean)) else -0.05
    slope = float(slope_mean) if (slope_mean is not None and np.isfinite(slope_mean)) else 8.0

    if ndwi >= 0.10:
        moisture = "wet"
    elif ndwi >= 0.0:
        moisture = "moderate"
    else:
        moisture = "dry"

    steep = slope > 20
    mid = 8 < slope <= 20

    good_pairs: List[Dict[str, str]] = []
    avoid_pairs: List[Dict[str, str]] = []
    notes: List[str] = ["Area-level intercropping suggestions are rule-based."]

    good_pairs.append({"a": "Pepper", "b": "Cinnamon", "why": "Similar shade & moisture needs; works well with mulch."})

    if moisture in ("wet", "moderate") and not steep:
        good_pairs.append({"a": "Cardamom", "b": "Cinnamon", "why": "Cardamom likes humid shade; cinnamon helps shade."})
        good_pairs.append({"a": "Nutmeg", "b": "Pepper", "why": "Both prefer humid lowlands with shade; complement each other well."})

    if moisture == "wet" and not steep:
        good_pairs.append({"a": "Cardamom", "b": "Pepper", "why": "Humid conditions support both; shade and mulch help."})
        good_pairs.append({"a": "Nutmeg", "b": "Clove", "why": "Both are tropical perennials thriving in wet, shaded conditions."})

    if moisture == "dry":
        avoid_pairs.append({"a": "Cardamom", "b": "Clove", "why": "Both need moisture; dry areas may stress both crops."})
        avoid_pairs.append({"a": "Cardamom", "b": "Pepper", "why": "Cardamom is sensitive in dry areas unless irrigated."})
        avoid_pairs.append({"a": "Nutmeg", "b": "Cardamom", "why": "Nutmeg needs consistent humidity; dry conditions stress both."})

    if steep:
        avoid_pairs.append({"a": "Clove", "b": "Pepper", "why": "Steep slopes raise erosion risk; young plants may fail."})
        avoid_pairs.append({"a": "Nutmeg", "b": "Pepper", "why": "Nutmeg is shallow-rooted; steep slopes increase waterlogging and erosion risk."})
        notes.append("Steep slope detected: use terraces/contour planting and ground cover first.")
    elif mid:
        avoid_pairs.append({"a": "Clove", "b": "Cardamom", "why": "Moderate slopes need erosion control; cardamom is sensitive."})
        notes.append("Moderate slope: use contour lines, mulch and cover crops to reduce erosion.")

    if moisture == "dry":
        notes.append("Dry tendency: consider mulching, shade trees, or drip irrigation in dry season.")
        notes.append("Nutmeg is especially drought-sensitive — prioritise moisture retention if planting.")

    return {"good_pairs": good_pairs[:8], "avoid_pairs": avoid_pairs[:8], "notes": notes}


# ==================== MARKETPLACE ENDPOINTS ====================

@app.post("/api/listings/validate-area", response_model=mp_schemas.ValidateAreaResponse)
def validate_listing_area(req: mp_schemas.ValidateAreaRequest, db: Session = Depends(get_db)):
    """
    Check if a polygon is eligible for listing.
    Validates: geometry, AOI containment, restricted zones, duplicates.
    """
    coords = req.coordinates

    # 1. Polygon validity
    try:
        poly = Polygon(coords)
        if not poly.is_valid or poly.area == 0:
            return mp_schemas.ValidateAreaResponse(allowed=False, reason="Invalid polygon geometry.")
    except Exception:
        return mp_schemas.ValidateAreaResponse(allowed=False, reason="Could not parse polygon coordinates.")

    # 2. Check within AOI
    if not AOI_SHAPE.contains(poly):
        return mp_schemas.ValidateAreaResponse(
            allowed=False,
            reason="Polygon is outside the Malabe analysis area. All points must be within the AOI boundary.",
        )

    # 3. Check restricted zones
    restriction = mp_crud.validate_polygon_against_restricted_zones(db, coords)
    if restriction:
        return mp_schemas.ValidateAreaResponse(allowed=False, reason=restriction)

    # 4. Check duplicates
    dup_id = mp_crud.check_duplicate_listing(db, coords)
    if dup_id:
        return mp_schemas.ValidateAreaResponse(
            allowed=False,
            reason=f"A similar listing already exists (ID: {dup_id}). Please check existing listings.",
        )

    return mp_schemas.ValidateAreaResponse(allowed=True, reason="Area is eligible for listing.")


@app.post("/api/listings/create")
def create_listing(
    req: mp_schemas.ListingCreate,
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Create a new land listing:
    1. Validates area
    2. Runs ML analysis (reuses existing pipeline)
    3. Calculates area via pyproj
    4. Stores listing + analytics + crop scores
    5. Links listing to authenticated user (if JWT present)
    """
    coords = req.coordinates

    # --- Validate ---
    try:
        poly = Polygon(coords)
        if not poly.is_valid or poly.area == 0:
            raise HTTPException(status_code=400, detail="Invalid polygon geometry.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse polygon coordinates.")

    if not AOI_SHAPE.contains(poly):
        raise HTTPException(status_code=400, detail="Polygon is outside the Malabe analysis area.")

    restriction = mp_crud.validate_polygon_against_restricted_zones(db, coords)
    if restriction:
        raise HTTPException(status_code=403, detail=restriction)

    # --- Run ML analysis ---
    try:
        analysis = _run_polygon_analysis(coords)
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Analysis error during listing creation: {e}")
        analysis = {}

    # --- Calculate area ---
    area_m2 = analysis.get("area_m2")
    area_acres = analysis.get("area_acres")
    area_hectares = analysis.get("area_hectares")

    # --- Create listing ---
    try:
        listing = mp_crud.create_listing(
            db,
            owner_name=req.owner_name,
            owner_phone=req.owner_phone,
            owner_email=req.owner_email,
            owner_address=req.owner_address,
            coordinates=coords,
            area_square_meters=area_m2,
            area_acres=area_acres,
            area_hectares=area_hectares,
            title=req.title,
            description=req.description,
            current_land_use=req.current_land_use,
            soil_type=req.soil_type,
            water_availability=req.water_availability,
            road_access=req.road_access,
            electricity=req.electricity,
            listing_purpose=req.listing_purpose,
            expected_price=req.expected_price,
            analysis_results=analysis,
            mongo_user_id=user_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create listing: {str(e)}")

    print(f"✅ Listing created: {listing.verification_code}")

    return JSONResponse({
        "ok": True,
        "id": listing.id,
        "verification_code": listing.verification_code,
        "area_acres": area_acres,
        "area_hectares": area_hectares,
        "analysis": analysis,
    })


@app.get("/api/listings")
def list_listings(
    status: Optional[str] = "verified,pending",
    listing_purpose: Optional[str] = None,
    min_acres: Optional[float] = None,
    max_acres: Optional[float] = None,
    city: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Get filtered list of land listings."""
    if status in ["all", ""]:
        status = None
    listings = mp_crud.get_listings(
        db,
        status=status,
        listing_purpose=listing_purpose,
        min_acres=min_acres,
        max_acres=max_acres,
        city=city,
        limit=limit,
        offset=offset,
    )
    results = []
    for l in listings:
        # Include prediction_label from analytics for client-side filtering
        pred_label = None
        if l.analytics:
            pred_label = l.analytics.prediction_label
        results.append({
            "id": l.id,
            "title": l.title,
            "owner_name": l.owner_name,
            "verification_code": l.verification_code,
            "area_acres": l.area_acres,
            "area_hectares": l.area_hectares,
            "listing_purpose": l.listing_purpose.value if l.listing_purpose else None,
            "status": l.status.value if l.status else None,
            "expected_price": l.expected_price,
            "submitted_at": l.submitted_at.isoformat() if l.submitted_at else None,
            "analytics": {"prediction_label": pred_label} if pred_label else None,
            "photos": [
                {"id": p.id, "url": p.url, "is_primary": p.is_primary}
                for p in (l.photos or [])
            ],
        })
    return JSONResponse({"ok": True, "count": len(results), "listings": results})


@app.get("/api/listings/{listing_id}")
def get_listing_detail(listing_id: int, db: Session = Depends(get_db)):
    """Get full listing detail with analytics and crop scores."""
    listing = mp_crud.get_listing_by_id(db, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    polygon_coords = mp_crud.get_listing_polygon_coords(db, listing)

    analytics_out = None
    if listing.analytics:
        a = listing.analytics
        analytics_out = {
            "prediction_label": a.prediction_label,
            "confidence": a.confidence,
            "vegetation_pct": a.vegetation_pct,
            "idle_pct": a.idle_pct,
            "built_pct": a.built_pct,
            "ndvi_mean": a.ndvi_mean,
            "ndwi_mean": a.ndwi_mean,
            "evi_mean": a.evi_mean,
            "elevation_mean": a.elevation_mean,
            "slope_mean": a.slope_mean,
        }

    crop_scores = [
        {"crop_name": c.crop_name, "score": c.score, "label": c.label}
        for c in (listing.crop_scores or [])
    ]

    return JSONResponse({
        "ok": True,
        "listing": {
            "id": listing.id,
            "owner_name": listing.owner_name,
            "owner_phone": listing.owner_phone,
            "owner_email": listing.owner_email,
            "owner_address": listing.owner_address,
            "polygon_coordinates": polygon_coords,
            "area_square_meters": listing.area_square_meters,
            "area_acres": listing.area_acres,
            "area_hectares": listing.area_hectares,
            "title": listing.title,
            "description": listing.description,
            "current_land_use": listing.current_land_use,
            "soil_type": listing.soil_type,
            "water_availability": listing.water_availability,
            "road_access": listing.road_access,
            "electricity": listing.electricity,
            "listing_purpose": listing.listing_purpose.value if listing.listing_purpose else None,
            "expected_price": listing.expected_price,
            "status": listing.status.value if listing.status else None,
            "admin_comment": listing.admin_comment,
            "verification_code": listing.verification_code,
            "submitted_at": listing.submitted_at.isoformat() if listing.submitted_at else None,
            "verified_at": listing.verified_at.isoformat() if listing.verified_at else None,
            "updated_at": listing.updated_at.isoformat() if listing.updated_at else None,
            "has_documents": listing.has_documents,
            "analytics": analytics_out,
            "crop_scores": crop_scores,
            "photos": [
                {"id": p.id, "url": p.url, "is_primary": p.is_primary}
                for p in (listing.photos or [])
            ],
            "documents": [
                {"id": d.id, "url": d.url, "doc_type": d.doc_type}
                for d in (listing.documents or [])
            ],
        },
    })


# =============================================================
#  MEDIA UPLOAD ENDPOINTS
# =============================================================

import shutil
import uuid

@app.post("/api/listings/{listing_id}/photos")
def upload_listing_photos(
    listing_id: int, 
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db)
):
    listing = mp_crud.get_listing_by_id(db, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Must upload at least 2 photos.")
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Cannot upload more than 5 photos.")

    upload_dir = os.path.join("media", "photos", str(listing_id))
    os.makedirs(upload_dir, exist_ok=True)

    saved_photos = []
    
    for idx, file in enumerate(files):
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image.")
            
        ext = file.filename.split(".")[-1]
        unique_name = f"{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(upload_dir, unique_name)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        public_url = f"/media/photos/{listing_id}/{unique_name}"
        is_primary = (idx == 0) # First image is primary by default

        photo_record = mp_models.LandPhoto(
            listing_id=listing_id,
            url=public_url,
            is_primary=is_primary
        )
        db.add(photo_record)
        saved_photos.append(photo_record)
        
    db.commit()
    for p in saved_photos:
        db.refresh(p)
        
    return JSONResponse({
        "success": True,
        "photos": [{"id": p.id, "url": p.url, "is_primary": p.is_primary} for p in saved_photos]
    })


@app.post("/api/listings/{listing_id}/documents")
def upload_listing_documents(
    listing_id: int, 
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db)
):
    listing = mp_crud.get_listing_by_id(db, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    if len(files) < 1 or len(files) > 3:
        raise HTTPException(status_code=400, detail="Must upload between 1 and 3 documents.")

    upload_dir = os.path.join("media", "docs", str(listing_id))
    os.makedirs(upload_dir, exist_ok=True)

    saved_docs = []
    
    for file in files:
        ext = file.filename.split(".")[-1].lower()
        if file.content_type not in ["application/pdf", "image/jpeg", "image/png", "image/webp"] and ext not in ["pdf", "jpg", "jpeg", "png", "webp"]:
            raise HTTPException(status_code=400, detail=f"Unsupported file type for document: {file.filename}")

        doc_type = "pdf" if ext == "pdf" else "image"
        
        unique_name = f"{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(upload_dir, unique_name)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        public_url = f"/media/docs/{listing_id}/{unique_name}"

        doc_record = mp_models.LandDocument(
            listing_id=listing_id,
            url=public_url,
            doc_type=doc_type
        )
        db.add(doc_record)
        saved_docs.append(doc_record)
        
    # Mark listing as having documents
    listing.has_documents = True
    db.commit()
    
    for d in saved_docs:
        db.refresh(d)
        
    return JSONResponse({
        "success": True,
        "documents": [{"id": d.id, "url": d.url, "doc_type": d.doc_type} for d in saved_docs]
    })


# =============================================================
#  LAND COMPLEXITY ENDPOINTS
# =============================================================

@app.get("/api/analysis/city")
async def get_city_analysis(city: str):
    """Get land complexity analysis for a city."""
    try:
        result = gee_service.analyze_city_complexity(city)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analysis/point")
async def get_point_analysis(lat: float, lng: float):
    """XGBoost analysis for any clicked point (works globally via GEE)."""
    try:
        result = gee_service.gee_inspect_point(lat, lng)

        # Add spice suitability & intercropping using the same logic as local analysis
        feats = result.get("features", {})
        pred = result.get("prediction") or {}
        land_label = str(pred.get("label") or "UNKNOWN")

        if feats:
            spices = [_evaluate_spice(s, feats, land_label) for s in SPICES]
            result["intelligence"] = {
                "spices": spices,
                "intercropping": _intercropping(spices, feats),
                "health": _health_summary(feats, land_label),
            }
            # Mark as inside_aoi=True so analytics screen renders fully
            result["inside_aoi"] = True
        else:
            result["intelligence"] = {
                "spices": [],
                "intercropping": {"good_pairs": [], "avoid_pairs": [], "notes": []},
                "health": {"headline": "No data available for this location", "tags": []},
            }

        return JSONResponse(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class GeePolygonRequest(BaseModel):
    coordinates: List[List[float]]  # [[lng, lat], ...]


@app.post("/api/analysis/polygon")
async def get_polygon_analysis(req: GeePolygonRequest):
    """XGBoost analysis for any drawn polygon (works globally via GEE)."""
    try:
        result = gee_service.gee_analyze_polygon(req.coordinates)
        if not result.get("ok"):
            raise HTTPException(status_code=400, detail=result.get("error", "Analysis failed"))

        # Add spice suitability & intercropping
        stats = result.get("statistics", {})
        pred = result.get("prediction") or {}
        land_label = str(pred.get("label") or "UNKNOWN")

        feats_dict = {k: stats.get(k) for k in FEATURES if stats.get(k) is not None}

        if feats_dict:
            spices = [_evaluate_spice(s, feats_dict, land_label) for s in SPICES]
            result["intelligence"] = {
                "spices": spices,
                "intercropping": _intercropping(spices, feats_dict),
                "health": _health_summary(feats_dict, land_label),
            }
        else:
            result["intelligence"] = {
                "spices": [],
                "intercropping": {"good_pairs": [], "avoid_pairs": [], "notes": []},
                "health": {"headline": "Insufficient data", "tags": []},
            }

        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================
#  ADMIN DASHBOARD ENDPOINTS
# =============================================================

from sqlalchemy import func as sa_func
from datetime import timedelta


class AdminStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None


class AdminZoneCreate(BaseModel):
    zone_name: str
    polygon_coordinates: List[List[List[float]]]
    restriction_type: str
    reason: Optional[str] = None


@app.get("/api/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    """Dashboard statistics overview."""
    from datetime import datetime as dt, timezone as tz
    total    = db.query(sa_func.count(mp_models.LandListing.id)).scalar() or 0
    pending  = db.query(sa_func.count(mp_models.LandListing.id)).filter(mp_models.LandListing.status == mp_models.ListingStatus.pending).scalar() or 0
    verified = db.query(sa_func.count(mp_models.LandListing.id)).filter(mp_models.LandListing.status == mp_models.ListingStatus.verified).scalar() or 0
    rejected = db.query(sa_func.count(mp_models.LandListing.id)).filter(mp_models.LandListing.status == mp_models.ListingStatus.rejected).scalar() or 0
    sold     = db.query(sa_func.count(mp_models.LandListing.id)).filter(mp_models.LandListing.status == mp_models.ListingStatus.sold).scalar() or 0
    total_area = db.query(sa_func.sum(mp_models.LandListing.area_acres)).scalar() or 0
    week_ago = dt.now(tz.utc) - timedelta(days=7)
    this_week = db.query(sa_func.count(mp_models.LandListing.id)).filter(mp_models.LandListing.submitted_at >= week_ago).scalar() or 0
    zones_count = db.query(sa_func.count(mp_models.RestrictedZone.id)).scalar() or 0

    return JSONResponse({
        "total_listings": total,
        "pending_count": pending,
        "verified_count": verified,
        "rejected_count": rejected,
        "sold_count": sold,
        "total_area_acres": round(float(total_area), 2),
        "listings_this_week": this_week,
        "restricted_zones_count": zones_count,
    })


@app.patch("/api/listings/{listing_id}/status")
async def admin_update_status(listing_id: int, update: AdminStatusUpdate, db: Session = Depends(get_db)):
    """Update a listing's status (verify / reject / sold) and add comment."""
    from datetime import datetime as dt, timezone as tz
    listing = db.query(mp_models.LandListing).filter(mp_models.LandListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    listing.status = update.status
    if update.reason:
        listing.admin_comment = update.reason
    if update.status == "verified":
        listing.verified_at = dt.now(tz.utc)
    db.commit()

    if listing.mongo_user_id:
        mongo = get_mongo_db()
        if mongo is not None:
            msg = f"Your land '{listing.title}' has been {update.status}."
            if update.reason:
                msg += f" Reason: {update.reason}"
            await mongo.notifications.insert_one({
                "userId": listing.mongo_user_id,
                "listingId": listing.id,
                "type": update.status,
                "message": msg,
                "read": False,
                "createdAt": dt.now(tz.utc)
            })

    return JSONResponse({"success": True, "message": f"Listing #{listing_id} marked as {update.status}."})

@app.get("/api/v1/user/notifications")
async def get_my_notifications(user_id: str = Depends(require_auth)):
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    docs = await db.notifications.find({"userId": user_id}).sort("createdAt", -1).to_list(100)
    for d in docs:
        d["_id"] = str(d["_id"])
        if "createdAt" in d and hasattr(d["createdAt"], "isoformat"):
            d["createdAt"] = d["createdAt"].isoformat()
    return JSONResponse(docs)

@app.patch("/api/v1/user/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user_id: str = Depends(require_auth)):
    db = get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    from bson.objectid import ObjectId
    await db.notifications.update_one({"_id": ObjectId(notif_id), "userId": user_id}, {"$set": {"read": True}})
    return JSONResponse({"success": True})


@app.delete("/api/listings/{listing_id}")
def admin_delete_listing(listing_id: int, db: Session = Depends(get_db)):
    """Delete a listing and its child records."""
    listing = db.query(mp_models.LandListing).filter(mp_models.LandListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    db.query(mp_models.CropSuitability).filter(mp_models.CropSuitability.listing_id == listing_id).delete()
    db.query(mp_models.LandAnalytics).filter(mp_models.LandAnalytics.listing_id == listing_id).delete()
    db.delete(listing)
    db.commit()
    return JSONResponse({"success": True, "message": f"Listing #{listing_id} deleted."})


@app.post("/api/restricted-zones")
def admin_create_zone(zone: AdminZoneCreate, db: Session = Depends(get_db)):
    """Create a new restricted zone with PostGIS geometry."""
    from geoalchemy2.functions import ST_GeomFromGeoJSON
    geojson = {"type": "Polygon", "coordinates": zone.polygon_coordinates}
    new_zone = mp_models.RestrictedZone(
        zone_name=zone.zone_name,
        polygon_geom=ST_GeomFromGeoJSON(json.dumps(geojson)),
        restriction_type=zone.restriction_type,
        reason=zone.reason,
    )
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)
    return JSONResponse({"success": True, "zone_id": new_zone.id})


@app.get("/api/restricted-zones")
def admin_list_zones(db: Session = Depends(get_db)):
    """Get all restricted zones with polygon coordinates."""
    from geoalchemy2.functions import ST_AsGeoJSON
    zones = db.query(
        mp_models.RestrictedZone.id,
        mp_models.RestrictedZone.zone_name,
        mp_models.RestrictedZone.restriction_type,
        mp_models.RestrictedZone.reason,
        mp_models.RestrictedZone.created_at,
        ST_AsGeoJSON(mp_models.RestrictedZone.polygon_geom).label("geojson"),
    ).all()

    result = []
    for z in zones:
        geo = json.loads(z.geojson) if z.geojson else {}
        result.append({
            "id": z.id,
            "zone_name": z.zone_name,
            "restriction_type": z.restriction_type,
            "reason": z.reason,
            "created_at": z.created_at.isoformat() if z.created_at else None,
            "polygon_coordinates": geo.get("coordinates", []),
        })
    return JSONResponse({"total": len(result), "zones": result})


@app.delete("/api/restricted-zones/{zone_id}")
def admin_delete_zone(zone_id: int, db: Session = Depends(get_db)):
    """Delete a restricted zone."""
    zone = db.query(mp_models.RestrictedZone).filter(mp_models.RestrictedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found.")
    db.delete(zone)
    db.commit()
    return JSONResponse({"success": True, "message": f"Zone #{zone_id} deleted."})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)