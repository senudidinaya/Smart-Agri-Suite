"""
User schemas for authentication and user management.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    """User registration request."""
    fullName: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    address: Optional[str] = Field(None, max_length=200)
    age: Optional[int] = Field(None, ge=18, le=100)
    password: str = Field(..., min_length=4)
    role: Literal["client", "admin"] = "client"


class UserLogin(BaseModel):
    """User login request."""
    username: str
    password: str
    rememberMe: bool = False


class UserResponse(BaseModel):
    """User response (without password)."""
    id: str
    fullName: str
    username: str
    email: str
    address: Optional[str] = None
    age: Optional[int] = None
    role: str
    createdAt: datetime


class LoginResponse(BaseModel):
    """Login response with token."""
    token: str
    user: UserResponse


class MessageResponse(BaseModel):
    """Simple message response."""
    success: bool
    message: str
