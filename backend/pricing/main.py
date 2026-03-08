from fastapi import FastAPI
import joblib
import pandas as pd

app = FastAPI()

model = joblib.load("ml/price_model.pkl")

@app.get("/")
def root():
    return {"status": "Smart Agri backend running"}

@app.post("/predict")
def predict(data: dict):
    df = pd.DataFrame([data])
    prediction = model.predict(df)[0]
    return {"predicted_price_LKR": round(float(prediction), 2)}
