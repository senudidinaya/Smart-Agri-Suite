from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

app = FastAPI(
    title="Smart Agri-Suite ML Service",
    description="Price prediction API backed by a trained RandomForest model on Sri Lankan spice market data.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Singleton ──────────────────────────────────────────────────────────
_model = None
_yield_model = None
_seasonal_trends = None

def get_model():
    global _model
    if _model is None:
        print("\n--- Smart Agri ML Service ---")
        print("Loading price model (first request)...")
        try:
            _model = joblib.load("ml/price_model.pkl", mmap_mode='r')
            print("✅ Price Model loaded successfully.")
        except Exception as e:
            print(f"❌ Price Model load failed: {e}")
            raise HTTPException(status_code=503, detail=f"Price Model unavailable: {str(e)}")
    return _model

def get_yield_model():
    global _yield_model
    if _yield_model is None:
        try:
            _yield_model = joblib.load("ml/yield_model.pkl")
            print("✅ Yield Model loaded successfully.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Yield Model unavailable: {str(e)}")
    return _yield_model

def get_seasonal_trends():
    global _seasonal_trends
    if _seasonal_trends is None:
        try:
            _seasonal_trends = joblib.load("ml/seasonal_trends.pkl")
            print("✅ Seasonal Trends loaded successfully.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Seasonal Trends unavailable: {str(e)}")
    return _seasonal_trends

# ─── Regional Climate Defaults ────────────────────────────────────────────────
# Derived from dataset averages per region so the simple endpoint can fill in
# weather features that a farmer wouldn't know to provide.
REGIONAL_DEFAULTS = {
    "Galle":      { "temp_c": 27.2, "rainfall_mm": 62.5, "humidity_pct": 70.1, "monsoon_sw_flag": 1, "monsoon_ne_flag": 0 },
    "Kandy":      { "temp_c": 25.8, "rainfall_mm": 54.1, "humidity_pct": 68.0, "monsoon_sw_flag": 1, "monsoon_ne_flag": 0 },
    "Matale":     { "temp_c": 26.9, "rainfall_mm": 51.3, "humidity_pct": 66.5, "monsoon_sw_flag": 1, "monsoon_ne_flag": 0 },
    "Kurunegala": { "temp_c": 28.4, "rainfall_mm": 48.7, "humidity_pct": 65.8, "monsoon_sw_flag": 0, "monsoon_ne_flag": 1 },
    "Matara":     { "temp_c": 27.6, "rainfall_mm": 65.0, "humidity_pct": 71.2, "monsoon_sw_flag": 1, "monsoon_ne_flag": 0 },
    "Kegalle":    { "temp_c": 26.3, "rainfall_mm": 58.2, "humidity_pct": 69.0, "monsoon_sw_flag": 1, "monsoon_ne_flag": 0 },
}

# Spice-region average moving averages (4-week market averages from dataset)
SPICE_REGION_MA = {
    ("Cinnamon","Galle"):      { "qty_sold_kg_4w_ma": 980.0,  "market_price_LKR_4w_ma": 2450.0, "rainfall_mm_4w_ma": 62.1, "temp_c_4w_ma": 27.1 },
    ("Cinnamon","Matara"):     { "qty_sold_kg_4w_ma": 850.0,  "market_price_LKR_4w_ma": 2380.0, "rainfall_mm_4w_ma": 64.8, "temp_c_4w_ma": 27.4 },
    ("Pepper","Kandy"):        { "qty_sold_kg_4w_ma": 1350.0, "market_price_LKR_4w_ma": 1550.0, "rainfall_mm_4w_ma": 53.5, "temp_c_4w_ma": 25.7 },
    ("Pepper","Matale"):       { "qty_sold_kg_4w_ma": 1520.0, "market_price_LKR_4w_ma": 1620.0, "rainfall_mm_4w_ma": 51.0, "temp_c_4w_ma": 26.8 },
    ("Cardamom","Kandy"):      { "qty_sold_kg_4w_ma": 420.0,  "market_price_LKR_4w_ma": 3800.0, "rainfall_mm_4w_ma": 54.0, "temp_c_4w_ma": 25.9 },
    ("Clove","Kandy"):         { "qty_sold_kg_4w_ma": 580.0,  "market_price_LKR_4w_ma": 2950.0, "rainfall_mm_4w_ma": 53.8, "temp_c_4w_ma": 25.6 },
    ("Nutmeg","Kegalle"):      { "qty_sold_kg_4w_ma": 390.0,  "market_price_LKR_4w_ma": 2550.0, "rainfall_mm_4w_ma": 57.9, "temp_c_4w_ma": 26.2 },
}

# Global fallback MAs (dataset-wide means)
DEFAULT_MA = { "qty_sold_kg_4w_ma": 1190.54, "market_price_LKR_4w_ma": 2671.13, "rainfall_mm_4w_ma": 55.88, "temp_c_4w_ma": 27.73 }

# ─── Schemas ──────────────────────────────────────────────────────────────────

SpiceType   = Literal["Cinnamon", "Pepper", "Cardamom", "Clove", "Nutmeg"]
RegionType  = Literal["Galle", "Kandy", "Matale", "Kurunegala", "Matara", "Kegalle"]

class PredictSimpleRequest(BaseModel):
    """Farmer-facing simple request. Only needs what a farmer actually knows."""
    spice:        SpiceType  = Field(..., description="Spice variety")
    region:       RegionType = Field(..., description="Farming region / district")
    moisture_pct: float      = Field(12.0, ge=0.0, le=100.0, description="Moisture percentage of the harvest (lower = better quality)")
    month:        int        = Field(default_factory=lambda: datetime.now().month, ge=1, le=12, description="Month (1-12), defaults to current month")

class PredictFullRequest(BaseModel):
    """Full request for advanced use — all model features required."""
    spice:                  SpiceType
    region:                 RegionType
    month:                  int   = Field(..., ge=1, le=12)
    temp_c:                 float = Field(..., ge=15.0, le=45.0)
    rainfall_mm:            float = Field(..., ge=0.0)
    humidity_pct:           float = Field(..., ge=0.0, le=100.0)
    monsoon_sw_flag:        int   = Field(..., ge=0, le=1)
    monsoon_ne_flag:        int   = Field(..., ge=0, le=1)
    qty_sold_kg_4w_ma:      float = Field(..., ge=0.0)
    market_price_LKR_4w_ma: float = Field(..., ge=0.0)
    rainfall_mm_4w_ma:      float = Field(..., ge=0.0)
    temp_c_4w_ma:           float = Field(..., ge=0.0)

class PredictResponse(BaseModel):
    predicted_price_LKR: float
    spice:               str
    region:              str
    month:               int
    moisture_adjustment: Optional[float] = None
    confidence_note:     str = "RandomForest model — 200 estimators, trained on 12,270 Sri Lankan spice market records"

class PredictYieldRequest(BaseModel):
    spice: SpiceType
    region: RegionType
    month: int = Field(default_factory=lambda: datetime.now().month, ge=1, le=12)
    temp_c: float
    rainfall_mm: float

class PredictYieldResponse(BaseModel):
    predicted_yield_kg: float
    spice: str
    region: str
    month: int

class ProfitProjectionRequest(BaseModel):
    spice: SpiceType
    region: RegionType
    start_month: int = Field(default_factory=lambda: datetime.now().month, ge=1, le=12)
    cost_factor: float = Field(0.42, description="Percentage of revenue going to operational costs")

class ProfitProjectionResponse(BaseModel):
    projection: list[dict] # { month, price, yield, revenue, cost, profit }

# ─── Helpers ─────────────────────────────────────────────────────────────────

def moisture_to_price_adjustment(moisture_pct: float) -> float:
    """
    Adjust the raw model price based on moisture content.
    The model was not trained on moisture directly, so we apply a post-hoc
    quality correction: 12% is optimal; each % above reduces price by ~0.8%.
    """
    optimal_moisture = 12.0
    delta = moisture_pct - optimal_moisture
    return -delta * 0.008  # negative delta means better quality = higher price

def build_features(spice: str, region: str, month: int) -> dict:
    """Fill in weather and moving average features from regional defaults."""
    climate = REGIONAL_DEFAULTS.get(region, {
        "temp_c": 27.72, "rainfall_mm": 55.82, "humidity_pct": 67.76,
        "monsoon_sw_flag": 1, "monsoon_ne_flag": 0
    })
    ma = SPICE_REGION_MA.get((spice, region), DEFAULT_MA)
    features = {
        "region": region, "spice": spice, "month": month,
        **climate, **ma
    }
    # Fix for model expectation: use moving average as proxy for today's qty
    if "qty_sold_kg_4w_ma" in features:
        features["qty_sold_kg"] = features["qty_sold_kg_4w_ma"]
    return features

# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Smart Agri ML Service v2 — running", "model": "price_model.pkl"}

@app.get("/health")
def health():
    """Check if model is loaded and ready."""
    try:
        m = get_model()
        return {"status": "healthy", "model_loaded": True}
    except:
        return {"status": "degraded", "model_loaded": False}

@app.post("/predict/simple", response_model=PredictResponse)
def predict_simple(req: PredictSimpleRequest):
    """
    Farmer-friendly endpoint. Only requires spice, region, moisture, and month.
    Weather and market moving averages are filled from historical regional defaults.
    """
    m = get_model()
    features = build_features(req.spice, req.region, req.month)
    df = pd.DataFrame([features])
    raw_price = float(m.predict(df)[0])

    # Apply moisture quality correction
    adjustment_factor = moisture_to_price_adjustment(req.moisture_pct)
    adjusted_price = raw_price * (1 + adjustment_factor)

    return PredictResponse(
        predicted_price_LKR=round(adjusted_price, 2),
        spice=req.spice,
        region=req.region,
        month=req.month,
        moisture_adjustment=round(adjustment_factor * 100, 2)
    )

@app.post("/predict", response_model=PredictResponse)
def predict_full(req: PredictFullRequest):
    """Full prediction endpoint with all features explicitly provided."""
    m = get_model()
    features = req.dict()
    # Ensure qty_sold_kg is present if missing
    if "qty_sold_kg" not in features:
        features["qty_sold_kg"] = features.get("qty_sold_kg_4w_ma", 1190.54)
    df = pd.DataFrame([features])
    price = float(m.predict(df)[0])
    return PredictResponse(
        predicted_price_LKR=round(price, 2),
        spice=req.spice,
        region=req.region,
        month=req.month
    )

@app.post("/predict/yield", response_model=PredictYieldResponse)
def predict_yield(req: PredictYieldRequest):
    ym = get_yield_model()
    # Build dataframe for yield model
    # Expected cols: 'month', 'temp_c', 'rainfall_mm', 'spice_*', 'region_*'
    expected_cols = [
        'month', 'temp_c', 'rainfall_mm',
        'spice_Cardamom', 'spice_Cinnamon', 'spice_Clove', 'spice_Nutmeg', 'spice_Pepper',
        'region_Galle', 'region_Kandy', 'region_Kegalle', 'region_Kurunegala', 'region_Matale', 'region_Matara'
    ]
    data = { col: 0 for col in expected_cols }
    data['month'] = req.month
    data['temp_c'] = req.temp_c
    data['rainfall_mm'] = req.rainfall_mm
    if f'spice_{req.spice}' in data: data[f'spice_{req.spice}'] = 1
    if f'region_{req.region}' in data: data[f'region_{req.region}'] = 1

    df = pd.DataFrame([data])
    predicted_yield = float(ym.predict(df)[0])
    
    return PredictYieldResponse(
        predicted_yield_kg=round(predicted_yield, 2),
        spice=req.spice,
        region=req.region,
        month=req.month
    )

@app.post("/analytics/profit-projection", response_model=ProfitProjectionResponse)
def profit_projection(req: ProfitProjectionRequest):
    # Predict over the next 6 months
    pm = get_model()
    ym = get_yield_model()
    
    projections = []
    current_month = req.start_month
    
    for i in range(6):
        m = (current_month + i - 1) % 12 + 1
        
        # 1. Price Prediction
        p_features = build_features(req.spice, req.region, m)
        price_df = pd.DataFrame([p_features])
        raw_price = float(pm.predict(price_df)[0])
        
        # 2. Yield Prediction (Using default climate for that region)
        climate = REGIONAL_DEFAULTS.get(req.region, {"temp_c": 27.0, "rainfall_mm": 55.0})
        expected_cols = [
            'month', 'temp_c', 'rainfall_mm',
            'spice_Cardamom', 'spice_Cinnamon', 'spice_Clove', 'spice_Nutmeg', 'spice_Pepper',
            'region_Galle', 'region_Kandy', 'region_Kegalle', 'region_Kurunegala', 'region_Matale', 'region_Matara'
        ]
        y_data = { col: 0 for col in expected_cols }
        y_data['month'] = m
        y_data['temp_c'] = climate['temp_c']
        y_data['rainfall_mm'] = climate['rainfall_mm']
        if f'spice_{req.spice}' in y_data: y_data[f'spice_{req.spice}'] = 1
        if f'region_{req.region}' in y_data: y_data[f'region_{req.region}'] = 1
        
        yield_df = pd.DataFrame([y_data])
        raw_yield = float(ym.predict(yield_df)[0])
        
        # Financials
        revenue = raw_price * raw_yield
        cost = revenue * req.cost_factor
        profit = revenue - cost
        
        projections.append({
            "month": m,
            "projected_price_LKR": round(raw_price, 2),
            "projected_yield_kg": round(raw_yield, 2),
            "revenue": round(revenue, 2),
            "cost": round(cost, 2),
            "profit": round(profit, 2)
        })
        
    return ProfitProjectionResponse(projection=projections)

@app.get("/analytics/customer-trends")
def get_customer_trends():
    trends = get_seasonal_trends()
    return {"status": "success", "trends": trends}
