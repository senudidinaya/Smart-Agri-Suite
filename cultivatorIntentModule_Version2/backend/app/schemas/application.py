"""
Job application schemas.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class ApplicationCreate(BaseModel):
    """Create a job application."""
    jobId: str


class ApplicationStatusUpdate(BaseModel):
    """Update application status."""
    status: Literal["new", "contacted", "accepted", "rejected"]


class ApplicationResponse(BaseModel):
    """Job application response."""
    id: str
    jobId: str
    applicantUserId: str
    applicantName: str
    applicantDistrict: Optional[str] = None
    workType: Optional[str] = None
    availability: Optional[str] = None
    status: str
    createdAt: datetime
    updatedAt: datetime


class ApplicationListResponse(BaseModel):
    """List of applications response."""
    applications: List[ApplicationResponse]
    total: int
