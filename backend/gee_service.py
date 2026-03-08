
import ee
import os
import json
import hashlib
import time
import pathlib
import joblib
import numpy as np
from geopy.geocoders import Nominatim
from typing import Dict, Any, List, Optional
from functools import lru_cache

# ─── Persistent Disk Cache ──────────────────────────────────
CACHE_DIR = pathlib.Path("reqdata/city_cache")
CACHE_TTL_SECONDS = 7 * 24 * 3600  # 7 days


def _cache_path(city_name: str) -> pathlib.Path:
    key = hashlib.md5(city_name.lower().strip().encode()).hexdigest()
    return CACHE_DIR / f"{key}.json"


def _load_cache(city_name: str):
    p = _cache_path(city_name)
    if not p.exists():
        return None
    try:
        data = json.loads(p.read_text())
        if time.time() - data.get("_cached_at", 0) < CACHE_TTL_SECONDS:
            print(f"✅ Cache hit for '{city_name}'")
            return data
    except:
        pass
    return None


def _save_cache(city_name: str, result: dict):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    result["_cached_at"] = time.time()
    _cache_path(city_name).write_text(json.dumps(result))

# ─── Constants ──────────────────────────────────────────────
FEATURES = [
    "NDVI", "EVI", "SAVI", "NDWI",
    "ELEV", "SLOPE", "ASPECT",
    "B2", "B3", "B4", "B8",
    "NDVI_mean_3x3", "NDVI_std_3x3",
    "NIR_mean_3x3", "NIR_std_3x3",
]

CLASS_MAP = {0: "IDLE_LAND", 1: "VEGETATION_LAND", 2: "BUILT_LAND"}

MODEL_PATH = os.path.join("model", "xgb_land_classifier.pkl")

# ─── Init ───────────────────────────────────────────────────

def initialize_gee():
    """Initializes Google Earth Engine."""
    try:
        project = os.getenv("GEE_PROJECT")
        if project:
            ee.Initialize(project=project)
            print(f"✅ Google Earth Engine Initialized with project: {project}")
        else:
            ee.Initialize()
            print("✅ Google Earth Engine Initialized (default project)")
    except Exception as e:
        print(f"⚠️ GEE Initialization failed: {e}")


@lru_cache(maxsize=1)
def _load_xgb_model():
    """Load the trained XGBoost model."""
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ XGBoost model loaded from {MODEL_PATH}")
        return model
    print(f"⚠️ XGBoost model not found at {MODEL_PATH}")
    return None


# ─── Geocoding ──────────────────────────────────────────────

def geocode_city(city_name: str) -> Dict[str, Any]:
    """Geocodes a city name to get its coordinates and bounding box."""
    geolocator = Nominatim(user_agent="smart_agri_suite")
    location = geolocator.geocode(city_name, geometry='geojson', extratags=True)

    if not location:
        return None

    return {
        "address": location.address,
        "lat": location.latitude,
        "lng": location.longitude,
        "bbox": location.raw.get("boundingbox"),
        "geojson": location.raw.get("geojson")
    }


# ─── Cached GEE Composite ──────────────────────────────────
# Cache the S2 composite computation to avoid re-filtering on repeated calls

_composite_cache: Dict[str, ee.Image] = {}

def _get_s2_composite(aoi: ee.Geometry, cache_key: str = None) -> ee.Image:
    """Get a cloud-masked Sentinel-2 median composite, with optional caching."""
    if cache_key and cache_key in _composite_cache:
        return _composite_cache[cache_key]

    s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')

    def mask_scl(image):
        scl = image.select('SCL')
        unwanted = scl.eq(1).Or(scl.eq(3)).Or(scl.eq(8)).Or(scl.eq(9)).Or(scl.eq(10))
        return image.updateMask(unwanted.Not()).divide(10000).copyProperties(image, ['system:time_start'])

    filtered = (s2
                .filterBounds(aoi)
                .filterDate('2023-01-01', '2024-01-01')
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
                .map(mask_scl))

    composite = filtered.median().clip(aoi)

    if cache_key:
        _composite_cache[cache_key] = composite

    return composite


# ─── GEE Feature Extraction ────────────────────────────────

