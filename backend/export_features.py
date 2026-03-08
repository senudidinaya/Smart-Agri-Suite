import joblib
import os

MODEL_PATH = "d:/new project/backend/model/qty_pipeline.pkl"
try:
    model = joblib.load(MODEL_PATH)
    if hasattr(model, 'feature_names_in_'):
        with open("features.txt", "w") as f:
            for feat in model.feature_names_in_:
                f.write(feat + "\n")
        print("WROTE_FEATURES")
    else:
        print("NO_FEATURE_NAMES")
except Exception as e:
    print(f"ERROR: {e}")
