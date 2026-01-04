"""
Client profile schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    """Create/update client profile."""
    fullName: str = Field(..., min_length=2)
    villageOrDistrict: str = Field(..., min_length=2)
    contactNumber: Optional[str] = None
    typeOfWork: str = Field(...)
    availableFrom: Optional[str] = None


class ProfileResponse(BaseModel):
    """Client profile response."""
    id: str
    userId: str
    fullName: str
    villageOrDistrict: str
    contactNumber: Optional[str] = None
    typeOfWork: str
    availableFrom: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
