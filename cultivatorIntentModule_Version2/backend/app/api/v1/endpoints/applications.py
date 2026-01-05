"""
Job application endpoints.
Allows clients to apply for jobs and admin to manage applications.
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional

from app.core.database import get_db
from app.core.auth import verify_token
from app.core.logging import get_logger
from app.schemas.application import (
    ApplicationCreate,
    ApplicationStatusUpdate,
    ApplicationResponse,
    ApplicationListResponse,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/applications", tags=["Applications"])


def get_user_from_token(authorization: str) -> dict:
    """Extract and verify user from authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload


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
async def apply_to_job(data: ApplicationCreate, authorization: str = Header(...)):
    """Apply to a job. Only clients can apply."""
    user = get_user_from_token(authorization)
    
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
    
    logger.info(f"Application created for job {data.jobId} by user {user['username']}")
    
    return application_to_response(app_doc)


@router.get("/", response_model=ApplicationListResponse)
async def get_applications(
    status: Optional[str] = Query(None),
    authorization: str = Header(...)
):
    """Get all applications. Admin sees all, clients see their own."""
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    query = {}
    if user["role"] != "admin":
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
    authorization: str = Header(...)
):
    """Update application status. Only admin can update."""
    user = get_user_from_token(authorization)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update application status")
    
    db = get_db()
    
    result = await db.job_applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"status": data.status, "updatedAt": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    logger.info(f"Application {application_id} status updated to {data.status}")
    
    return {"success": True, "message": f"Status updated to {data.status}"}
