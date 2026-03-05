"""
Call schemas for audio calling feature with Agora RTC.
"""

from datetime import datetime
from typing import Optional, Dict, Literal
from pydantic import BaseModel, Field


# Call status types
CallStatus = Literal["ringing", "accepted", "rejected", "ended", "missed"]


class CallInitiate(BaseModel):
    """Request to initiate a call."""
    jobId: str = Field(..., description="Job ID to call about")


class AgoraTokenInfo(BaseModel):
    """Agora RTC token and connection info."""
    appId: str = Field(..., description="Agora App ID")
    channelName: str = Field(..., description="Agora channel name")
    token: str = Field(..., description="Agora RTC token")
    uid: int = Field(..., description="User ID for this participant")


class CallInitiateResponse(BaseModel):
    """Response after initiating a call with Agora connection info."""
    callId: str
    agora: AgoraTokenInfo
    # Legacy fields for backwards compatibility
    roomName: str  # Same as channelName
    livekitUrl: str  # Deprecated, kept for compatibility
    token: str  # Same as agora.token


class IncomingCallResponse(BaseModel):
    """Response for incoming call check."""
    hasIncomingCall: bool
    callId: Optional[str] = None
    jobId: Optional[str] = None
    jobTitle: Optional[str] = None
    adminUsername: Optional[str] = None
    # Agora connection info
    agora: Optional[AgoraTokenInfo] = None
    # Legacy fields
    roomName: Optional[str] = None
    livekitUrl: Optional[str] = None


class CallAcceptResponse(BaseModel):
    """Response after accepting a call with Agora connection info."""
    agora: AgoraTokenInfo
    # Legacy fields
    roomName: str
    livekitUrl: str
    token: str


class AnalysisResult(BaseModel):
    """ML analysis result for call recording."""
    intentLabel: str
    confidence: float
    scores: Optional[Dict[str, float]] = None
    analyzedAt: datetime


class RecordingUploadResponse(BaseModel):
    """Response after uploading a call recording."""
    success: bool
    intentLabel: str
    confidence: float
    scores: Optional[Dict[str, float]] = None
    message: str


class CloudRecordingInfo(BaseModel):
    """Agora Cloud Recording session info."""
    resourceId: str
    sid: str
    recordingUid: int
    status: str = "recording"


class CallResponse(BaseModel):
    """Full call response model."""
    id: str
    jobId: str
    adminUserId: str
    clientUserId: str
    channelName: str
    status: CallStatus
    createdAt: datetime
    updatedAt: datetime
    startedAt: Optional[datetime] = None
    endedAt: Optional[datetime] = None
    recording: Optional[Dict] = None
    cloudRecording: Optional[CloudRecordingInfo] = None
    analysis: Optional[AnalysisResult] = None
    # Legacy
    roomName: Optional[str] = None


class CallStatusUpdate(BaseModel):
    """Update call status."""
    status: CallStatus


class StartRecordingRequest(BaseModel):
    """Request to start cloud recording for a call."""
    callId: str


class StartRecordingResponse(BaseModel):
    """Response after starting cloud recording."""
    success: bool
    resourceId: Optional[str] = None
    sid: Optional[str] = None
    message: str


class StopRecordingResponse(BaseModel):
    """Response after stopping cloud recording."""
    success: bool
    fileList: Optional[list] = None
    message: str

