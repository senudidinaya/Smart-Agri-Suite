"""
Notification schemas for the Smart Agri-Suite.
Simple in-app notification system for clients.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class NotificationBase(BaseModel):
    """Base notification fields."""
    type: str = Field(..., description="Notification type: interview_invite, application_update, etc.")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message body")
    jobId: Optional[str] = Field(None, description="Related job ID if applicable")
    jobTitle: Optional[str] = Field(None, description="Related job title for display")


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""
    userId: str = Field(..., description="User ID to receive notification")


class NotificationResponse(NotificationBase):
    """Notification response schema."""
    id: str = Field(..., description="Notification ID")
    userId: str = Field(..., description="User ID")
    isRead: bool = Field(False, description="Whether notification has been read")
    createdAt: datetime = Field(..., description="When notification was created")

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Response for list of notifications."""
    notifications: List[NotificationResponse]
    unreadCount: int
    total: int


class MarkReadRequest(BaseModel):
    """Request to mark notifications as read."""
    notificationIds: Optional[List[str]] = Field(None, description="Specific IDs to mark read, or None for all")
