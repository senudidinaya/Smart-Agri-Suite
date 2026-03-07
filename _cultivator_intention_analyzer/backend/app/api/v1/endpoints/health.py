"""
Health check endpoint.

Provides system health status and readiness information.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse
from app.services.inference import get_classifier

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check the health status of the API and its dependencies.",
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """
    Perform a health check on the system.
    
    Returns:
        HealthResponse with current status and component checks.
    """
    settings = get_settings()
    classifier = get_classifier()
    
    # Perform health checks
    checks = {
        "model_loaded": classifier.is_loaded,
        "inference_ready": classifier.is_loaded and classifier.model is not None 
            or classifier.is_loaded,  # Placeholder mode is also ready
    }
    
    # Determine overall status
    status = "healthy" if all(checks.values()) else "degraded"
    
    return HealthResponse(
        status=status,
        timestamp=datetime.now(timezone.utc),
        version=settings.app_version,
        environment=settings.environment,
        checks=checks,
    )


@router.get(
    "/ready",
    summary="Readiness Check",
    description="Check if the service is ready to accept requests.",
    tags=["Health"],
)
async def readiness_check() -> dict:
    """
    Check if the service is ready to accept prediction requests.
    
    Returns:
        Simple ready status.
    """
    classifier = get_classifier()
    
    return {
        "ready": classifier.is_loaded,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