def _build_feature_image(aoi: ee.Geometry, cache_key: str = None) -> ee.Image:
    """
    Build the exact 15-band feature stack that matches the XGBoost model.
    """
    composite = _get_s2_composite(aoi, cache_key)

    # Spectral indices
    nir = composite.select('B8')
    red = composite.select('B4')
    green = composite.select('B3')
    blue = composite.select('B2')

    ndvi = nir.subtract(red).divide(nir.add(red).add(1e-10)).rename('NDVI')
    ndwi = green.subtract(nir).divide(green.add(nir).add(1e-10)).rename('NDWI')

    evi = composite.expression(
        '2.5 * (NIR - RED) / (NIR + 6.0 * RED - 7.5 * BLUE + 1.0)',
        {'NIR': nir, 'RED': red, 'BLUE': blue}
    ).rename('EVI')

    savi = composite.expression(
        '((NIR - RED) / (NIR + RED + 0.5)) * 1.5',
        {'NIR': nir, 'RED': red}
    ).rename('SAVI')

    # Terrain
    srtm = ee.Image('USGS/SRTMGL1_003')
    elev = srtm.select('elevation').rename('ELEV')
    terrain = ee.Terrain.products(srtm)
    slope = terrain.select('slope').rename('SLOPE')
    aspect = terrain.select('aspect').rename('ASPECT')

    # Raw bands
    b2 = composite.select('B2').rename('B2')
    b3 = composite.select('B3').rename('B3')
    b4 = composite.select('B4').rename('B4')
    b8 = composite.select('B8').rename('B8')

    # Spatial neighborhood (3x3)
    kernel = ee.Kernel.square(1)
    ndvi_mean = ndvi.reduceNeighborhood(ee.Reducer.mean(), kernel).rename('NDVI_mean_3x3')
    ndvi_std = ndvi.reduceNeighborhood(ee.Reducer.stdDev(), kernel).rename('NDVI_std_3x3')
    nir_mean = nir.reduceNeighborhood(ee.Reducer.mean(), kernel).rename('NIR_mean_3x3')
    nir_std = nir.reduceNeighborhood(ee.Reducer.stdDev(), kernel).rename('NIR_std_3x3')

    feature_image = (ndvi.addBands(evi).addBands(savi).addBands(ndwi)
                     .addBands(elev).addBands(slope).addBands(aspect)
                     .addBands(b2).addBands(b3).addBands(b4).addBands(b8)
                     .addBands(ndvi_mean).addBands(ndvi_std)
                     .addBands(nir_mean).addBands(nir_std))

    return feature_image


# ─── Point Inspection (works ANYWHERE) ─────────────────────

def gee_inspect_point(lat: float, lng: float) -> Dict[str, Any]:
    """
    Inspect a single point anywhere in the world using GEE + XGBoost.
    Extracts all 15 features and classifies the land type.
    """
    point = ee.Geometry.Point([lng, lat])
    buffer = point.buffer(2000)  # 2km buffer for composite

    feature_image = _build_feature_image(buffer)

    # Sample around the point
    sample = feature_image.sample(
        region=point.buffer(50),  # 50m region around the point
        scale=10,
        numPixels=5,
        geometries=False
    )

    count = sample.size().getInfo()
    if count == 0:
        return {
            "ok": True,
            "lat": lat,
            "lng": lng,
            "features": {},
            "prediction": None,
            "error": "No satellite data available for this location"
        }

    props = sample.first().getInfo().get('properties', {})

    # Extract features
    feats: Dict[str, float] = {}
    for name in FEATURES:
        val = props.get(name)
        if val is not None:
            feats[name] = float(val)

    # Classify with XGBoost
    model = _load_xgb_model()
    prediction = None

    if model is not None and all(k in feats for k in FEATURES):
        X = np.array([feats[k] for k in FEATURES], dtype=float).reshape(1, -1)
        pred = int(model.predict(X)[0])

        probs = None
        conf = None
        if hasattr(model, "predict_proba"):
            p = model.predict_proba(X)[0]
            probs = {"idle_land": float(p[0]), "vegetation_land": float(p[1]), "built_land": float(p[2])}
            conf = float(max(p))

        prediction = {
            "prediction": pred,
            "label": CLASS_MAP.get(pred, "UNKNOWN"),
            "probabilities": probs,
            "confidence": conf
        }

    return {
        "ok": True,
        "lat": lat,
        "lng": lng,
        "features": feats,
        "prediction": prediction,
    }


