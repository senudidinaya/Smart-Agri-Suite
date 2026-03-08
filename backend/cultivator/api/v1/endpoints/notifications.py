"""
Notification endpoints for the Smart Agri-Suite.
Simple in-app notification system for clients.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from cultivator.core.database import get_db
from cultivator.core.logging import get_logger
from auth_utils import require_auth
from cultivator.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MarkReadRequest,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


async def get_current_user(user_id: str) -> dict:
    """Resolve authenticated user details."""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "sub": user_id,
        "username": user.get("username", "unknown"),
        "role": user.get("role", "client"),
    }


def _serialize_notification(doc: dict) -> NotificationResponse:
    """Convert MongoDB document to NotificationResponse."""
    return NotificationResponse(
        id=str(doc["_id"]),
        userId=doc["userId"],
        type=doc["type"],
        title=doc["title"],
        message=doc["message"],
        jobId=doc.get("jobId"),
        jobTitle=doc.get("jobTitle"),
        isRead=doc.get("isRead", False),
        createdAt=doc["createdAt"],
    )


async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    job_id: Optional[str] = None,
    job_title: Optional[str] = None,
) -> Optional[str]:
    """
    Helper function to create a notification.
    Can be called from other endpoints (like interviews).
    
    Returns notification ID if successful, None otherwise.
    """
    db = get_db()
    if db is None:
        logger.warning("Cannot create notification - database not connected")
        return None
    
    now = datetime.now(timezone.utc)
    
    notification_doc = {
        "userId": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "jobId": job_id,
        "jobTitle": job_title,
        "isRead": False,
        "createdAt": now,
    }
    
    try:
        result = await db.notifications.insert_one(notification_doc)
        logger.info(f"Notification created for user {user_id}: {title}")
        return str(result.inserted_id)
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        return None


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    user_id: str = Depends(require_auth),
):
    """
    Get notifications for the current user.
    
    - unread_only: If true, only return unread notifications
    - limit: Maximum number of notifications to return
    """
    user = await get_current_user(user_id)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    user_id = user["sub"]
    
    # Build query
    query = {"userId": user_id}
    if unread_only:
        query["isRead"] = False
    
    # Get notifications (newest first)
    cursor = db.notifications.find(query).sort("createdAt", -1).limit(limit)
    notifications = await cursor.to_list(length=limit)
    
    # Get counts
    total = await db.notifications.count_documents({"userId": user_id})
    unread_count = await db.notifications.count_documents({"userId": user_id, "isRead": False})
    
    return NotificationListResponse(
        notifications=[_serialize_notification(n) for n in notifications],
        unreadCount=unread_count,
        total=total,
    )


@router.post("/mark-read")
async def mark_notifications_read(
    data: Optional[MarkReadRequest] = None,
    user_id: str = Depends(require_auth),
):
    """
    Mark notifications as read.
    
    - If notificationIds provided, mark those specific ones
    - If not provided, mark ALL notifications as read
    """
    user = await get_current_user(user_id)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    user_id = user["sub"]
    now = datetime.now(timezone.utc)
    
    if data and data.notificationIds:
        # Mark specific notifications
        object_ids = [ObjectId(nid) for nid in data.notificationIds]
        result = await db.notifications.update_many(
            {"_id": {"$in": object_ids}, "userId": user_id},
            {"$set": {"isRead": True, "readAt": now}}
        )
    else:
        # Mark all as read
        result = await db.notifications.update_many(
            {"userId": user_id, "isRead": False},
            {"$set": {"isRead": True, "readAt": now}}
        )
    
    return {
        "success": True,
        "markedCount": result.modified_count,
    }


@router.get("/unread-count")
async def get_unread_count(user_id: str = Depends(require_auth)):
    """Get the count of unread notifications for the current user."""
    user = await get_current_user(user_id)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    user_id = user["sub"]
    count = await db.notifications.count_documents({"userId": user_id, "isRead": False})
    
    return {"unreadCount": count}
