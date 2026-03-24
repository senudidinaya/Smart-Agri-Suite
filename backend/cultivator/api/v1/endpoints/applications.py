"""
Job application endpoints.
Allows clients to apply for jobs and admin to manage applications.
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from cultivator.core.database import get_db
from cultivator.core.logging import get_logger
from auth_utils import require_auth
from cultivator.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    ApplicationResponse,
    ApplicationListResponse,
)
from cultivator.services.admin_assignment import get_today_colombo_date_str, assign_or_queue_call_task

logger = get_logger(__name__)
router = APIRouter(prefix="/applications", tags=["Applications"])


async def get_current_user(user_id: str) -> dict:
    """Resolve authenticated user data for role and username checks."""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "sub": user_id,
        "username": user.get("username", "unknown"),
        "role": user.get("role", "client"),
    }


def application_to_response(app: dict) -> ApplicationResponse:
    """Convert MongoDB application to response."""
    return ApplicationResponse(
        id=str(app["_id"]),
        jobId=app["jobId"],
        applicantUserId=app["applicantUserId"],
        applicantName=app["applicantName"],
        applicantDistrict=app.get("applicantDistrict"),
        workType=app.get("workType"),
        availability=app.get("availability"),
        status=app["status"],
        createdAt=app["createdAt"],
        updatedAt=app["updatedAt"],
    )


@router.post("/", response_model=ApplicationResponse)
async def apply_to_job(data: ApplicationCreate, user_id: str = Depends(require_auth)):
    """Apply to a job. Only clients can apply."""
    user = await get_current_user(user_id)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can apply to jobs")
    
    db = get_db()
    
    # Check if job exists
    job = await db.jobs.find_one({"_id": ObjectId(data.jobId)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already applied
    existing = await db.job_applications.find_one({
        "jobId": data.jobId,
        "applicantUserId": user["sub"],
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Get user info from users collection
    user_doc = await db.users.find_one({"_id": ObjectId(user["sub"])})
    
    now = datetime.now(timezone.utc)
    
    app_doc = {
        "jobId": data.jobId,
        "applicantUserId": user["sub"],
        "applicantName": user_doc["fullName"] if user_doc else user["username"],
        "applicantDistrict": user_doc.get("address") if user_doc else None,
        "workType": job.get("title"),  # Use job title as work type
        "availability": job.get("startsOnText"),  # Use job start date as availability
        "status": "new",
        "createdAt": now,
        "updatedAt": now,
    }
    
    result = await db.job_applications.insert_one(app_doc)
    app_doc["_id"] = result.inserted_id
    
    # Create CallTask for automated follow-up
    scheduled_date = get_today_colombo_date_str()
    call_task_doc = {
        "jobId": data.jobId,
        "clientId": user["sub"],
        "applicationId": str(result.inserted_id),
        "status": "NEW",
        "assignedAdminId": None,
        "scheduledDate": scheduled_date,
        "createdAt": now,
        "updatedAt": now,
    }
    
    call_task_result = await db.call_tasks.insert_one(call_task_doc)
    
    # Assign or queue the task
    await assign_or_queue_call_task(str(call_task_result.inserted_id), scheduled_date)
    
    logger.info(f"Application created for job {data.jobId} by user {user['username']} - CallTask scheduled for {scheduled_date}")
    
    return application_to_response(app_doc)


@router.get("/", response_model=ApplicationListResponse)
async def get_applications(
    status: Optional[str] = Query(None),
    user_id: str = Depends(require_auth)
):
    """Get all applications. Interviewer sees all, clients see their own."""
    user = await get_current_user(user_id)
    
    db = get_db()
    
    query = {}
    if user["role"] != "interviewer":
        query["applicantUserId"] = user["sub"]
    
    if status:
        query["status"] = status
    
    cursor = db.job_applications.find(query).sort("createdAt", -1)
    applications = await cursor.to_list(length=200)
    
    return ApplicationListResponse(
        applications=[application_to_response(app) for app in applications],
        total=len(applications),
    )


@router.patch("/{application_id}/status")
async def update_application_status(
    application_id: str,
    data: ApplicationStatusUpdate,
    user_id: str = Depends(require_auth)
):
    """Update application status. Only interviewer can update."""
    user = await get_current_user(user_id)
    
    if user["role"] != "interviewer":
        raise HTTPException(status_code=403, detail="Only interviewer can update application status")
    
    db = get_db()
    
    result = await db.job_applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"status": data.status, "updatedAt": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    logger.info(f"Application {application_id} status updated to {data.status}")
    
    return {"success": True, "message": f"Status updated to {data.status}"}
