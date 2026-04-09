from fastapi import FastAPI
import joblib
import pandas as pd

app = FastAPI()

model = None

def get_model():
    global model
    if model is None:
        print("\n--- Smart Agri ML Service ---")
        print("Loading ML model (170MB) for the first time...")
        try:
            model = joblib.load("ml/price_model.pkl", mmap_mode='r')
            print("✅ Model loaded successfully!")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            raise e
    return model


@app.get("/")
def root():
    return {"status": "Smart Agri backend running"}

@app.post("/predict")
def predict(data: dict):
    m = get_model()
    df = pd.DataFrame([data])
    prediction = m.predict(df)[0]
    return {"predicted_price_LKR": round(float(prediction), 2)}
