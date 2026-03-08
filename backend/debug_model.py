import joblib
import os
import sys

MODEL_PATH = "d:/new project/backend/model/qty_pipeline.pkl"
print(f"Checking {MODEL_PATH}")
if not os.path.exists(MODEL_PATH):
    print("File not found")
    sys.exit(1)

try:
    model = joblib.load(MODEL_PATH)
    print("LOAD_SUCCESS")
    print(f"Type: {type(model)}")
    if hasattr(model, 'feature_names_in_'):
        print(f"Features: {list(model.feature_names_in_)}")
    else:
        print("No feature_names_in_")
except Exception as e:
    print(f"LOAD_ERROR: {e}")
    import traceback
    traceback.print_exc()
