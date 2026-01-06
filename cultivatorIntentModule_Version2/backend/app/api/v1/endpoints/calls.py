"""
Audio calling endpoints using LiveKit.
Allows admin to initiate calls to clients with recording support.
"""

import os
import time
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, BackgroundTasks
from livekit import api

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
)
from app.services.inference import get_classifier

logger = get_logger(__name__)
router = APIRouter(prefix="/calls", tags=["Calls"])

# Timeout for missed calls (seconds)
CALL_TIMEOUT_SECONDS = 30


def get_user_from_token(authorization: str) -> dict:
    """Extract and verify user from authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload


def generate_livekit_token(room_name: str, participant_identity: str, participant_name: str) -> str:
    """Generate a LiveKit access token for a participant."""
    settings = get_settings()
    
    if not settings.livekit_api_key or not settings.livekit_api_secret:
        raise HTTPException(
            status_code=500, 
            detail="LiveKit not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET."
        )
    
    # Create access token
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    token.with_identity(participant_identity)
    token.with_name(participant_name)
    
    # Grant permissions for the room
    grant = api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
    )
    token.with_grants(grant)
    
    # Set token TTL (1 hour) - must be timedelta
    token.with_ttl(timedelta(hours=1))
    
    return token.to_jwt()


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
    Initiate a call to a client.
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
    
    # Create unique room name
    call_id = str(ObjectId())
    room_name = f"job-{data.jobId}-call-{call_id}"
    
    # Generate tokens for both participants
    admin_token = generate_livekit_token(
        room_name=room_name,
        participant_identity=f"admin-{user['sub']}",
        participant_name="Admin"
    )
    client_token = generate_livekit_token(
        room_name=room_name,
        participant_identity=f"client-{client_user_id}",
        participant_name=job.get("createdByUsername", "Client")
    )
    
    # Create call record
    call_doc = {
        "_id": ObjectId(call_id),
        "jobId": data.jobId,
        "adminUserId": user["sub"],
        "clientUserId": client_user_id,
        "roomName": room_name,
        "clientToken": client_token,  # Store for client to retrieve
        "status": "ringing",
        "createdAt": now,
        "updatedAt": now,
        "startedAt": None,
        "endedAt": None,
        "recording": None,
        "analysis": None,
    }
    
    await db.calls.insert_one(call_doc)
    
    # Schedule background task to check for missed calls
    background_tasks.add_task(check_missed_calls)
    
    logger.info(f"Call initiated: {call_id} for job {data.jobId}")
    
    return CallInitiateResponse(
        callId=call_id,
        roomName=room_name,
        livekitUrl=settings.livekit_url,
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
    settings = get_settings()
    
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
    
    return IncomingCallResponse(
        hasIncomingCall=True,
        callId=str(call["_id"]),
        jobId=call["jobId"],
        jobTitle=job_title,
        roomName=call["roomName"],
        livekitUrl=settings.livekit_url,
        adminUsername=admin_username,
    )


@router.post("/{call_id}/accept", response_model=CallAcceptResponse)
async def accept_call(
    call_id: str,
    authorization: str = Header(...)
):
    """
    Accept an incoming call.
    Only the target client can accept.
    """
    user = get_user_from_token(authorization)
    
    db = get_db()
    settings = get_settings()
    
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
    
    return CallAcceptResponse(
        roomName=call["roomName"],
        livekitUrl=settings.livekit_url,
        token=call["clientToken"],
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
    authorization: str = Header(...)
):
    """
    Upload a call recording and trigger ML analysis.
    Only the client (who recorded) can upload.
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
    
    # Run ML analysis on the recording
    try:
        classifier = get_classifier()
        if not classifier.is_loaded:
            classifier.load_model()
        
        prediction_result, audio_duration = classifier.predict(contents)
        
        analysis = {
            "intentLabel": prediction_result.predicted_intent,
            "confidence": prediction_result.confidence,
            "scores": {score.label: score.score for score in prediction_result.all_scores},
            "analyzedAt": now,
        }
        
        logger.info(f"Analysis complete for call {call_id}: {prediction_result.predicted_intent}")
        
    except Exception as e:
        logger.error(f"ML analysis failed: {e}")
        # Default analysis on failure
        analysis = {
            "intentLabel": "unknown",
            "confidence": 0.0,
            "scores": {},
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
    
    return CallResponse(
        id=str(call["_id"]),
        jobId=call["jobId"],
        adminUserId=call["adminUserId"],
        clientUserId=call["clientUserId"],
        roomName=call["roomName"],
        status=call["status"],
        createdAt=call["createdAt"],
        updatedAt=call["updatedAt"],
        startedAt=call.get("startedAt"),
        endedAt=call.get("endedAt"),
        recording=call.get("recording"),
        analysis=call.get("analysis"),
    )
