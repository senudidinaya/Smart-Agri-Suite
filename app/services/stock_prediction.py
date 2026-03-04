"""
Stock prediction service.

Loads spice demand/price models and provides prediction functionality.
Ported from the Flask-based 'stock test' implementation.
"""

from pathlib import Path

import joblib
import pandas as pd

from app.core.logging import get_logger

logger = get_logger(__name__)

# Resolve model paths relative to project root
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_STOCK_DIR = _PROJECT_ROOT / "models" / "stock"

_DF_PATH = _STOCK_DIR / "dataset.csv"
_QTY_MODEL_PATH = _STOCK_DIR / "qty_pipeline.pkl"
_PRICE_MODEL_PATH = _STOCK_DIR / "price_pipeline.pkl"

# Module-level singletons (lazy loaded)
_df_reference = None
_feature_cols = None
_qty_pipeline = None
_price_pipeline = None


def _load_models():
    """Load models and reference data on first use."""
    global _df_reference, _feature_cols, _qty_pipeline, _price_pipeline

    if _df_reference is not None:
        return  # Already loaded

    logger.info(f"Loading stock prediction models from {_STOCK_DIR}")

    _df_reference = pd.read_csv(str(_DF_PATH), parse_dates=["date"])

    TARGET_QTY = "qty_sold_kg"
    TARGET_PRICE = "market_price_LKR"

    cols_to_exclude = ["date", TARGET_QTY, TARGET_PRICE]
    if "festival_name" in _df_reference.columns:
        cols_to_exclude.append("festival_name")

    _feature_cols = [c for c in _df_reference.columns if c not in cols_to_exclude]

    _qty_pipeline = joblib.load(str(_QTY_MODEL_PATH))
    _price_pipeline = joblib.load(str(_PRICE_MODEL_PATH))

    logger.info(
        f"Stock models loaded successfully. "
        f"Reference data: {len(_df_reference)} rows, {len(_feature_cols)} features"
    )


def _build_feature_row(date, region: str, spice: str, is_festival: bool) -> pd.Series:
    """
    Build a feature row for a given (date, region, spice, is_festival).

    Finds the closest historical week with same month & weekofyear,
    region, spice and copies its numeric/lag features as a realistic proxy.
    """
    _load_models()

    weekofyear = int(date.strftime("%U")) + 1
    month = date.month
    year = date.year

    # Try to find a similar historical row
    mask = (
        (_df_reference["region"] == region)
        & (_df_reference["spice"] == spice)
        & (_df_reference["month"] == month)
        & (_df_reference["weekofyear"] == weekofyear)
        & (_df_reference["date"] <= date)
    )

    similar = _df_reference.loc[mask]

    # Fallback: any row with same region & spice
    if similar.empty:
        similar = _df_reference[
            (_df_reference["region"] == region) & (_df_reference["spice"] == spice)
        ]

    similar = similar.sort_values("date")
    base_row = similar.iloc[-1].copy()

    # Override with the requested time & festival flag
    base_row["date"] = date
    base_row["year"] = year
    base_row["month"] = month
    base_row["weekofyear"] = weekofyear
    base_row["is_festival"] = int(bool(is_festival))

    # Return only the features used by the model
    return base_row[_feature_cols]


def predict_for_week(date_str: str, region: str, spice: str, is_festival: bool) -> dict:
    """
    Predict expected kg to prepare and market price for a given week, region, spice.

    If festival=True, also computes a 'counterfactual' non-festival prediction
    and explains the difference.

    Args:
        date_str: Date string in YYYY-MM-DD format.
        region: Geographic region name.
        spice: Spice type name.
        is_festival: Whether the target week includes a festival.

    Returns:
        Dictionary with prediction results.
    """
    _load_models()

    date = pd.to_datetime(date_str)

    # Build current feature row
    x_row = _build_feature_row(date, region, spice, is_festival)
    x_df = pd.DataFrame([x_row])

    qty_pred = float(_qty_pipeline.predict(x_df)[0])
    price_pred = float(_price_pipeline.predict(x_df)[0])

    message = ""
    if is_festival:
        # Counterfactual: same week but non-festival
        x_row_cf = x_row.copy()
        x_row_cf["is_festival"] = 0
        x_df_cf = pd.DataFrame([x_row_cf])

        qty_pred_cf = float(_qty_pipeline.predict(x_df_cf)[0])
        price_pred_cf = float(_price_pipeline.predict(x_df_cf)[0])

        qty_diff = qty_pred - qty_pred_cf
        price_diff = price_pred - price_pred_cf

        qty_pct = (qty_diff / qty_pred_cf * 100) if qty_pred_cf > 0 else 0.0
        price_pct = (price_diff / price_pred_cf * 100) if price_pred_cf > 0 else 0.0

        direction_qty = "higher" if qty_diff >= 0 else "lower"
        direction_price = "higher" if price_diff >= 0 else "lower"

        message = (
            f"Because this is a festival week, the model predicts "
            f"{abs(qty_diff):.1f} kg ({abs(qty_pct):.1f}%) {direction_qty} demand "
            f"and {abs(price_diff):.1f} LKR/kg ({abs(price_pct):.1f}%) {direction_price} price "
            f"compared to a similar non-festival week."
        )

    return {
        "date": str(date.date()),
        "region": region,
        "spice": spice,
        "is_festival": bool(is_festival),
        "predicted_qty_kg": round(qty_pred, 1),
        "festival_effect_message": message,
    }
