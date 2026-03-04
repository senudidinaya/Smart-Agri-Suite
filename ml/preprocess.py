import pandas as pd

# Load dataset
df = pd.read_csv("pricing_dataset.csv")

# Drop missing values
df = df.dropna()

# Encode categoricals
df["region"] = df["region"].astype("category").cat.codes
df["spice"] = df["spice"].astype("category").cat.codes

# Date handling
df["date"] = pd.to_datetime(df["date"])
df["month"] = df["date"].dt.month

FEATURES = [
    "month",
    "region",
    "spice",
    "temp_c",
    "rainfall_mm",
    "humidity_pct",
    "monsoon_sw_flag",
    "monsoon_ne_flag",
    "qty_sold_kg_4w_ma",
    "market_price_LKR_4w_ma",
    "rainfall_mm_4w_ma",
    "temp_c_4w_ma",
]

TARGET = "market_price_LKR"

X = df[FEATURES]
y = df[TARGET]

X.to_csv("ml/X.csv", index=False)
y.to_csv("ml/y.csv", index=False)

print("✅ Preprocessing completed successfully")
