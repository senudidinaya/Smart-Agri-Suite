import joblib
import pandas as pd
import os

MODEL_PATH = "d:/new project/backend/model/qty_pipeline.pkl"
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        print("Model Type:", type(model))
        if hasattr(model, 'feature_names_in_'):
            print("Features:", model.feature_names_in_)
        
        # Try a dummy prediction
        dt = pd.Timestamp.now()
        features = pd.DataFrame([{
            "year": dt.year, "month": dt.month, "weekofyear": int(dt.isocalendar().week),
            "region": "Matale", "spice": "Pepper", "temp_c": 28.5, "rainfall_mm": 5.2, "humidity_pct": 74.0,
            "is_festival": 0, "monsoon_sw_flag": 0, "monsoon_ne_flag": 0,
            "qty_sold_kg_lag1": 1100, "qty_sold_kg_lag4": 1050, "qty_sold_kg_lag12": 1000,
            "qty_sold_kg_4w_ma": 1080, "qty_sold_kg_8w_ma": 1050, "qty_sold_kg_12w_ma": 1030,
            "qty_sold_kg_4w_sum": 4320, "qty_sold_kg_8w_sum": 8400, "qty_sold_kg_12w_sum": 12300,
            "market_price_LKR_lag1": 4600, "market_price_LKR_lag4": 4450, "market_price_LKR_lag12": 4300,
            "market_price_LKR_4w_ma": 4500, "market_price_LKR_8w_ma": 4400, "market_price_LKR_12w_ma": 4350,
            "market_price_LKR_4w_sum": 18000,
            "rainfall_mm_lag1": 4, "rainfall_mm_lag4": 6, "rainfall_mm_4w_ma": 5, "rainfall_mm_12w_ma": 5,
            "rainfall_mm_4w_sum": 20, "rainfall_mm_12w_sum": 65,
            "temp_c_lag1": 28, "temp_c_lag4": 28, "temp_c_4w_ma": 28.2, "temp_c_12w_ma": 28.5, "temp_c_4w_sum": 112
        }])
        # Match feature order
        features = features[list(model.feature_names_in_)]
        # Ensure order if needed
        pred = model.predict(features)
        print("Prediction Success:", pred[0])
    except Exception as e:
        print("Error:", e)
else:
    print("Model not found")
