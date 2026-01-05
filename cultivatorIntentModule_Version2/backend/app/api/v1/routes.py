"""
API v1 router configuration.

Aggregates all v1 endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health, predict, auth, jobs, applications

# Create main v1 router
router = APIRouter(prefix="/api/v1")

# Include endpoint routers
router.include_router(health.router)
router.include_router(predict.router)
router.include_router(auth.router)
router.include_router(jobs.router)
router.include_router(applications.router)
