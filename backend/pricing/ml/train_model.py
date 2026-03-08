import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np

# -------------------------------
# Load preprocessed data
# -------------------------------
X = pd.read_csv("ml/X.csv")
y = pd.read_csv("ml/y.csv").values.ravel()

# -------------------------------
# Train / Test split
# -------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# -------------------------------
# Train model
# -------------------------------
model = RandomForestRegressor(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# -------------------------------
# Evaluate model
# -------------------------------
y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print("Model training completed")
print(f"MAE  : {mae:.2f} LKR")
print(f"RMSE : {rmse:.2f} LKR")

# -------------------------------
# Save model
# -------------------------------
joblib.dump(model, "ml/price_model.pkl")
print("Model saved as ml/price_model.pkl")
