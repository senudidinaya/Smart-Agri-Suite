"""
Job posting endpoints.
Allows clients to create jobs and everyone to view them.
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from cultivator.core.database import get_db
from cultivator.core.logging import get_logger
from auth_utils import require_auth
from cultivator.schemas.job import JobCreate, JobResponse, JobListResponse
from cultivator.schemas.call import CallResponse, AnalysisResult
from cultivator.schemas.interview import InterviewResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


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
    user_id: str = Depends(require_auth)
):
    """Get all jobs. Optionally filter by status."""
    await get_current_user(user_id)  # Verify token and user exists
    
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
async def get_my_jobs(user_id: str = Depends(require_auth)):
    """Get jobs created by the current user."""
    user = await get_current_user(user_id)
    
    db = get_db()
    cursor = db.jobs.find({"createdByUserId": user["sub"]}).sort("createdAt", -1)
    jobs = await cursor.to_list(length=100)
    
    return JobListResponse(
        jobs=[job_to_response(job) for job in jobs],
        total=len(jobs),
    )


@router.post("/", response_model=JobResponse)
async def create_job(data: JobCreate, user_id: str = Depends(require_auth)):
    """Create a new job posting. Only clients can create jobs."""
    user = await get_current_user(user_id)
    
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
    user_id: str = Depends(require_auth)
):
    """Update job status. Only interviewer can update status."""
    user = await get_current_user(user_id)
    
    if user["role"] != "interviewer":
        raise HTTPException(status_code=403, detail="Only interviewer can update job status")
    
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
    user_id: str = Depends(require_auth)
):
    """Get all call analyses for a specific job."""
    user = await get_current_user(user_id)
    
    db = get_db()
    
    # Verify job exists and user has permission
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only the job creator (client) or interviewers can view analyses
    if user["role"] != "interviewer" and user["sub"] != job["createdByUserId"]:
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
    user_id: str = Depends(require_auth)
):
    """Get all interview analyses for a specific job."""
    user = await get_current_user(user_id)
    
    db = get_db()
    
    # Verify job exists and user has permission
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Only the job creator (client) or interviewers can view analyses
    if user["role"] != "interviewer" and user["sub"] != job["createdByUserId"]:
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
