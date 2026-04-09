import joblib
import time
import os

model_path = "backend/ml/price_model.pkl"
print(f"Checking model at {model_path}...")
if os.path.exists(model_path):
    print(f"File size: {os.path.getsize(model_path) / (1024*1024):.2f} MB")
    start_time = time.time()
    try:
        print("Loading model with mmap_mode='r'... (this should be fast)")
        model = joblib.load(model_path, mmap_mode='r')
        print(f"Model loaded successfully in {time.time() - start_time:.2f} seconds!")
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print("Model file not found!")
