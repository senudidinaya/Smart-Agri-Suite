"""
Call Task schemas for automated calling workflow.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class CallTaskCreate(BaseModel):
    """Internal model for creating call tasks."""
    jobId: str
    clientId: str
    applicationId: str
    status: Literal["NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "QUEUED", "CANCELLED"] = "NEW"
    assignedAdminId: Optional[str] = None
    scheduledDate: str  # "YYYY-MM-DD" in Asia/Colombo
    createdAt: datetime
    updatedAt: datetime


class CallTaskOut(BaseModel):
    """API response model for call tasks."""
    id: str
    jobId: str
    clientId: str
    applicationId: str
    status: Literal["NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "QUEUED", "CANCELLED"]
    assignedAdminId: Optional[str] = None
    scheduledDate: str
    createdAt: datetime
    updatedAt: datetime