import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import warnings
warnings.filterwarnings('ignore')

print("Loading dataset...")
df = pd.read_csv('pricing_dataset.csv')

# Use qty_sold_kg as the proxy for Harvest Yield and Market Demand
target = 'qty_sold_kg'

features = ['spice', 'region', 'month', 'temp_c', 'rainfall_mm']
categorical_features = ['spice', 'region']

# Preprocess
X = df[features].copy()
y = df[target].copy()

print("Encoding categorical features...")
X = pd.get_dummies(X, columns=categorical_features, drop_first=False)

# Make sure all possible dummies exist (based on our known unique values from main.py)
expected_cols = [
    'month', 'temp_c', 'rainfall_mm',
    'spice_Cardamom', 'spice_Cinnamon', 'spice_Clove', 'spice_Nutmeg', 'spice_Pepper',
    'region_Galle', 'region_Kandy', 'region_Kegalle', 'region_Kurunegala', 'region_Matale', 'region_Matara'
]
for col in expected_cols:
    if col not in X.columns:
        X[col] = 0
X = X[expected_cols]

print(f"X shape: {X.shape}")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Training Random Forest Regressor for Yield Prediction...")
model = RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

from sklearn.metrics import mean_absolute_error, r2_score
preds = model.predict(X_test)
print(f"Yield Model MAE: {mean_absolute_error(y_test, preds):.2f} kg")
print(f"Yield Model R2:  {r2_score(y_test, preds):.2f}")

# Save the model
model_path = 'yield_model.pkl'
print(f"Saving model to {model_path}...")
joblib.dump(model, model_path)

# Also compute and save Seasonal Trends (normalized demand per spice per month)
print("Computing Seasonal Trends Dictionary...")
seasonal_df = df.groupby(['spice', 'month'])['qty_sold_kg'].mean().reset_index()

trend_dict = {}
for spice in seasonal_df['spice'].unique():
    subset = seasonal_df[seasonal_df['spice'] == spice]
    min_vol = subset['qty_sold_kg'].min()
    max_vol = subset['qty_sold_kg'].max()
    
    spice_trends = {}
    for _, row in subset.iterrows():
        # Min-Max normalize between 0.1 and 1.0 to represent "Demand Strength"
        norm = (row['qty_sold_kg'] - min_vol) / (max_vol - min_vol) if max_vol > min_vol else 0.5
        spice_trends[int(row['month'])] = round(norm * 0.9 + 0.1, 2)
    trend_dict[spice] = spice_trends

joblib.dump(trend_dict, 'seasonal_trends.pkl')
print("Saved seasonal_trends.pkl")

print("Done!")
