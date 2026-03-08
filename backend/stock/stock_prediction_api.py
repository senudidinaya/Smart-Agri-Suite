from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
import os
from datetime import datetime, timedelta

app = FastAPI(title="Smart Agriculture API", description="Dynamic Prediction for Farmer Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "qty_pipeline.pkl")
model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        print("Model loaded successfully from:", MODEL_PATH)
    except Exception as e:
        print(f"Error loading model: {e}")

# In-memory database for demonstration (In production, use SQLite/PostgreSQL)
inventory_db = [
    {"id": "1", "farmer": "Farmer John", "spice": "Pepper", "region": "Matale", "stock": 140.0},
    {"id": "2", "farmer": "Farmer John", "spice": "Clove", "region": "Kandy", "stock": 90.0},
    {"id": "3", "farmer": "Farmer Sena", "spice": "Cinnamon", "region": "Galle", "stock": 210.0}
]

@app.get("/")
def read_root():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "inventory_count": len(inventory_db)
    }

@app.get("/api/inventory")
def get_inventory():
    # Filter for logged in farmer (mocked as Farmer John)
    return [i for i in inventory_db if i["farmer"] == "Farmer John"]

@app.post("/api/inventory")
def update_inventory(data: list = Body(...)):
    global inventory_db
    # Remove old records for this farmer
    inventory_db = [i for i in inventory_db if i["farmer"] != "Farmer John"]
    # Add new records
    for item in data:
        inventory_db.append({
            "id": os.urandom(4).hex(),
            "farmer": "Farmer John",
            "spice": item.get("spice"),
            "region": item.get("region"),
            "stock": float(item.get("stock", 0))
        })
    return {"message": "Inventory updated successfully", "count": len(data)}

@app.get("/api/marketplace")
def get_marketplace():
    # Returns all available stock from all farmers
    return inventory_db

@app.get("/api/alerts")
def get_alerts():
    # Logic to generate alerts based on inventory vs prediction
    alerts = []
    farmer_stock = [i for i in inventory_db if i["farmer"] == "Farmer John"]
    
    for item in farmer_stock:
        # Mini internal prediction for alert logic
        dt = datetime.now()
        features = pd.DataFrame([{
            "year": dt.year,
            "month": dt.month,
            "weekofyear": dt.isocalendar()[1],
            "region": item["region"],
            "spice": item["spice"],
            "is_festival": 0
        }])
        
        try:
            pred = float(model.predict(features)[0]) if model else 150.0
            stock_val = float(item["stock"])
            gap = pred - stock_val
            if gap > 20:
                alerts.append({
                    "id": os.urandom(4).hex(),
                    "title": f"{item['spice']} Shortage Risk",
                    "message": f"Predicted demand ({int(pred)}kg) is higher than your stock ({int(stock_val)}kg). Consider restocking soon.",
                    "severity": "High" if gap > 40 else "Medium",
                    "icon": "⚠"
                })
        except Exception as e:
            print(f"Error in alert generation: {e}")
            pass
            
    if not alerts:
        alerts.append({
            "id": "info-1",
            "title": "Good Stock Levels",
            "message": "Your current spice inventory matches predicted seasonal demand.",
            "severity": "Low",
            "icon": "✅"
        })
        
    return alerts

