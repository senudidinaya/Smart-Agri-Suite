import joblib
import pandas as pd
import os

MODEL_PATH = "d:/new project/backend/model/qty_pipeline.pkl"
try:
    model = joblib.load(MODEL_PATH)
    dt = pd.Timestamp("2025-05-01")
    features = pd.DataFrame([{
        "year": 2025, "month": 5, "weekofyear": 18, "region": "Galle", "spice": "Clove",
        "temp_c": 28.0, "rainfall_mm": 5.0, "humidity_pct": 75.0,
        "is_festival": 0, "monsoon_sw_flag": 0, "monsoon_ne_flag": 0,
        "qty_sold_kg_lag1": 1000, "qty_sold_kg_lag4": 950, "qty_sold_kg_lag12": 900,
        "qty_sold_kg_4w_ma": 980, "qty_sold_kg_8w_ma": 960, "qty_sold_kg_12w_ma": 940,
        "qty_sold_kg_4w_sum": 3900, "qty_sold_kg_8w_sum": 7700, "qty_sold_kg_12w_sum": 11000,
        "market_price_LKR_lag1": 4500, "market_price_LKR_lag4": 4400, "market_price_LKR_lag12": 4200,
        "market_price_LKR_4w_ma": 4450, "market_price_LKR_8w_ma": 4350, "market_price_LKR_12w_ma": 4300,
        "market_price_LKR_4w_sum": 17800,
        "rainfall_mm_lag1": 5, "rainfall_mm_lag4": 7, "rainfall_mm_4w_ma": 6, "rainfall_mm_12w_ma": 5,
        "rainfall_mm_4w_sum": 25, "rainfall_mm_12w_sum": 70,
        "temp_c_lag1": 27, "temp_c_lag4": 28, "temp_c_4w_ma": 27.5, "temp_c_12w_ma": 28, "temp_c_4w_sum": 110
    }])
    
    # Check if any missing columns from model
    missing = set(model.feature_names_in_) - set(features.columns)
    if missing:
        print(f"MISSING: {missing}")
    
    # Reorder
    features = features[list(model.feature_names_in_)]
    
    pred = model.predict(features)
    print(f"PREDICTION_SUCCESS: {pred[0]}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
