"""
Health check schemas.
"""

from datetime import datetime
from typing import Dict, Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str = Field(
        default="healthy",
        description="Current health status",
        examples=["healthy", "unhealthy"],
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Current server timestamp",
    )
    version: str = Field(
        description="Application version",
        examples=["1.0.0"],
    )
    environment: str = Field(
        description="Current environment",
        examples=["development", "production"],
    )
    checks: Dict[str, Any] = Field(
        default_factory=dict,
        description="Individual health checks",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "healthy",
                "timestamp": "2026-01-04T10:30:00.000Z",
                "version": "1.0.0",
                "environment": "development",
                "checks": {
                    "model_loaded": True,
                    "inference_ready": True,
                },
            }
        }
    }
