"""
In-person interview schemas for video analysis workflow.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ==============================================================================
# APPLICATION STATUS ENUM (Extended)
# ==============================================================================

ApplicationStatus = Literal[
    "new",
    "contacted",
    "invited_interview",
    "interview_done",
    "approved",
    "rejected",
    "verify_required",
]

InterviewDecision = Literal["APPROVE", "VERIFY", "REJECT"]


# ==============================================================================
# CALL ASSESSMENT SCHEMAS
# ==============================================================================

class CallAssessmentCreate(BaseModel):
    """Create a call assessment record."""
    jobId: str
    clientId: str
    decision: Literal["PROCEED", "VERIFY", "REJECT"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasons: List[str] = []


class CallAssessmentResponse(BaseModel):
    """Call assessment response."""
    id: str
    jobId: str
    clientId: str
    adminId: str
    callStartedAt: Optional[datetime] = None
    callEndedAt: Optional[datetime] = None
    decision: str
    confidence: float
    reasons: List[str]
    createdAt: datetime


# ==============================================================================
# IN-PERSON INTERVIEW SCHEMAS
# ==============================================================================

class InterviewInviteRequest(BaseModel):
    """Request to invite client for in-person interview."""
    scheduledAt: Optional[datetime] = None
    notes: Optional[str] = None


class InterviewInviteResponse(BaseModel):
    """Response after inviting for interview."""
    success: bool
    message: str
    interviewId: str
    applicationStatus: str


class InterviewAnalysisResult(BaseModel):
    """Result of video analysis."""
    decision: InterviewDecision
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasons: List[str] = []


class InterviewAnalyzeResponse(BaseModel):
    """Response after analyzing interview video."""
    success: bool
    interviewId: str
    decision: InterviewDecision
    confidence: float
    reasons: List[str]
    applicationStatus: str
    message: str


class InterviewResponse(BaseModel):
    """Full interview record response."""
    id: str
    jobId: str
    clientId: str
    adminId: str
    interviewScheduledAt: Optional[datetime] = None
    interviewCompletedAt: Optional[datetime] = None
    videoDurationSeconds: Optional[float] = None
    analysisDecision: Optional[InterviewDecision] = None
    confidence: Optional[float] = None
    reasons: List[str] = []
    status: str  # pending, completed
    createdAt: datetime


class InterviewStatusResponse(BaseModel):
    """Interview status with latest analysis."""
    hasInterview: bool
    interview: Optional[InterviewResponse] = None
    callAssessment: Optional[CallAssessmentResponse] = None


# ==============================================================================
# CLIENT PROFILE SCHEMAS (Extended)
# ==============================================================================

class ClientProfileCreate(BaseModel):
    """Create/update client profile."""
    fullName: str = Field(..., min_length=2)
    contactNumber: str = Field(..., min_length=9)
    address: Optional[str] = None
    districtOrVillage: Optional[str] = None
    age: Optional[int] = Field(None, ge=18, le=120)


class ClientProfileResponse(BaseModel):
    """Client profile response."""
    id: str
    userId: str
    fullName: str
    contactNumber: Optional[str] = None
    address: Optional[str] = None
    districtOrVillage: Optional[str] = None
    age: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime


# ==============================================================================
# JOB APPLICATION EXTENDED STATUS
# ==============================================================================

class ApplicationStatusUpdate(BaseModel):
    """Update application status (extended)."""
    status: ApplicationStatus


class ApplicationWithInterviewResponse(BaseModel):
    """Application with interview and call assessment info."""
    id: str
    jobId: str
    jobTitle: str
    applicantUserId: str
    applicantName: str
    applicantDistrict: Optional[str] = None
    applicantPhone: Optional[str] = None
    status: str
    callAssessment: Optional[CallAssessmentResponse] = None
    interview: Optional[InterviewResponse] = None
    createdAt: datetime
    updatedAt: datetime
