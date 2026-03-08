import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

# -----------------------------
# 1. Load dataset
# -----------------------------
df = pd.read_csv("pricing_dataset.csv")

# -----------------------------
# 2. Drop unused columns
# -----------------------------
df = df.drop(columns=["date"])

# -----------------------------
# 3. Separate features & target
# -----------------------------
X = df.drop(columns=["market_price_LKR"])
y = df["market_price_LKR"]

# -----------------------------
# 4. Identify categorical columns
# -----------------------------
categorical_cols = ["region", "spice", "month"]
numerical_cols = [col for col in X.columns if col not in categorical_cols]

# -----------------------------
# 5. Preprocessing
# -----------------------------
preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
        ("num", "passthrough", numerical_cols)
    ]
)

# -----------------------------
# 6. Define model
# -----------------------------
model = RandomForestRegressor(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)

# -----------------------------
# 7. Create pipeline
# -----------------------------
pipeline = Pipeline(steps=[
    ("preprocessing", preprocessor),
    ("model", model)
])

# -----------------------------
# 8. Train-test split
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# -----------------------------
# 9. Train model
# -----------------------------
pipeline.fit(X_train, y_train)

# -----------------------------
# 10. Evaluate
# -----------------------------
y_pred = pipeline.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print(f"RMSE (LKR): {rmse:.2f}")

# -----------------------------
# 11. Save trained model
# -----------------------------
joblib.dump(pipeline, "price_prediction_model.pkl")

print("Model saved as price_prediction_model.pkl")
