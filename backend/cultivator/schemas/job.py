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
    priorExperience: str = Field(..., description="Plantation prior experience")


class JobResponse(BaseModel):
    """Job response."""
    id: str
    createdByUserId: str
    createdByUsername: str
    title: str
    districtOrLocation: str
    startsOnText: str
    priorExperience: str
    status: str
    createdAt: datetime
    updatedAt: datetime


class JobListResponse(BaseModel):
    """List of jobs response."""
    jobs: List[JobResponse]
    total: int
