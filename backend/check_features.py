import joblib
import pandas as pd
import os

MODEL_PATH = "d:/new project/backend/model/qty_pipeline.pkl"
try:
    model = joblib.load(MODEL_PATH)
    print("FEATURES_START")
    if hasattr(model, 'feature_names_in_'):
        print(list(model.feature_names_in_))
    else:
        # If it's a pipeline, maybe named_steps
        print("No feature_names_in_")
    print("FEATURES_END")
except Exception as e:
    print(f"Error: {e}")
