"""
API v1 router configuration.

Aggregates all v1 endpoint routers for login and registration only.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health, auth

# Create main v1 router
router = APIRouter(prefix="/api/v1")

# Include endpoint routers
router.include_router(health.router)
router.include_router(auth.router)
