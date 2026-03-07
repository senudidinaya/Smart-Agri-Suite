"""
Audio calling endpoints with Agora RTC integration.
Allows admin to initiate calls to clients with cloud recording support.

Agora Integration:
- Uses Agora RTC for real-time voice communication
- Supports cloud recording for automated analysis
- Client-side local recording as fallback
"""

import os
import time
import uuid
import asyncio
import base64
import hashlib
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form, BackgroundTasks

from app.core.database import get_db
from app.core.config import get_settings
from app.core.auth import verify_token
from app.core.logging import get_logger
from app.schemas.call import (
    CallInitiate,
    CallInitiateResponse,
    IncomingCallResponse,
    CallAcceptResponse,
    RecordingUploadResponse,
    CallResponse,
    AgoraTokenInfo,
    StartRecordingRequest,
    StartRecordingResponse,
    StopRecordingResponse,
)
from app.services.inference import get_classifier
from app.services.agora import (
    generate_agora_token,
    get_agora_app_id,
    get_cloud_recording,
    RtcTokenRole,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/calls", tags=["Calls"])

# Timeout for missed calls (seconds) - increased to 2 minutes to allow time for legal notice
CALL_TIMEOUT_SECONDS = 120

# UID ranges for Agora (to distinguish admin, client, recording bot)
ADMIN_UID_BASE = 1000
CLIENT_UID_BASE = 2000
RECORDING_UID_BASE = 9000


def get_user_from_token(authorization: str) -> dict:
    """Extract and verify user from authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload


def generate_uid_from_user_id(user_id: str, base: int) -> int:
    """Generate a consistent Agora UID from a user ID string."""
    # Create a hash of the user_id and take last 8 digits
    hash_val = int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16)
    return base + (hash_val % 1000)


async def check_missed_calls():
    """Background task to mark timed-out calls as missed."""
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # Find ringing calls older than timeout
    timeout_threshold = datetime.fromtimestamp(
        now.timestamp() - CALL_TIMEOUT_SECONDS, 
        tz=timezone.utc
    )
    
    result = await db.calls.update_many(
        {
            "status": "ringing",
            "createdAt": {"$lt": timeout_threshold}
        },
        {
            "$set": {
                "status": "missed",
                "updatedAt": now
            }
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"Marked {result.modified_count} calls as missed")


@router.post("/initiate", response_model=CallInitiateResponse)
async def initiate_call(
    data: CallInitiate,
    background_tasks: BackgroundTasks,
    authorization: str = Header(...)
):
    """
    Initiate a call to a client using Agora RTC.
    Only admin can initiate calls.
    """
    user = get_user_from_token(authorization)
    
    # Only admin can initiate calls
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can initiate calls")
    
    db = get_db()
    settings = get_settings()
    
    # Get the job to find the client
    job = await db.jobs.find_one({"_id": ObjectId(data.jobId)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    client_user_id = job["createdByUserId"]
    
    # Check if there's already an active call for this job
    existing_call = await db.calls.find_one({
        "jobId": data.jobId,
        "status": {"$in": ["ringing", "accepted"]}
    })
    if existing_call:
        raise HTTPException(status_code=400, detail="There's already an active call for this job")
    
    now = datetime.now(timezone.utc)
    
    # Create unique channel name for Agora
    call_id = str(ObjectId())
    channel_name = f"job_{data.jobId[:8]}_{call_id[:8]}"
    
    # Generate UIDs for participants
    admin_uid = generate_uid_from_user_id(user["sub"], ADMIN_UID_BASE)
    client_uid = generate_uid_from_user_id(client_user_id, CLIENT_UID_BASE)
    recording_uid = generate_uid_from_user_id(call_id, RECORDING_UID_BASE)
    
    # Generate Agora RTC tokens
    admin_token = generate_agora_token(
        channel_name=channel_name,
        uid=admin_uid,
        role=RtcTokenRole.PUBLISHER,
        expire_seconds=3600
    )
    client_token = generate_agora_token(
        channel_name=channel_name,
        uid=client_uid,
        role=RtcTokenRole.PUBLISHER,
        expire_seconds=3600
    )
    
    agora_app_id = get_agora_app_id()
    
    # Create call record
    call_doc = {
        "_id": ObjectId(call_id),
        "jobId": data.jobId,
        "adminUserId": user["sub"],
        "clientUserId": client_user_id,
        "channelName": channel_name,
        "roomName": channel_name,  # Legacy field
        "adminUid": admin_uid,
        "clientUid": client_uid,
        "recordingUid": recording_uid,
        "clientToken": client_token,  # Store for client to retrieve
        "status": "ringing",
        "createdAt": now,
        "updatedAt": now,
        "startedAt": None,
        "endedAt": None,
        "recording": None,
        "cloudRecording": None,
        "analysis": None,
    }
    
    await db.calls.insert_one(call_doc)
    
    # Schedule background task to check for missed calls
    background_tasks.add_task(check_missed_calls)
    
    logger.info(f"Call initiated: {call_id} for job {data.jobId} via Agora channel {channel_name}")
    
    return CallInitiateResponse(
        callId=call_id,
        agora=AgoraTokenInfo(
            appId=agora_app_id,
            channelName=channel_name,
            token=admin_token,
            uid=admin_uid,
        ),
        # Legacy fields
        roomName=channel_name,
        livekitUrl="",  # Deprecated
        token=admin_token,
    )


@router.get("/incoming", response_model=IncomingCallResponse)
async def check_incoming_call(
    authorization: str = Header(...)
):
    """
    Check if there's an incoming call for the current client.
    Called by client polling.
    """
    user = get_user_from_token(authorization)
    client_user_id = user["sub"]
    
    db = get_db()
    
    # Find a ringing call for this client
    call = await db.calls.find_one({
        "clientUserId": client_user_id,
        "status": "ringing"
    })
    
    if not call:
        return IncomingCallResponse(hasIncomingCall=False)
    
    # Get job details for context
    job = await db.jobs.find_one({"_id": ObjectId(call["jobId"])})
    job_title = job.get("title", "Unknown Job") if job else "Unknown Job"
    
    # Get admin username
    admin_user = await db.users.find_one({"_id": ObjectId(call["adminUserId"])})
    admin_username = admin_user.get("username", "Admin") if admin_user else "Admin"
    
    # Get Agora connection info
    channel_name = call.get("channelName", call.get("roomName", ""))
    client_uid = call.get("clientUid", 0)
    agora_app_id = get_agora_app_id()
    
    return IncomingCallResponse(
        hasIncomingCall=True,
        callId=str(call["_id"]),
        jobId=call["jobId"],
        jobTitle=job_title,
        adminUsername=admin_username,
        agora=AgoraTokenInfo(
            appId=agora_app_id,
            channelName=channel_name,
            token=call.get("clientToken", ""),
            uid=client_uid,
        ),
        # Legacy fields
        roomName=channel_name,
        livekitUrl="",
    )


@router.post("/{call_id}/accept", response_model=CallAcceptResponse)
async def accept_call(
    call_id: str,
    authorization: str = Header(...)
):
    """
    Accept an incoming call and join the Agora channel.
    Only the target client can accept.
    """
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    # Find the call
    call = await db.calls.find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Verify this is the target client
    if call["clientUserId"] != user["sub"]:
        raise HTTPException(status_code=403, detail="You cannot accept this call")
    
    # Verify call is still ringing
    if call["status"] != "ringing":
        raise HTTPException(status_code=400, detail=f"Call is not ringing (status: {call['status']})")
    
    now = datetime.now(timezone.utc)
    
    # Update call status
    await db.calls.update_one(
        {"_id": ObjectId(call_id)},
        {
            "$set": {
                "status": "accepted",
                "startedAt": now,
                "updatedAt": now,
            }
        }
    )
    
    logger.info(f"Call accepted: {call_id}")
    
    # Get Agora connection info
    channel_name = call.get("channelName", call.get("roomName", ""))
    client_uid = call.get("clientUid", 0)
    agora_app_id = get_agora_app_id()
    
    return CallAcceptResponse(
        agora=AgoraTokenInfo(
            appId=agora_app_id,
            channelName=channel_name,
            token=call.get("clientToken", ""),
            uid=client_uid,
        ),
        # Legacy fields
        roomName=channel_name,
        livekitUrl="",
        token=call.get("clientToken", ""),
    )


@router.post("/{call_id}/reject")
async def reject_call(
    call_id: str,
    authorization: str = Header(...)
):
    """
    Reject an incoming call.
    Only the target client can reject.
    """
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    # Find the call
    call = await db.calls.find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Verify this is the target client
    if call["clientUserId"] != user["sub"]:
        raise HTTPException(status_code=403, detail="You cannot reject this call")
    
    # Verify call is still ringing
    if call["status"] != "ringing":
        raise HTTPException(status_code=400, detail=f"Call is not ringing (status: {call['status']})")
    
    now = datetime.now(timezone.utc)
    
    # Update call status
    await db.calls.update_one(
        {"_id": ObjectId(call_id)},
        {
            "$set": {
                "status": "rejected",
                "updatedAt": now,
            }
        }
    )
    
    logger.info(f"Call rejected: {call_id}")
    
    return {"success": True, "message": "Call rejected"}


@router.post("/{call_id}/end")
async def end_call(
    call_id: str,
    authorization: str = Header(...)
):
    """
    End an active call.
    Either admin or client can end the call.
    """
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    # Find the call
    call = await db.calls.find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Verify user is part of this call
    if call["clientUserId"] != user["sub"] and call["adminUserId"] != user["sub"]:
        raise HTTPException(status_code=403, detail="You are not part of this call")
    
    # Verify call is active
    if call["status"] not in ["ringing", "accepted"]:
        raise HTTPException(status_code=400, detail=f"Call is not active (status: {call['status']})")
    
    now = datetime.now(timezone.utc)
    
    # Update call status
    await db.calls.update_one(
        {"_id": ObjectId(call_id)},
        {
            "$set": {
                "status": "ended",
                "endedAt": now,
                "updatedAt": now,
            }
        }
    )
    
    logger.info(f"Call ended: {call_id}")
    
    return {"success": True, "message": "Call ended"}


@router.post("/{call_id}/recording", response_model=RecordingUploadResponse)
async def upload_recording(
    call_id: str,
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(None),
    authorization: str = Header(...)
):
    """
    Upload a call recording and trigger ML analysis.
    Only the client (who recorded) can upload.
    Optionally include a transcript for improved text-based analysis.
    """
    user = get_user_from_token(authorization)
    
    db = get_db()
    settings = get_settings()
    
    # Find the call
    call = await db.calls.find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Verify this is the client
    if call["clientUserId"] != user["sub"]:
        raise HTTPException(status_code=403, detail="Only the client can upload recordings")
    
    # Verify call has ended
    if call["status"] != "ended":
        raise HTTPException(status_code=400, detail="Can only upload recording after call ends")
    
    # Create recordings directory if it doesn't exist
    recordings_dir = settings.recordings_dir
    recordings_dir.mkdir(parents=True, exist_ok=True)
    
    # Save the file
    file_extension = file.filename.split(".")[-1] if file.filename else "wav"
    recording_filename = f"{call_id}.{file_extension}"
    recording_path = recordings_dir / recording_filename
    
    try:
        contents = await file.read()
        with open(recording_path, "wb") as f:
            f.write(contents)
        
        logger.info(f"Recording saved: {recording_path}")
    except Exception as e:
        logger.error(f"Failed to save recording: {e}")
        raise HTTPException(status_code=500, detail="Failed to save recording")
    
    now = datetime.now(timezone.utc)
    
    # Run ML analysis on the recording (Intent Classification + Deception Detection)
    try:
        # Step 1: Intent Classification
        classifier = get_classifier()
        if not classifier.is_loaded:
            classifier.load_model()
        
        prediction_result, audio_duration = classifier.predict(contents, transcript=transcript)
        
        intent_analysis = {
            "intentLabel": prediction_result.predicted_intent,
            "confidence": prediction_result.confidence,
            "scores": {score.label: score.score for score in prediction_result.all_scores},
        }
        
        # Step 2: Deception Analysis (NEW)
        from app.services.inference import get_deception_detector
        deception_detector = get_deception_detector()
        if not deception_detector.is_loaded:
            deception_detector.load_model()
        
        deception_result = deception_detector.predict(contents)
        
        # Step 3: Combine Intent + Deception Analysis (NEW)
        from app.services.combined_analysis import combine_intent_and_deception
        
        combined_decision = combine_intent_and_deception(
            intent_analysis,
            deception_result,
        )
        
        # Store combined analysis
        analysis = {
            "intentLabel": intent_analysis["intentLabel"],
            "confidence": intent_analysis["confidence"],
            "scores": intent_analysis["scores"],
            "deceptionLabel": deception_result.get("label", "unknown"),
            "deceptionConfidence": deception_result.get("confidence", 0.0),
            "deceptionSignals": deception_result.get("signals", []),
            "finalDecision": combined_decision.get("finalDecision"),
            "finalRecommendation": combined_decision.get("recommendation"),
            "trustScore": combined_decision.get("trustScore", 0.0),
            "reasoning": combined_decision.get("reasoning"),
            "riskLevel": combined_decision.get("riskLevel", "MEDIUM"),
            "analyzedAt": now,
        }
        
        logger.info(
            f"Analysis complete for call {call_id}: Intent={intent_analysis['intentLabel']}, "
            f"Truthfulness={deception_result.get('label')}, "
            f"FinalDecision={combined_decision.get('finalDecision')}"
        )
        
    except Exception as e:
        logger.error(f"ML analysis failed: {e}")
        # Default analysis on failure
        analysis = {
            "intentLabel": "unknown",
            "confidence": 0.0,
            "scores": {},
            "finalDecision": "VERIFY",
            "finalRecommendation": "manual_verify",
            "reasoning": "Analysis failed - manual review required",
            "riskLevel": "MEDIUM",
            "analyzedAt": now,
        }
    
    # Update call record with recording info and analysis
    await db.calls.update_one(
        {"_id": ObjectId(call_id)},
        {
            "$set": {
                "recording": {
                    "backendFilePath": str(recording_path),
                    "uploadedAt": now,
                },
                "analysis": analysis,
                "updatedAt": now,
            }
        }
    )
    
    # Also save to call_assessments collection for interview workflow
    call_assessment = {
        "jobId": call["jobId"],
        "clientId": call["clientUserId"],
        "adminId": call["adminUserId"],
        "callStartedAt": call.get("startedAt"),
        "callEndedAt": call.get("endedAt"),
        "decision": analysis.get("finalDecision", analysis.get("intentLabel", "unknown")),
        "recommendation": analysis.get("finalRecommendation", "manual_verify"),
        "confidence": analysis.get("confidence", 0.0),
        "trustScore": analysis.get("trustScore", 0.0),
        "riskLevel": analysis.get("riskLevel", "MEDIUM"),
        "reasoning": analysis.get("reasoning", ""),
        "reasons": list(analysis.get("scores", {}).keys()),
        "scores": analysis.get("scores", {}),
        "deceptionLabel": analysis.get("deceptionLabel"),
        "deceptionConfidence": analysis.get("deceptionConfidence"),
        "createdAt": now,
    }
    
    # Upsert call assessment
    await db.call_assessments.update_one(
        {"jobId": call["jobId"], "clientId": call["clientUserId"]},
        {"$set": call_assessment},
        upsert=True
    )
    
    # Delete the recording file after successful analysis and database update
    try:
        if recording_path.exists():
            recording_path.unlink()
            logger.info(f"Recording deleted after analysis: {recording_path}")
    except Exception as e:
        logger.error(f"Failed to delete recording file: {e}")
        # Don't fail the request if deletion fails
    
    return RecordingUploadResponse(
        success=True,
        intentLabel=analysis["intentLabel"],
        confidence=analysis["confidence"],
        scores=analysis["scores"],
        message="Recording uploaded and analyzed successfully",
    )


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: str,
    authorization: str = Header(...)
):
    """Get call details."""
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    call = await db.calls.find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Verify user is part of this call or is admin
    if call["clientUserId"] != user["sub"] and call["adminUserId"] != user["sub"]:
        raise HTTPException(status_code=403, detail="You are not part of this call")
    
    channel_name = call.get("channelName", call.get("roomName", ""))
    
    return CallResponse(
        id=str(call["_id"]),
        jobId=call["jobId"],
        adminUserId=call["adminUserId"],
        clientUserId=call["clientUserId"],
        channelName=channel_name,
        status=call["status"],
        createdAt=call["createdAt"],
        updatedAt=call["updatedAt"],
        startedAt=call.get("startedAt"),
        endedAt=call.get("endedAt"),
        recording=call.get("recording"),
        cloudRecording=call.get("cloudRecording"),
        analysis=call.get("analysis"),
        roomName=channel_name,  # Legacy
    )


@router.post("/{call_id}/recording/start", response_model=StartRecordingResponse)
async def start_cloud_recording(
    call_id: str,
    authorization: str = Header(...)
):
    """
    Start Agora cloud recording for a call.
    This records the audio stream server-side.
    Only admin can start cloud recording.
    """
    user = get_user_from_token(authorization)
    
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can start cloud recording")
    
    db = get_db()
    
    call = await db.calls.find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    if call["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Can only record active calls")
    
    if call.get("cloudRecording"):
        return StartRecordingResponse(
            success=True,
            resourceId=call["cloudRecording"].get("resourceId"),
            sid=call["cloudRecording"].get("sid"),
            message="Cloud recording already active"
        )
    
    channel_name = call.get("channelName", call.get("roomName", ""))
    recording_uid = call.get("recordingUid", RECORDING_UID_BASE)
    
    # Generate token for recording bot
    recording_token = generate_agora_token(
        channel_name=channel_name,
        uid=recording_uid,
        role=RtcTokenRole.SUBSCRIBER,
        expire_seconds=7200
    )
    
    cloud_recording = get_cloud_recording()
    
    # Acquire resource
    resource_id = await cloud_recording.acquire_resource(
        channel_name=channel_name,
        uid=recording_uid
    )
    
    if not resource_id:
        return StartRecordingResponse(
            success=False,
            message="Failed to acquire recording resource"
        )
    
    # Start recording
    result = await cloud_recording.start_recording(
        resource_id=resource_id,
        channel_name=channel_name,
        uid=recording_uid,
        token=recording_token
    )
    
    if not result:
        return StartRecordingResponse(
            success=False,
            resourceId=resource_id,
            message="Failed to start cloud recording"
        )
    
    resource_id, sid = result
    now = datetime.now(timezone.utc)
    
    # Update call with recording info
    await db.calls.update_one(
        {"_id": ObjectId(call_id)},
        {
            "$set": {
                "cloudRecording": {
                    "resourceId": resource_id,
                    "sid": sid,
                    "recordingUid": recording_uid,
                    "status": "recording",
                    "startedAt": now,
                },
                "updatedAt": now,
            }
        }
    )
    
    logger.info(f"Cloud recording started for call {call_id}: sid={sid}")
    
    return StartRecordingResponse(
        success=True,
        resourceId=resource_id,
        sid=sid,
        message="Cloud recording started"
    )


@router.post("/{call_id}/recording/stop", response_model=StopRecordingResponse)
async def stop_cloud_recording(
    call_id: str,
    authorization: str = Header(...)
):
    """
    Stop Agora cloud recording for a call.
    Returns information about the recorded files.
    """
    user = get_user_from_token(authorization)
    
    db = get_db()
    
    call = await db.calls.find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Verify user is part of this call
    if call["clientUserId"] != user["sub"] and call["adminUserId"] != user["sub"]:
        raise HTTPException(status_code=403, detail="You are not part of this call")
    
    cloud_recording_info = call.get("cloudRecording")
    if not cloud_recording_info:
        return StopRecordingResponse(
            success=False,
            message="No cloud recording active for this call"
        )
    
    channel_name = call.get("channelName", call.get("roomName", ""))
    recording_uid = cloud_recording_info.get("recordingUid", RECORDING_UID_BASE)
    resource_id = cloud_recording_info.get("resourceId")
    sid = cloud_recording_info.get("sid")
    
    cloud_recording = get_cloud_recording()
    
    result = await cloud_recording.stop_recording(
        resource_id=resource_id,
        sid=sid,
        channel_name=channel_name,
        uid=recording_uid
    )
    
    now = datetime.now(timezone.utc)
    
    file_list = result.get("fileList", []) if result else []
    
    # Update call with recording result
    await db.calls.update_one(
        {"_id": ObjectId(call_id)},
        {
            "$set": {
                "cloudRecording.status": "stopped",
                "cloudRecording.stoppedAt": now,
                "cloudRecording.fileList": file_list,
                "updatedAt": now,
            }
        }
    )
    
    logger.info(f"Cloud recording stopped for call {call_id}")
    
    return StopRecordingResponse(
        success=True,
        fileList=file_list,
        message="Cloud recording stopped"
    )

