"""
Call schemas for audio calling feature.
"""

from datetime import datetime
from typing import Optional, Dict, Literal
from pydantic import BaseModel, Field


# Call status types
CallStatus = Literal["ringing", "accepted", "rejected", "ended", "missed"]


class CallInitiate(BaseModel):
    """Request to initiate a call."""
    jobId: str = Field(..., description="Job ID to call about")


class CallInitiateResponse(BaseModel):
    """Response after initiating a call."""
    callId: str
    roomName: str
    livekitUrl: str
    token: str  # Admin's LiveKit token


class IncomingCallResponse(BaseModel):
    """Response for incoming call check."""
    hasIncomingCall: bool
    callId: Optional[str] = None
    jobId: Optional[str] = None
    jobTitle: Optional[str] = None
    roomName: Optional[str] = None
    livekitUrl: Optional[str] = None
    adminUsername: Optional[str] = None


class CallAcceptResponse(BaseModel):
    """Response after accepting a call."""
    roomName: str
    livekitUrl: str
    token: str  # Client's LiveKit token


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


class CallResponse(BaseModel):
    """Full call response model."""
    id: str
    jobId: str
    adminUserId: str
    clientUserId: str
    roomName: str
    status: CallStatus
    createdAt: datetime
    updatedAt: datetime
    startedAt: Optional[datetime] = None
    endedAt: Optional[datetime] = None
    recording: Optional[Dict] = None
    analysis: Optional[AnalysisResult] = None


class CallStatusUpdate(BaseModel):
    """Update call status."""
    status: CallStatus
