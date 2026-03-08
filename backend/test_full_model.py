import joblib
import pandas as pd
import os

MODEL_PATH = "d:/new project/backend/model/qty_pipeline.pkl"
try:
    model = joblib.load(MODEL_PATH)
    dt = pd.Timestamp("2025-05-01")
    features = pd.DataFrame([{
        "date": "2025-05-01",
        "year": 2025,
        "month": 5,
        "weekofyear": 18,
        "region": "Galle",
        "spice": "Clove",
        "is_festival": 0,
        "precip_mm_lag1": 10.0,
        "precip_mm_lag2": 10.0,
        "precip_mm_lag3": 10.0,
        "precip_mm_lag4": 10.0,
        "precip_mm_4w_sum": 40.0,
        "precip_mm_12w_ma": 10.0,
        "precip_mm_4w_ma": 10.0,
        "temp_c_lag1": 25.0,
        "temp_c_lag2": 25.0,
        "temp_c_lag3": 25.0,
        "temp_c_lag4": 25.0,
        "temp_c_4w_sum": 100.0,
        "temp_c_12w_ma": 25.0,
        "temp_c_4w_ma": 25.0
    }])
    
    # Reorder to match model expectations exactly
    features = features[list(model.feature_names_in_)]
    
    pred = model.predict(features)
    print(f"PREDICTION: {pred[0]}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