# ─── Polygon Analysis (works ANYWHERE) ────────────────────

def gee_analyze_polygon(coordinates: List[List[float]]) -> Dict[str, Any]:
    """
    Analyze a user-drawn polygon anywhere using GEE + XGBoost.
    coordinates: [[lng, lat], [lng, lat], ...]
    """
    # Close the ring if needed
    if coordinates[0] != coordinates[-1]:
        coordinates = coordinates + [coordinates[0]]

    aoi = ee.Geometry.Polygon([coordinates])
    feature_image = _build_feature_image(aoi)

    model = _load_xgb_model()

    # Sample points within the polygon (use 200 for speed)
    sample = feature_image.sample(
        region=aoi,
        scale=10,
        numPixels=200,
        seed=42,
        geometries=False
    )

    actual_count = sample.size().getInfo()
    if actual_count == 0:
        return {"ok": False, "error": "No satellite data available for this polygon."}

    features_data = sample.toList(min(actual_count, 200)).getInfo()

    # Build feature arrays
    valid_rows = []
    feat_dicts = []
    for feat in features_data:
        props = feat.get('properties', {})
        row = []
        skip = False
        for band_name in FEATURES:
            val = props.get(band_name)
            if val is None:
                skip = True
                break
            row.append(float(val))
        if not skip:
            valid_rows.append(row)
            feat_dicts.append({k: float(props.get(k, 0)) for k in FEATURES})

    if len(valid_rows) == 0:
        return {"ok": False, "error": "Insufficient data for classification."}

    X = np.array(valid_rows, dtype=np.float64)

    # Classify
    predictions = model.predict(X) if model else np.zeros(len(valid_rows))

    counts = {0: 0, 1: 0, 2: 0}
    for pred in predictions:
        p = int(pred)
        if p in counts:
            counts[p] += 1

    total = len(predictions)

    # Get probabilities
    avg_confidence = None
    if model and hasattr(model, 'predict_proba'):
        probas = model.predict_proba(X)
        avg_confidence = float(np.mean(np.max(probas, axis=1)))

    # Mean statistics across the polygon
    mean_feats = {}
    for k in FEATURES:
        vals = [d[k] for d in feat_dicts if k in d]
        if vals:
            mean_feats[k] = round(float(np.mean(vals)), 4)

    # Overall prediction using mean features
    overall_pred = None
    overall_label = "UNKNOWN"
    overall_probs = None
    overall_conf = None
    if model and len(mean_feats) == len(FEATURES):
        X_mean = np.array([mean_feats[k] for k in FEATURES], dtype=float).reshape(1, -1)
        overall_pred = int(model.predict(X_mean)[0])
        overall_label = CLASS_MAP.get(overall_pred, "UNKNOWN")
        if hasattr(model, 'predict_proba'):
            p = model.predict_proba(X_mean)[0]
            overall_probs = {"idle_land": float(p[0]), "vegetation_land": float(p[1]), "built_land": float(p[2])}
            overall_conf = float(max(p))

    return {
        "ok": True,
        "pixel_count": total,
        "statistics": mean_feats,
        "prediction": {
            "prediction": overall_pred,
            "label": overall_label,
            "probabilities": overall_probs,
            "confidence": overall_conf
        },
        "composition": {
            "vegetation_pct": round((counts[1] / total) * 100, 2) if total > 0 else 0,
            "idle_pct": round((counts[0] / total) * 100, 2) if total > 0 else 0,
            "built_pct": round((counts[2] / total) * 100, 2) if total > 0 else 0,
        },
        "avg_confidence": round(avg_confidence, 4) if avg_confidence else None,
        "method": "xgboost" if model else "threshold",
        "lat": float(np.mean([c[1] for c in coordinates])),
        "lng": float(np.mean([c[0] for c in coordinates])),
    }


# ─── City Analysis (optimized for speed) ──────────────────

