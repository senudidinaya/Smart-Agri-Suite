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
from app.schemas.call import CallResponse, AnalysisResult
from app.schemas.interview import InterviewResponse

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
        priorExperience=job.get("priorExperience", "None"),
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
        "priorExperience": data.priorExperience,
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


@router.get("/{job_id}/call-analyses")
async def get_job_call_analyses(
    job_id: str,
    authorization: str = Header(...)
):
    """Get all call analyses for a specific job."""
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    # Verify job exists and user has permission
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only the job creator (client) or admins can view analyses
    if user["role"] != "admin" and user["sub"] != job["createdByUserId"]:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to view this job's analyses"
        )
    
    # Get all calls for this job that have analysis
    cursor = db.calls.find({
        "jobId": job_id,
        "analysis": {"$exists": True, "$ne": None}
    }).sort("createdAt", -1)
    
    calls = await cursor.to_list(length=None)
    
    call_analyses = []
    for call in calls:
        call_data = {
            "id": str(call["_id"]),
            "jobId": call.get("jobId"),
            "adminUserId": call.get("adminUserId"),
            "clientUserId": call.get("clientUserId"),
            "status": call.get("status"),
            "createdAt": call.get("createdAt"),
            "endedAt": call.get("endedAt"),
            "analysis": call.get("analysis") if isinstance(call.get("analysis"), dict) else {
                "intentLabel": call.get("analysis", {}).get("intentLabel", "UNKNOWN"),
                "confidence": call.get("analysis", {}).get("confidence", 0.0),
                "scores": call.get("analysis", {}).get("scores"),
                "analyzedAt": call.get("analysis", {}).get("analyzedAt")
            }
        }
        call_analyses.append(call_data)
    
    return {
        "jobId": job_id,
        "total": len(call_analyses),
        "analyses": call_analyses
    }


@router.get("/{job_id}/interview-analyses")
async def get_job_interview_analyses(
    job_id: str,
    authorization: str = Header(...)
):
    """Get all interview analyses for a specific job."""
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    # Verify job exists and user has permission
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only the job creator (client) or admins can view analyses
    if user["role"] != "admin" and user["sub"] != job["createdByUserId"]:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to view this job's analyses"
        )
    
    # Get all interviews for this job that have analysis
    cursor = db.interviews.find({
        "jobId": job_id,
        "analysisDecision": {"$exists": True, "$ne": None}
    }).sort("createdAt", -1)
    
    interviews = await cursor.to_list(length=None)
    
    interview_analyses = []
    for interview in interviews:
        interview_data = {
            "id": str(interview["_id"]),
            "jobId": interview.get("jobId"),
            "clientId": interview.get("clientId"),
            "adminId": interview.get("adminId"),
            "status": interview.get("status"),
            "interviewScheduledAt": interview.get("interviewScheduledAt"),
            "interviewCompletedAt": interview.get("interviewCompletedAt"),
            "analysisDecision": interview.get("analysisDecision"),
            "confidence": interview.get("confidence"),
            "reasons": interview.get("reasons", []),
            "emotion_distribution": interview.get("emotion_distribution"),
            "dominant_emotion": interview.get("dominant_emotion"),
            "top_signals": interview.get("top_signals"),
            "createdAt": interview.get("createdAt")
        }
        interview_analyses.append(interview_data)
    
    return {
        "jobId": job_id,
        "total": len(interview_analyses),
        "analyses": interview_analyses
    }
