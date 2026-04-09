import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler

def load_and_preprocess(csv_path):
    df = pd.read_csv(csv_path)

    # -----------------------------
    # Drop rows with missing values
    # -----------------------------
    df = df.dropna().reset_index(drop=True)

    # -----------------------------
    # Convert date
    # -----------------------------
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["month"].astype(int)

    # -----------------------------
    # Encode categorical features
    # -----------------------------
    encoders = {}
    for col in ["region", "spice"]:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le

    # -----------------------------
    # Features & targets
    # -----------------------------
    feature_cols = [
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
        "temp_c_4w_ma"
    ]

    X = df[feature_cols]
    y_demand = df["qty_sold_kg"]
    y_price = df["market_price_LKR"]

    # -----------------------------
    # Scale numeric features
    # -----------------------------
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y_demand, y_price, scaler, encoders

import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler

def load_and_preprocess(csv_path):
    df = pd.read_csv(csv_path)

    # -----------------------------
    # Drop rows with missing values
    # -----------------------------
    df = df.dropna().reset_index(drop=True)

    # -----------------------------
    # Convert date
    # -----------------------------
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["month"].astype(int)

    # -----------------------------
    # Encode categorical features
    # -----------------------------
    encoders = {}
    for col in ["region", "spice"]:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le

    # -----------------------------
    # Features & targets
    # -----------------------------
    feature_cols = [
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
        "temp_c_4w_ma"
    ]

    X = df[feature_cols]
    y_demand = df["qty_sold_kg"]
    y_price = df["market_price_LKR"]

    # -----------------------------
    # Scale numeric features
    # -----------------------------
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y_demand, y_price, scaler, encoders