def _sample_and_classify(feature_image: ee.Image, aoi: ee.Geometry, model, n_points: int = 200) -> Optional[Dict]:
    """
    Sample random points, classify with XGBoost. Uses 200 points for speed.
    """
    sample = feature_image.sample(
        region=aoi,
        scale=10,
        numPixels=n_points,
        seed=42,
        geometries=False
    )

    actual_count = sample.size().getInfo()
    actual_count = min(actual_count, n_points)
    if actual_count == 0:
        return None

    features_data = sample.toList(actual_count).getInfo()

    valid_rows = []
    for feat in features_data:
        props = feat.get('properties', {})
        row = []
        skip = False
        for band_name in FEATURES:
            val = props.get(band_name)
            if val is None:
                skip = True
                break
            row.append(float(val))
        if not skip:
            valid_rows.append(row)

    if len(valid_rows) == 0:
        return None

    X = np.array(valid_rows, dtype=np.float64)
    predictions = model.predict(X)

    counts = {0: 0, 1: 0, 2: 0}
    for pred in predictions:
        p = int(pred)
        if p in counts:
            counts[p] += 1

    total = len(predictions)
    avg_confidence = None
    if hasattr(model, 'predict_proba'):
        probas = model.predict_proba(X)
        avg_confidence = float(np.mean(np.max(probas, axis=1)))

    return {
        "idle_pct": round((counts[0] / total) * 100, 2),
        "vegetation_pct": round((counts[1] / total) * 100, 2),
        "built_pct": round((counts[2] / total) * 100, 2),
        "total_samples": total,
        "valid_samples": len(valid_rows),
        "avg_confidence": round(avg_confidence, 4) if avg_confidence else None,
    }


