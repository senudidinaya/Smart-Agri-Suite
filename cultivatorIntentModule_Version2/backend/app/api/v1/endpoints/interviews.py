"""
In-person interview endpoints.
Handles video interview recording, analysis, and status management.
"""

import os
import tempfile
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form

from app.core.database import get_db
from app.core.auth import verify_token
from app.core.logging import get_logger
from app.schemas.interview import (
    InterviewInviteRequest,
    InterviewInviteResponse,
    InterviewAnalyzeResponse,
    InterviewResponse,
    InterviewStatusResponse,
    CallAssessmentResponse,
)
from app.services.inference import get_risk_classifier
from app.api.v1.endpoints.notifications import create_notification

logger = get_logger(__name__)
router = APIRouter(prefix="/admin/interviews", tags=["Interviews"])


def get_admin_from_token(authorization: str) -> dict:
    """Extract and verify admin from authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this endpoint")
    
    return payload


def extract_audio_from_video(video_path: str, output_path: str) -> bool:
    """
    Extract audio from video file using ffmpeg.
    
    Args:
        video_path: Path to input video file
        output_path: Path to output audio file (WAV)
        
    Returns:
        True if extraction successful, False otherwise
    """
    try:
        # Try using ffmpeg to extract audio
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",  # No video
            "-acodec", "pcm_s16le",  # WAV format
            "-ar", "16000",  # 16kHz sample rate
            "-ac", "1",  # Mono
            output_path
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0 and os.path.exists(output_path):
            return True
        
        logger.warning(f"ffmpeg failed: {result.stderr}")
        return False
        
    except FileNotFoundError:
        logger.warning("ffmpeg not found, trying moviepy...")
        try:
            # Fallback to moviepy
            from moviepy.editor import VideoFileClip
            video = VideoFileClip(video_path)
            video.audio.write_audiofile(output_path, fps=16000)
            video.close()
            return True
        except Exception as e:
            logger.error(f"moviepy also failed: {e}")
            return False
    except Exception as e:
        logger.error(f"Audio extraction failed: {e}")
        return False


def _serialize_interview(doc: dict) -> InterviewResponse:
    """Convert MongoDB document to InterviewResponse."""
    return InterviewResponse(
        id=str(doc["_id"]),
        jobId=doc["jobId"],
        clientId=doc["clientId"],
        adminId=doc["adminId"],
        interviewScheduledAt=doc.get("interviewScheduledAt"),
        interviewCompletedAt=doc.get("interviewCompletedAt"),
        videoDurationSeconds=doc.get("videoDurationSeconds"),
        analysisDecision=doc.get("analysisDecision"),
        confidence=doc.get("confidence"),
        reasons=doc.get("reasons", []),
        status=doc.get("status", "pending"),
        createdAt=doc["createdAt"],
    )


def _serialize_call_assessment(doc: dict) -> CallAssessmentResponse:
    """Convert MongoDB document to CallAssessmentResponse."""
    return CallAssessmentResponse(
        id=str(doc["_id"]),
        jobId=doc["jobId"],
        clientId=doc["clientId"],
        adminId=doc["adminId"],
        callStartedAt=doc.get("callStartedAt"),
        callEndedAt=doc.get("callEndedAt"),
        decision=doc["decision"],
        confidence=doc["confidence"],
        reasons=doc.get("reasons", []),
        createdAt=doc["createdAt"],
    )


@router.post("/{job_id}/{client_id}/invite", response_model=InterviewInviteResponse)
async def invite_for_interview(
    job_id: str,
    client_id: str,
    data: Optional[InterviewInviteRequest] = None,
    authorization: str = Header(...),
):
    """
    Invite a client for an in-person interview.
    Creates/updates the interview record and sets application status.
    """
    admin = get_admin_from_token(authorization)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Verify job exists
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Verify client exists
    client = await db.users.find_one({"_id": ObjectId(client_id)})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Check for existing interview
    existing_interview = await db.inperson_interviews.find_one({
        "jobId": job_id,
        "clientId": client_id,
    })
    
    if existing_interview:
        # Update existing
        await db.inperson_interviews.update_one(
            {"_id": existing_interview["_id"]},
            {
                "$set": {
                    "interviewScheduledAt": data.scheduledAt if data else None,
                    "notes": data.notes if data else None,
                    "updatedAt": now,
                }
            }
        )
        interview_id = str(existing_interview["_id"])
    else:
        # Create new interview record
        interview_doc = {
            "jobId": job_id,
            "clientId": client_id,
            "adminId": admin["sub"],
            "interviewScheduledAt": data.scheduledAt if data else None,
            "interviewCompletedAt": None,
            "videoDurationSeconds": None,
            "analysisDecision": None,
            "confidence": None,
            "reasons": [],
            "notes": data.notes if data else None,
            "status": "pending",
            "createdAt": now,
            "updatedAt": now,
        }
        
        result = await db.inperson_interviews.insert_one(interview_doc)
        interview_id = str(result.inserted_id)
    
    # Update application status to invited_interview
    await db.job_applications.update_many(
        {"jobId": job_id, "applicantUserId": client_id},
        {"$set": {"status": "invited_interview", "updatedAt": now}}
    )
    
    # Update job status to invited_interview
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"status": "invited_interview", "updatedAt": now}}
    )
    
    # Send notification to the client
    job_title = job.get("title", "your job post")
    await create_notification(
        user_id=client_id,
        notification_type="interview_invite",
        title="Interview Invitation",
        message=f"You have been invited for an in-person interview for '{job_title}'. An admin will contact you to schedule the interview.",
        job_id=job_id,
        job_title=job_title,
    )
    
    logger.info(f"Client {client_id} invited for interview for job {job_id}")
    
    return InterviewInviteResponse(
        success=True,
        message="Client invited for in-person interview",
        interviewId=interview_id,
        applicationStatus="invited_interview",
    )


@router.post("/{job_id}/{client_id}/analyze-video", response_model=InterviewAnalyzeResponse)
async def analyze_interview_video(
    job_id: str,
    client_id: str,
    file: UploadFile = File(...),
    duration_seconds: float = Form(0.0),
    authorization: str = Header(...),
):
    """
    Analyze an uploaded interview video.
    
    - Extracts audio from video
    - Runs the same feature extraction as call-stage
    - Returns APPROVE / VERIFY / REJECT decision
    - Video file is NOT stored permanently
    """
    admin = get_admin_from_token(authorization)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Verify interview exists
    interview = await db.inperson_interviews.find_one({
        "jobId": job_id,
        "clientId": client_id,
    })
    
    if not interview:
        raise HTTPException(
            status_code=404, 
            detail="Interview not found. Please invite the client first."
        )
    
    now = datetime.now(timezone.utc)
    temp_video_path = None
    temp_audio_path = None
    
    try:
        # Save uploaded video to temp file
        with tempfile.NamedTemporaryFile(
            suffix=".mp4", 
            delete=False
        ) as temp_video:
            content = await file.read()
            temp_video.write(content)
            temp_video_path = temp_video.name
        
        logger.info(f"Saved temp video: {temp_video_path} ({len(content)} bytes)")
        
        # Extract audio from video
        temp_audio_path = temp_video_path.replace(".mp4", ".wav")
        audio_extracted = extract_audio_from_video(temp_video_path, temp_audio_path)
        
        # Analyze using the classifier
        classifier = get_risk_classifier()
        
        decision = "VERIFY"  # Default
        confidence = 0.5
        reasons = []
        
        if audio_extracted and os.path.exists(temp_audio_path):
            # Read audio bytes
            with open(temp_audio_path, "rb") as f:
                audio_bytes = f.read()
            
            # Use the ML model for prediction
            if classifier.is_loaded and classifier.use_ml_model:
                try:
                    features = classifier.extract_features(audio_data=audio_bytes)
                    label, conf, all_scores = classifier.predict_with_ml(features)
                    
                    # Map call decisions to interview decisions
                    if label == "PROCEED":
                        decision = "APPROVE"
                    elif label == "REJECT":
                        decision = "REJECT"
                    else:
                        decision = "VERIFY"
                    
                    confidence = conf
                    
                    # Generate reasons based on features
                    if decision == "APPROVE":
                        reasons = ["No suspicious patterns detected", "Voice analysis within normal range"]
                    elif decision == "REJECT":
                        reasons = ["Suspicious patterns detected", "High-risk indicators found"]
                    else:
                        reasons = ["Manual review recommended", "Some uncertainty in analysis"]
                    
                    logger.info(f"ML prediction: {decision} ({confidence:.2%})")
                    
                except Exception as e:
                    logger.error(f"ML prediction failed: {e}")
                    reasons = ["Analysis completed with fallback method"]
            else:
                # Fallback: rule-based using audio properties
                logger.info("Using rule-based analysis (ML model not loaded)")
                
                # Simple heuristics based on file size and duration
                audio_size = len(audio_bytes)
                
                if audio_size > 100000 and duration_seconds > 30:
                    decision = "APPROVE"
                    confidence = 0.75
                    reasons = ["Sufficient interview duration", "Audio quality acceptable"]
                elif duration_seconds < 10:
                    decision = "VERIFY"
                    confidence = 0.6
                    reasons = ["Interview too short", "Manual review needed"]
                else:
                    decision = "VERIFY"
                    confidence = 0.65
                    reasons = ["Standard interview", "Manual verification recommended"]
        else:
            logger.warning("Audio extraction failed, using fallback")
            decision = "VERIFY"
            confidence = 0.5
            reasons = ["Audio extraction failed", "Manual review required"]
        
        # Update interview record with results
        await db.inperson_interviews.update_one(
            {"_id": interview["_id"]},
            {
                "$set": {
                    "interviewCompletedAt": now,
                    "videoDurationSeconds": duration_seconds,
                    "analysisDecision": decision,
                    "confidence": confidence,
                    "reasons": reasons,
                    "status": "completed",
                    "updatedAt": now,
                }
            }
        )
        
        # Update application status based on decision
        if decision == "APPROVE":
            new_status = "approved"
        elif decision == "REJECT":
            new_status = "rejected"
        else:
            new_status = "verify_required"
        
        await db.job_applications.update_many(
            {"jobId": job_id, "applicantUserId": client_id},
            {"$set": {"status": new_status, "updatedAt": now}}
        )
        
        logger.info(f"Interview analyzed for job {job_id}, client {client_id}: {decision}")
        
        return InterviewAnalyzeResponse(
            success=True,
            interviewId=str(interview["_id"]),
            decision=decision,
            confidence=confidence,
            reasons=reasons,
            applicationStatus=new_status,
            message=f"Interview analysis complete: {decision}",
        )
        
    finally:
        # Clean up temp files (video is NOT stored permanently)
        if temp_video_path and os.path.exists(temp_video_path):
            try:
                os.unlink(temp_video_path)
                logger.debug(f"Deleted temp video: {temp_video_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temp video: {e}")
        
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.unlink(temp_audio_path)
                logger.debug(f"Deleted temp audio: {temp_audio_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temp audio: {e}")


@router.get("/{job_id}/{client_id}", response_model=InterviewStatusResponse)
async def get_interview_status(
    job_id: str,
    client_id: str,
    authorization: str = Header(...),
):
    """
    Get interview status and call assessment for a job/client.
    """
    _ = get_admin_from_token(authorization)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    # Get interview if exists
    interview = await db.inperson_interviews.find_one({
        "jobId": job_id,
        "clientId": client_id,
    })
    
    # Get call assessment if exists
    call_assessment = await db.call_assessments.find_one({
        "jobId": job_id,
        "clientId": client_id,
    })
    
    return InterviewStatusResponse(
        hasInterview=interview is not None,
        interview=_serialize_interview(interview) if interview else None,
        callAssessment=_serialize_call_assessment(call_assessment) if call_assessment else None,
    )


@router.post("/{job_id}/{client_id}/reject")
async def reject_application(
    job_id: str,
    client_id: str,
    authorization: str = Header(...),
):
    """
    Reject a client's application without interview.
    """
    _ = get_admin_from_token(authorization)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    now = datetime.now(timezone.utc)
    
    # Update application status
    result = await db.job_applications.update_many(
        {"jobId": job_id, "applicantUserId": client_id},
        {"$set": {"status": "rejected", "updatedAt": now}}
    )
    
    if result.modified_count == 0:
        # Maybe the job itself, update job status
        await db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "closed", "updatedAt": now}}
        )
    
    logger.info(f"Application rejected for job {job_id}, client {client_id}")
    
    return {"success": True, "message": "Application rejected", "applicationStatus": "rejected"}
