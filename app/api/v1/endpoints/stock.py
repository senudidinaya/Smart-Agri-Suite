"""
Stock prediction endpoints.

Provides spice demand forecasting based on date, region, spice type, and festival status.
"""

from fastapi import APIRouter, HTTPException, status

from app.core.logging import get_logger
from app.schemas.stock import StockPredictionRequest, StockPredictionResponse
from app.services.stock_prediction import predict_for_week

logger = get_logger(__name__)
router = APIRouter(prefix="/stock", tags=["Stock Prediction"])


@router.post(
    "/predict",
    response_model=StockPredictionResponse,
    summary="Predict Spice Demand",
    description="Predict expected quantity (kg) to prepare for a given week, region, and spice type. "
    "If the week includes a festival, the response includes a festival effect analysis.",
)
async def stock_predict(request: StockPredictionRequest):
    """
    Predict spice demand for a given week.

    Args:
        request: StockPredictionRequest with date, region, spice, and is_festival.

    Returns:
        StockPredictionResponse with predicted quantity and festival effect message.
    """
    try:
        result = predict_for_week(
            date_str=request.date,
            region=request.region,
            spice=request.spice,
            is_festival=request.is_festival,
        )
        logger.info(
            f"Stock prediction: {request.spice} in {request.region} on {request.date} "
            f"-> {result['predicted_qty_kg']} kg"
        )
        return StockPredictionResponse(**result)

    except Exception as e:
        logger.exception(f"Stock prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )
