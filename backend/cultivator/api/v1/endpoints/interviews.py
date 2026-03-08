"""
In-person interview endpoints.
Handles video interview recording, analysis, and status management.
Uses Gate 2 ML model for facial expression analysis.
"""

import os
import shutil
import tempfile
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from cultivator.core.database import get_db
from cultivator.core.logging import get_logger
from auth_utils import require_auth
from cultivator.schemas.interview import (
    InterviewInviteRequest,
    InterviewInviteResponse,
    InterviewAnalyzeResponse,
    InterviewResponse,
    InterviewStatusResponse,
    CallAssessmentResponse,
    Gate2AnalysisStats,
    DeceptionAnalysis,
    SafetyAssessment,
)
from cultivator.services.inference import get_risk_classifier, get_deception_detector
from cultivator.services.gate2_inference import get_gate2_inference_service, get_gate2_deception_service
from cultivator.services.safety_assessment import SafetyAssessmentService
from cultivator.api.v1.endpoints.notifications import create_notification

logger = get_logger(__name__)
router = APIRouter(prefix="/admin/interviews", tags=["Interviews"])


async def get_interviewer_user(user_id: str) -> dict:
    """Resolve authenticated interviewer from user id."""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("role") != "interviewer":
        raise HTTPException(status_code=403, detail="Only interviewer can access this endpoint")
    return {
        "sub": user_id,
        "username": user.get("username", "interviewer"),
        "role": user.get("role"),
    }


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
    # Build stats if present
    stats = None
    raw_stats = doc.get("gate2_stats")
    if raw_stats and isinstance(raw_stats, dict):
        from cultivator.schemas.interview import Gate2AnalysisStats
        stats = Gate2AnalysisStats(**raw_stats)

    # Build deception analysis results if present
    g1_dec = None
    raw_g1 = doc.get("gate1_deception")
    if raw_g1 and isinstance(raw_g1, dict):
        g1_dec = DeceptionAnalysis(**raw_g1)

    g2_dec = None
    raw_g2 = doc.get("gate2_deception")
    if raw_g2 and isinstance(raw_g2, dict):
        g2_dec = DeceptionAnalysis(**raw_g2)

    # Build safety assessment if present
    safety = None
    raw_safety = doc.get("safety_assessment")
    if raw_safety and isinstance(raw_safety, dict):
        safety = SafetyAssessment(**raw_safety)

    # determine cultivator/interviewer ids with backward compatibility
    cultivator_id = doc.get("cultivatorId") or doc.get("clientId")
    interviewer_id = doc.get("interviewerId") or doc.get("adminId")

    return InterviewResponse(
        id=str(doc["_id"]),
        jobId=doc["jobId"],
        cultivatorId=cultivator_id,
        interviewerId=interviewer_id,
        interviewScheduledAt=doc.get("interviewScheduledAt"),
        interviewCompletedAt=doc.get("interviewCompletedAt"),
        videoDurationSeconds=doc.get("videoDurationSeconds"),
        analysisDecision=doc.get("analysisDecision"),
        confidence=doc.get("confidence"),
        reasons=doc.get("reasons", []),
        status=doc.get("status", "pending"),
        createdAt=doc["createdAt"],
        emotion_distribution=doc.get("gate2_emotion_distribution"),
        dominant_emotion=doc.get("gate2_dominant_emotion"),
        top_signals=doc.get("gate2_top_signals"),
        stats=stats,
        model_version=doc.get("gate2_model_version"),
        gate1_deception=g1_dec,
        gate2_deception=g2_dec,
        safety_assessment=safety,
    )


def _serialize_call_assessment(doc: dict) -> CallAssessmentResponse:
    """Convert MongoDB document to CallAssessmentResponse."""
    cultivator_id = doc.get("cultivatorId") or doc.get("clientId")
    interviewer_id = doc.get("interviewerId") or doc.get("adminId")
    return CallAssessmentResponse(
        id=str(doc["_id"]),
        jobId=doc["jobId"],
        cultivatorId=cultivator_id,
        interviewerId=interviewer_id,
        callStartedAt=doc.get("callStartedAt"),
        callEndedAt=doc.get("callEndedAt"),
        decision=doc["decision"],
        confidence=doc["confidence"],
        reasons=doc.get("reasons", []),
        scores=doc.get("scores"),
        createdAt=doc["createdAt"],
    )


@router.post("/{job_id}/{client_id}/invite", response_model=InterviewInviteResponse)
async def invite_for_interview(
    job_id: str,
    client_id: str,
    data: Optional[InterviewInviteRequest] = None,
    user_id: str = Depends(require_auth),
):
    """
    Invite a client for an in-person interview.
    Creates/updates the interview record and sets application status.
    """
    admin = await get_interviewer_user(user_id)
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
    user_id: str = Depends(require_auth),
):
    """
    Analyze an uploaded interview video using Gate 2 ML model.
    
    - Extracts frames from video
    - Detects faces and analyzes facial expressions
    - Returns APPROVE / VERIFY / REJECT decision with emotion signals
    - Video file is NOT stored permanently (deleted after analysis)
    """
    admin = await get_interviewer_user(user_id)
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
    
    # Create temp directory for this interview
    temp_dir = Path(__file__).parent.parent.parent.parent.parent / "tmp" / "interviews" / str(interview["_id"])
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Save uploaded video to temp file
        file_extension = Path(file.filename or "video.mp4").suffix or ".mp4"
        temp_video_path = str(temp_dir / f"interview{file_extension}")
        
        content = await file.read()
        with open(temp_video_path, "wb") as f:
            f.write(content)
        
        logger.info(f"Saved temp video: {temp_video_path} ({len(content)} bytes)")
        
        # Get Gate 2 inference service
        gate2_service = get_gate2_inference_service()
        
        # Run Gate 2 video analysis in a thread to avoid blocking the event loop
        import asyncio
        result = await asyncio.to_thread(gate2_service.predict, temp_video_path)
        
        decision = result.decision_label
        
        # Ensure valid decision format
        if decision not in ["APPROVE", "VERIFY", "REJECT"]:
            decision = "VERIFY"
        
        confidence = result.confidence
        
        # Combine signals as reasons
        reasons = result.top_signals.copy() if result.top_signals else []
        
        if result.dominant_emotion and result.dominant_emotion != "unknown":
            reasons.insert(0, f"Dominant emotion: {result.dominant_emotion}")
        
        logger.info(f"Gate 2 analysis: {decision} ({confidence:.2%}), "
                   f"dominant={result.dominant_emotion}")
        
        # === DECEPTION DETECTION ===
        # Gate 1 (audio) deception: extract audio from video, then analyze
        gate1_deception_result = None
        try:
            audio_path = str(temp_dir / "interview_audio.wav")
            audio_extracted = extract_audio_from_video(temp_video_path, audio_path)
            if audio_extracted and os.path.exists(audio_path):
                deception_detector = get_deception_detector()
                with open(audio_path, "rb") as af:
                    audio_bytes = af.read()
                g1_result = await asyncio.to_thread(
                    deception_detector.predict, audio_bytes
                )
                gate1_deception_result = DeceptionAnalysis(
                    deception_label=g1_result["label"],
                    deception_confidence=g1_result["confidence"],
                    deception_scores=g1_result["scores"],
                    deception_signals=g1_result["signals"],
                    deception_model_type=g1_result["model_type"],
                )
                reasons.append(
                    f"Audio deception analysis: {g1_result['label']} "
                    f"({g1_result['confidence']:.0%})"
                )
                logger.info(
                    f"Gate 1 deception: {g1_result['label']} "
                    f"({g1_result['confidence']:.2%})"
                )
        except Exception as e:
            logger.warning(f"Gate 1 deception analysis failed: {e}")

        # Gate 2 (visual) deception: analyze video frames
        gate2_deception_result = None
        try:
            gate2_deception_service = get_gate2_deception_service()
            g2_dec_result = await asyncio.to_thread(
                gate2_deception_service.predict, temp_video_path
            )
            gate2_deception_result = DeceptionAnalysis(
                deception_label=g2_dec_result.deception_label,
                deception_confidence=g2_dec_result.deception_confidence,
                deception_scores=g2_dec_result.deception_scores,
                deception_signals=g2_dec_result.signals,
                deception_model_type=(
                    "ml" if gate2_deception_service.is_loaded else "rules"
                ),
            )
            reasons.append(
                f"Visual deception analysis: {g2_dec_result.deception_label} "
                f"({g2_dec_result.deception_confidence:.0%})"
            )
            logger.info(
                f"Gate 2 deception: {g2_dec_result.deception_label} "
                f"({g2_dec_result.deception_confidence:.2%})"
            )
        except Exception as e:
            logger.warning(f"Gate 2 deception analysis failed: {e}")
        
        # Adjust final decision based on deception results
        deception_detected = False
        if gate1_deception_result and gate1_deception_result.deception_label == "deceptive":
            if gate1_deception_result.deception_confidence >= 0.6:
                deception_detected = True
        if gate2_deception_result and gate2_deception_result.deception_label == "deceptive":
            if gate2_deception_result.deception_confidence >= 0.6:
                deception_detected = True

        if deception_detected and decision == "APPROVE":
            decision = "VERIFY"
            reasons.append(
                "Decision adjusted to VERIFY due to deception indicators"
            )

        # === SAFETY ASSESSMENT ===
        # Combine intent (from Gate 1 / CallAssessment) with deception signals
        safety_assessment_result = None
        try:
            safety_service = SafetyAssessmentService()
            
            # Try to get Gate 1 call assessment for intent data
            gate1_intent = "MEDIUM_INTENT"  # Default assumption
            gate1_intent_confidence = 0.5
            
            call_assessment = await db.call_assessments.find_one({
                "jobId": job_id,
                "clientId": client_id,
            })
            
            if call_assessment:
                # Extract intent from call assessment
                decision_label = call_assessment.get("decision", "")
                if decision_label == "PROCEED":
                    gate1_intent = "HIGH_INTENT"
                    gate1_intent_confidence = call_assessment.get("confidence", 0.7)
                elif decision_label == "VERIFY":
                    gate1_intent = "MEDIUM_INTENT"
                    gate1_intent_confidence = call_assessment.get("confidence", 0.5)
                else:  # REJECT
                    gate1_intent = "LOW_INTENT"
                    gate1_intent_confidence = call_assessment.get("confidence", 0.3)
            
            # Calculate Gate 1 safety assessment
            gate1_safety = safety_service.assess_gate1_safety(
                intent=gate1_intent,
                intent_confidence=gate1_intent_confidence,
                deception_label=gate1_deception_result.deception_label if gate1_deception_result else None,
                deception_confidence=gate1_deception_result.deception_confidence if gate1_deception_result else None,
            )
            
            # Calculate Gate 2 safety assessment
            gate2_safety = safety_service.assess_gate2_safety(
                dominant_emotion=result.dominant_emotion,
                emotion_distribution=result.emotion_distribution,
                deception_label=gate2_deception_result.deception_label if gate2_deception_result else None,
                deception_confidence=gate2_deception_result.deception_confidence if gate2_deception_result else None,
            )
            
            # Combine both assessments
            safety_assessment_result = safety_service.combine_gate_assessments(
                gate1_safety, gate2_safety
            )
            
            logger.info(
                f"Safety Assessment: {safety_assessment_result.admin_action} "
                f"(score: {safety_assessment_result.safety_score:.2f})"
            )
            
            # Add safety recommendation to reasons
            reasons.append(
                f"Safety Assessment: {safety_assessment_result.admin_action} - "
                f"{safety_assessment_result.admin_recommendation[:100]}..."
            )
            
        except Exception as e:
            logger.warning(f"Safety assessment failed: {e}")

        # Update interview record with Gate 2 results
        update_fields = {
            "interviewCompletedAt": now,
            "videoDurationSeconds": duration_seconds,
            "analysisDecision": decision,
            "confidence": confidence,
            "reasons": reasons,
            "status": "completed",
            "updatedAt": now,
            # Gate 2 specific fields
            "gate2_emotion_distribution": result.emotion_distribution,
            "gate2_dominant_emotion": result.dominant_emotion,
            "gate2_top_signals": result.top_signals,
            "gate2_stats": result.stats,
            "gate2_model_version": result.model_version,
        }

        # Add deception results if available
        if gate1_deception_result:
            update_fields["gate1_deception"] = gate1_deception_result.model_dump()
        if gate2_deception_result:
            update_fields["gate2_deception"] = gate2_deception_result.model_dump()
        
        # Add safety assessment if available
        if safety_assessment_result:
            update_fields["safety_assessment"] = safety_assessment_result.model_dump()

        await db.inperson_interviews.update_one(
            {"_id": interview["_id"]},
            {"$set": update_fields},
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
            message=f"Gate 2 analysis complete: {decision}",
            # Gate 2 specific response fields
            emotion_distribution=result.emotion_distribution,
            dominant_emotion=result.dominant_emotion,
            top_signals=result.top_signals,
            stats=Gate2AnalysisStats(**result.stats) if result.stats else None,
            model_version=result.model_version,
            # Deception detection results
            gate1_deception=gate1_deception_result,
            gate2_deception=gate2_deception_result,
            # Safety assessment
            safety_assessment=safety_assessment_result,
        )
        
    finally:
        # ALWAYS clean up temp files (privacy rule)
        if temp_video_path and os.path.exists(temp_video_path):
            try:
                os.unlink(temp_video_path)
                logger.debug(f"Deleted temp video: {temp_video_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temp video: {e}")
        
        # Clean up temp directory
        if temp_dir.exists():
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
                logger.debug(f"Cleaned up temp dir: {temp_dir}")
            except Exception as e:
                logger.warning(f"Failed to clean temp dir: {e}")


@router.get("/{job_id}/{client_id}", response_model=InterviewStatusResponse)
async def get_interview_status(
    job_id: str,
    client_id: str,
    user_id: str = Depends(require_auth),
):
    """
    Get interview status and call assessment for a job/client.
    """
    _ = await get_interviewer_user(user_id)
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
    user_id: str = Depends(require_auth),
):
    """
    Reject a client's application without interview.
    """
    _ = await get_interviewer_user(user_id)
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
