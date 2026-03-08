"""
API v1 router configuration.

Aggregates all v1 endpoint routers.
"""

from fastapi import APIRouter

from cultivator.api.v1.endpoints import health, predict, auth, jobs, applications, calls, interviews, notifications, call_tasks, explain

# Create aggregate router; namespace is provided by host application mounting.
router = APIRouter()

# Include endpoint routers
router.include_router(health.router)
router.include_router(predict.router)
router.include_router(auth.router)
router.include_router(jobs.router)
router.include_router(applications.router)
router.include_router(calls.router)
router.include_router(interviews.router)
router.include_router(notifications.router)
router.include_router(call_tasks.router)
router.include_router(explain.router)
