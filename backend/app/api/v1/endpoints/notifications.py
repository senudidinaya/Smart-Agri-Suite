"""
Notification endpoints for the Smart Agri-Suite.
Simple in-app notification system for clients.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header

from app.core.database import get_db
from app.core.auth import verify_token
from app.core.logging import get_logger
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    MarkReadRequest,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_user_from_token(authorization: str) -> dict:
    """Extract and verify user from authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload


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
    authorization: str = Header(...),
):
    """
    Get notifications for the current user.
    
    - unread_only: If true, only return unread notifications
    - limit: Maximum number of notifications to return
    """
    user = get_user_from_token(authorization)
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
    authorization: str = Header(...),
):
    """
    Mark notifications as read.
    
    - If notificationIds provided, mark those specific ones
    - If not provided, mark ALL notifications as read
    """
    user = get_user_from_token(authorization)
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
async def get_unread_count(authorization: str = Header(...)):
    """Get the count of unread notifications for the current user."""
    user = get_user_from_token(authorization)
    db = get_db()
    
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    user_id = user["sub"]
    count = await db.notifications.count_documents({"userId": user_id, "isRead": False})
    
    return {"unreadCount": count}
