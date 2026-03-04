"""
Job schemas.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    """Create a new job posting."""
    title: str = Field(..., min_length=2)
    districtOrLocation: str = Field(..., min_length=2)
    startsOnText: Optional[str] = "Immediate"
    ratePerDay: int = Field(..., ge=0)
    phoneNumber: str = Field(..., min_length=9, description="Contact phone number")


class JobResponse(BaseModel):
    """Job response."""
    id: str
    createdByUserId: str
    createdByUsername: str
    title: str
    districtOrLocation: str
    startsOnText: str
    ratePerDay: int
    phoneNumber: Optional[str] = None
    status: str
    createdAt: datetime
    updatedAt: datetime


class JobListResponse(BaseModel):
    """List of jobs response."""
    jobs: List[JobResponse]
    total: int
