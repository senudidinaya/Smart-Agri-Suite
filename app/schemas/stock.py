"""
Stock prediction request and response schemas.
"""

from typing import Optional

from pydantic import BaseModel, Field


class StockPredictionRequest(BaseModel):
    """Request model for stock/spice demand prediction."""

    date: str = Field(
        description="Target date for prediction (YYYY-MM-DD format)",
        examples=["2026-03-15"],
    )
    region: str = Field(
        description="Geographic region for prediction",
        examples=["Matale"],
    )
    spice: str = Field(
        description="Type of spice to predict",
        examples=["Cardamom"],
    )
    is_festival: bool = Field(
        default=False,
        description="Whether the target week includes a festival",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "date": "2026-03-15",
                "region": "Matale",
                "spice": "Cardamom",
                "is_festival": True,
            }
        }
    }


class StockPredictionResponse(BaseModel):
    """Response model for stock/spice demand prediction."""

    date: str = Field(description="Prediction date")
    region: str = Field(description="Geographic region")
    spice: str = Field(description="Type of spice")
    is_festival: bool = Field(description="Whether festival week")
    predicted_qty_kg: float = Field(
        description="Predicted quantity to prepare in kilograms"
    )
    festival_effect_message: str = Field(
        default="",
        description="Explanation of festival effect on demand and price",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "date": "2026-03-15",
                "region": "Matale",
                "spice": "Cardamom",
                "is_festival": True,
                "predicted_qty_kg": 125.3,
                "festival_effect_message": "Because this is a festival week, the model predicts 15.2 kg (13.8%) higher demand compared to a similar non-festival week.",
            }
        }
    }
