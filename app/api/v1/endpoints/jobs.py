"""
Job posting endpoints.
Allows clients to create jobs and everyone to view them.
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional, List

from app.core.database import get_db
from app.core.auth import verify_token
from app.core.logging import get_logger
from app.schemas.job import JobCreate, JobResponse, JobListResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


def get_user_from_token(authorization: str) -> dict:
    """Extract and verify user from authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload


def job_to_response(job: dict) -> JobResponse:
    """Convert MongoDB job to response."""
    return JobResponse(
        id=str(job["_id"]),
        createdByUserId=job["createdByUserId"],
        createdByUsername=job.get("createdByUsername", "Unknown"),
        title=job["title"],
        districtOrLocation=job["districtOrLocation"],
        startsOnText=job.get("startsOnText", "Immediate"),
        ratePerDay=job["ratePerDay"],
        status=job["status"],
        createdAt=job["createdAt"],
        updatedAt=job["updatedAt"],
    )


@router.get("/", response_model=JobListResponse)
async def get_jobs(
    status: Optional[str] = Query(None),
    authorization: str = Header(...)
):
    """Get all jobs. Optionally filter by status."""
    get_user_from_token(authorization)  # Verify token
    
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    cursor = db.jobs.find(query).sort("createdAt", -1)
    jobs = await cursor.to_list(length=100)
    
    return JobListResponse(
        jobs=[job_to_response(job) for job in jobs],
        total=len(jobs),
    )


@router.get("/my", response_model=JobListResponse)
async def get_my_jobs(authorization: str = Header(...)):
    """Get jobs created by the current user."""
    user = get_user_from_token(authorization)
    
    db = get_db()
    cursor = db.jobs.find({"createdByUserId": user["sub"]}).sort("createdAt", -1)
    jobs = await cursor.to_list(length=100)
    
    return JobListResponse(
        jobs=[job_to_response(job) for job in jobs],
        total=len(jobs),
    )


@router.post("/", response_model=JobResponse)
async def create_job(data: JobCreate, authorization: str = Header(...)):
    """Create a new job posting. Only clients can create jobs."""
    user = get_user_from_token(authorization)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can create jobs")
    
    db = get_db()
    now = datetime.now(timezone.utc)
    
    job_doc = {
        "createdByUserId": user["sub"],
        "createdByUsername": user["username"],
        "title": data.title,
        "districtOrLocation": data.districtOrLocation,
        "startsOnText": data.startsOnText or "Immediate",
        "ratePerDay": data.ratePerDay,
        "status": "new",
        "createdAt": now,
        "updatedAt": now,
    }
    
    result = await db.jobs.insert_one(job_doc)
    job_doc["_id"] = result.inserted_id
    
    logger.info(f"Job created: {data.title} by user {user['username']}")
    
    return job_to_response(job_doc)


@router.patch("/{job_id}/status")
async def update_job_status(
    job_id: str,
    status: str = Query(...),
    authorization: str = Header(...)
):
    """Update job status. Only admin can update status."""
    user = get_user_from_token(authorization)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update job status")
    
    if status not in ["new", "contacted", "closed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db = get_db()
    
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"success": True, "message": f"Status updated to {status}"}