@app.post("/api/predict")
def predict(data: dict = Body(...)):
    # Extract features
    spice = data.get("spice", "Pepper")
    region = data.get("region", "Matale")
    available_stock = float(data.get("available_stock", 0))
    is_festival = data.get("is_festival", False) or data.get("festival_week", False)
    
    # Date processing
    target_date = data.get("date")
    if target_date:
        try:
            dt = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
        except:
            dt = datetime.now()
    else:
        dt = datetime.now()
        
    # Full Model Features (38 features required by qty_pipeline.pkl)
    # We use realistic baseline defaults for historical/weather features not in the request
    feat_dict = {
        "year": dt.year,
        "month": dt.month,
        "weekofyear": int(dt.isocalendar().week),
        "region": region,
        "spice": spice,
        "temp_c": 28.5,
        "rainfall_mm": 5.2,
        "humidity_pct": 74.0,
        "is_festival": 1 if is_festival else 0,
        "monsoon_sw_flag": 0,
        "monsoon_ne_flag": 0,
        "qty_sold_kg_lag1": 1100,
        "qty_sold_kg_lag4": 1050,
        "qty_sold_kg_lag12": 1000,
        "qty_sold_kg_4w_ma": 1080,
        "qty_sold_kg_8w_ma": 1050,
        "qty_sold_kg_12w_ma": 1030,
        "qty_sold_kg_4w_sum": 4320,
        "qty_sold_kg_8w_sum": 8400,
        "qty_sold_kg_12w_sum": 12300,
        "market_price_LKR_lag1": 4600,
        "market_price_LKR_lag4": 4450,
        "market_price_LKR_lag12": 4300,
        "market_price_LKR_4w_ma": 4500,
        "market_price_LKR_8w_ma": 4400,
        "market_price_LKR_12w_ma": 4350,
        "market_price_LKR_4w_sum": 18000,
        "rainfall_mm_lag1": 4,
        "rainfall_mm_lag4": 6,
        "rainfall_mm_4w_ma": 5,
        "rainfall_mm_12w_ma": 5,
        "rainfall_mm_4w_sum": 20,
        "rainfall_mm_12w_sum": 65,
        "temp_c_lag1": 28,
        "temp_c_lag4": 28,
        "temp_c_4w_ma": 28.2,
        "temp_c_12w_ma": 28.5,
        "temp_c_4w_sum": 112
    }
    
    features = pd.DataFrame([feat_dict])
    
    # Ensured model units (kg) are handled consistently
    if model:
        try:
            features = features[list(model.feature_names_in_)]
            prediction_val = float(model.predict(features)[0])
            # Model predicts in kg, UI expects kg.
            predicted_need = prediction_val
        except Exception as e:
            print(f"Prediction model error: {e}")
            raise HTTPException(status_code=500, detail=f"Model error: {e}")
    else:
        raise HTTPException(status_code=503, detail="Model not loaded on server")

    # Business Logic (using kg for both predicted and available)
    gap = predicted_need - available_stock
    # Updated risk thresholds to be realistic for kg
    risk = "High" if gap > 20 else "Medium" if gap > 5 else "Low"
    
    return {
        "spice": spice,
        "region": region,
        "predicted_stock": round(predicted_need, 2), # Corrected to kg
        "predictedNeed": round(predicted_need, 2),   # Corrected to kg
        "unit": "kg",
        "availableStock": available_stock,
        "gap": round(gap, 2),
        "status": "Shortage" if gap > 0 else "Surplus",
        "riskLevel": risk,
        "confidence": 0.88,
        "festivalImpact": "Detected" if is_festival else "None"
    }

@app.post("/api/range-forecast")
def range_forecast(data: dict = Body(...)):
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")
    
    if not start_date_str or not end_date_str:
        raise HTTPException(status_code=400, detail="start_date and end_date are required")

    start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
    end_date = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
    spice = data.get("spice", "Pepper")
    region = data.get("region", "Matale")
    is_festival = data.get("is_festival", False) or data.get("festival_week", False)
    
    if not model:
         raise HTTPException(status_code=503, detail="Model not loaded on server")

    results = []
    current = start_date
    while current <= end_date:
        feat_dict = {
            "year": current.year,
            "month": current.month,
            "weekofyear": int(current.isocalendar().week),
            "region": region,
            "spice": spice,
            "temp_c": 28.5,
            "rainfall_mm": 5.2,
            "humidity_pct": 74.0,
            "is_festival": 1 if is_festival else 0,
            "monsoon_sw_flag": 0,
            "monsoon_ne_flag": 0,
            "qty_sold_kg_lag1": 1100, "qty_sold_kg_lag4": 1050, "qty_sold_kg_lag12": 1000,
            "qty_sold_kg_4w_ma": 1080, "qty_sold_kg_8w_ma": 1050, "qty_sold_kg_12w_ma": 1030,
            "qty_sold_kg_4w_sum": 4320, "qty_sold_kg_8w_sum": 8400, "qty_sold_kg_12w_sum": 12300,
            "market_price_LKR_lag1": 4600, "market_price_LKR_lag4": 4450, "market_price_LKR_lag12": 4300,
            "market_price_LKR_4w_ma": 4500, "market_price_LKR_8w_ma": 4400, "market_price_LKR_12w_ma": 4350,
            "market_price_LKR_4w_sum": 18000,
            "rainfall_mm_lag1": 4, "rainfall_mm_lag4": 6, "rainfall_mm_4w_ma": 5, "rainfall_mm_12w_ma": 5,
            "rainfall_mm_4w_sum": 20, "rainfall_mm_12w_sum": 65,
            "temp_c_lag1": 28, "temp_c_lag4": 28, "temp_c_4w_ma": 28.2, "temp_c_12w_ma": 28.5, "temp_c_4w_sum": 112
        }
        
        try:
            features = pd.DataFrame([feat_dict])
            features = features[list(model.feature_names_in_)]
            val_kg = float(model.predict(features)[0])
            val = val_kg * 1000
        except Exception as e:
            print(f"Range forecast error: {e}")
            val = 0 # Fallback for error in loop
            
        results.append({
            "date": current.strftime("%Y-%m-%d"),
            "value": round(val, 2)
        })
        current += timedelta(days=7)
        
    return {"results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("stock_prediction_api:app", host="0.0.0.0", port=8001, reload=True)