def analyze_city_complexity(city_name: str) -> Dict[str, Any]:
    """
    Fast, accurate city analysis:
    - XGBoost on 200 sampled points for statistics
    - NDVI-threshold tiles for quick map visualization
    - Persistent disk cache for instant repeated lookups
    """
    # ── Check disk cache first ──
    cached = _load_cache(city_name)
    if cached:
        cached.pop("_cached_at", None)
        return cached

    geo_data = geocode_city(city_name)
    if not geo_data:
        return {"error": "City not found"}

    # ── Build AOI with geodesic=False to prevent boundary distortion ──
    geojson = geo_data.get("geojson")
    try:
        if geojson and geojson["type"] == "Polygon":
            aoi = ee.Geometry.Polygon(geojson["coordinates"], geodesic=False)
        elif geojson and geojson["type"] == "MultiPolygon":
            aoi = ee.Geometry.MultiPolygon(geojson["coordinates"], geodesic=False)
        else:
            aoi = ee.Geometry.Point([geo_data["lng"], geo_data["lat"]]).buffer(5000)
        # Simplify very complex geometries to avoid GEE coordinate limits
        aoi = aoi.simplify(maxError=100)
    except Exception as e:
        print(f"⚠️ Geometry creation failed ({e}), falling back to buffer")
        aoi = ee.Geometry.Point([geo_data["lng"], geo_data["lat"]]).buffer(5000)

    cache_key = f"city_{city_name.lower().strip()}"
    feature_image = _build_feature_image(aoi, cache_key)

    xgb_model = _load_xgb_model()
    tile_url = None
    analysis = None

    if xgb_model is not None:
        print(f"🔬 Running XGBoost classification for {city_name} (200 samples)...")
        analysis = _sample_and_classify(feature_image, aoi, xgb_model, n_points=200)

    if analysis is None:
        print(f"⚠️ Fallback: threshold-based analysis for {city_name}")
        ndvi = feature_image.select('NDVI')
        stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(), geometry=aoi,
            scale=30, maxPixels=1e9
        ).getInfo()
        avg_ndvi = stats.get('NDVI', 0) or 0
        vegetation_pct = max(0, min(100, avg_ndvi * 120))
        idle_pct = max(0, min(100, (0.5 - avg_ndvi) * 80))
        built_pct = max(0, 100 - (vegetation_pct + idle_pct))
        total = vegetation_pct + idle_pct + built_pct
        if total > 0:
            vegetation_pct = (vegetation_pct / total) * 100
            idle_pct = (idle_pct / total) * 100
            built_pct = (built_pct / total) * 100
        analysis = {
            "vegetation_pct": round(vegetation_pct, 2),
            "idle_pct": round(idle_pct, 2),
            "built_pct": round(built_pct, 2),
            "avg_confidence": None,
            "total_samples": 0,
            "valid_samples": 0,
        }

    # Generate XGBoost-calibrated map tiles via GEE SmileRandomForest
    if xgb_model is not None:
        try:
            print(f"🗺️ Training GEE classifier for map tiles ({city_name})...")
            # Sample 100 points with geometry for classifier training
            train_sample = feature_image.sample(
                region=aoi, scale=10, numPixels=100,
                seed=99, geometries=True
            )
            train_list = train_sample.toList(100).getInfo()

            labeled_features = []
            for feat in train_list:
                props = feat.get('properties', {})
                geom = feat.get('geometry', {})
                row = []
                skip = False
                for band_name in FEATURES:
                    val = props.get(band_name)
                    if val is None:
                        skip = True
                        break
                    row.append(float(val))
                if skip:
                    continue
                X = np.array([row], dtype=np.float64)
                pred = int(xgb_model.predict(X)[0])
                props['xgb_class'] = pred
                labeled_features.append(ee.Feature(ee.Geometry(geom), props))

            if len(labeled_features) >= 10:
                training_fc = ee.FeatureCollection(labeled_features)
                gee_clf = ee.Classifier.smileRandomForest(50).train(
                    features=training_fc,
                    classProperty='xgb_class',
                    inputProperties=FEATURES
                )
                classified = feature_image.classify(gee_clf).rename('classification')
                # 0=idle(orange), 1=vegetation(green), 2=built(ash)
                viz_params = {'min': 0, 'max': 2, 'palette': ['eab308', '22c55e', '94a3b8']}
                map_id_dict = classified.getMapId(viz_params)
                tile_url = map_id_dict['tile_fetcher'].url_format
                print(f"✅ XGBoost-calibrated map tiles ready for {city_name}")
        except Exception as e:
            print(f"⚠️ GEE classifier failed: {e}")

    # Fallback: NDVI-threshold tiles if classifier failed
    if tile_url is None:
        try:
            ndvi = feature_image.select('NDVI')
            classified = (ee.Image(0)
                          .where(ndvi.gt(0.4), 1)
                          .where(ndvi.gt(0.1).And(ndvi.lte(0.4)), 0)
                          .where(ndvi.lte(0.1), 2)
                          .clip(aoi))
            viz_params = {'min': 0, 'max': 2, 'palette': ['eab308', '22c55e', '94a3b8']}
            map_id_dict = classified.getMapId(viz_params)
            tile_url = map_id_dict['tile_fetcher'].url_format
        except Exception as e:
            print(f"⚠️ Tile generation failed: {e}")

    # Average NDVI
    try:
        ndvi_stats = feature_image.select('NDVI').reduceRegion(
            reducer=ee.Reducer.mean(), geometry=aoi,
            scale=30, maxPixels=1e9
        ).getInfo()
        avg_ndvi = round(ndvi_stats.get('NDVI', 0) or 0, 4)
    except:
        avg_ndvi = 0

    result = {
        "city": city_name,
        "address": geo_data["address"],
        "lat": geo_data["lat"],
        "lng": geo_data["lng"],
        "analysis": {
            "vegetation_pct": analysis["vegetation_pct"],
            "idle_pct": analysis["idle_pct"],
            "built_pct": analysis["built_pct"],
            "avg_ndvi": avg_ndvi,
            "avg_confidence": analysis.get("avg_confidence"),
            "total_samples": analysis.get("total_samples", 0),
            "valid_samples": analysis.get("valid_samples", 0),
            "method": "xgboost" if xgb_model is not None else "threshold"
        },
        "tile_url": tile_url,
        "bbox": geo_data["bbox"],
        "boundary": geo_data["geojson"]
    }

    # ── Save to disk cache ──
    _save_cache(city_name, result)

    return result


# Initialization on import
initialize_gee()
