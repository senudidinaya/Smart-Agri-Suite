"""
Call Task endpoints for automated calling workflow.
Admin-only endpoints for managing call tasks.
"""

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from cultivator.core.database import get_db
from cultivator.core.logging import get_logger
from auth_utils import require_auth
from cultivator.schemas.call_task import CallTaskOut
from cultivator.services.admin_assignment import assign_or_queue_call_task, get_today_colombo_date_str

logger = get_logger(__name__)
router = APIRouter(prefix="/call-tasks", tags=["Call Tasks"])


async def get_interviewer_user(user_id: str) -> dict:
    """Resolve authenticated interviewer from user id."""
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("role") != "interviewer":
        raise HTTPException(status_code=403, detail="Only interviewer can access this endpoint")
    return {
        "sub": user_id,
        "username": user.get("username", "interviewer"),
        "role": user.get("role"),
    }


def call_task_to_response(task: dict) -> CallTaskOut:
    """Convert MongoDB call task to response."""
    return CallTaskOut(
        id=str(task["_id"]),
        jobId=task["jobId"],
        clientId=task["clientId"],
        applicationId=task["applicationId"],
        status=task["status"],
        assignedAdminId=task.get("assignedAdminId"),
        scheduledDate=task["scheduledDate"],
        createdAt=task["createdAt"],
        updatedAt=task["updatedAt"],
    )


@router.get("/admin/today", response_model=List[CallTaskOut])
async def get_today_tasks(user_id: str = Depends(require_auth)):
    """Get today's assigned tasks for current interviewer."""
    admin = await get_interviewer_user(user_id)
    db = get_db()

    today = get_today_colombo_date_str()

    cursor = db.call_tasks.find({
        "assignedAdminId": admin["sub"],
        "scheduledDate": today,
        "status": {"$in": ["ASSIGNED", "IN_PROGRESS"]}
    }).sort("createdAt", 1)

    tasks = await cursor.to_list(length=100)
    return [call_task_to_response(task) for task in tasks]


@router.patch("/{task_id}/status")
async def update_task_status(
    task_id: str,
    status: str,
    user_id: str = Depends(require_auth)
):
    """Update call task status."""
    admin = await get_interviewer_user(user_id)
    db = get_db()

    # Validate status transition
    allowed_transitions = {
        "ASSIGNED": ["IN_PROGRESS", "CANCELLED"],
        "IN_PROGRESS": ["COMPLETED", "CANCELLED"],
    }

    task = await db.call_tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Call task not found")

    if task["assignedAdminId"] != admin["sub"]:
        raise HTTPException(status_code=403, detail="Task not assigned to you")

    current_status = task["status"]
    if status not in allowed_transitions.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from {current_status} to {status}"
        )

    await db.call_tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc)}}
    )

    logger.info(f"Call task {task_id} status updated to {status} by interviewer {admin['username']}")
    return {"message": f"Task status updated to {status}"}


@router.post("/retry-queued")
async def retry_queued_tasks(user_id: str = Depends(require_auth)):
    """Retry assigning queued tasks for today."""
    admin = await get_interviewer_user(user_id)
    db = get_db()

    today = get_today_colombo_date_str()

    # Find queued tasks for today, sorted by creation time (FIFO)
    cursor = db.call_tasks.find({
        "scheduledDate": today,
        "status": "QUEUED"
    }).sort("createdAt", 1)

    queued_tasks = await cursor.to_list(length=100)

    assigned_count = 0
    for task in queued_tasks:
        success = await assign_or_queue_call_task(str(task["_id"]), today)
        if success:
            assigned_count += 1

    logger.info(f"Retry queued: {assigned_count}/{len(queued_tasks)} tasks assigned")
    return {
        "message": f"Processed {len(queued_tasks)} queued tasks",
        "assigned": assigned_count
    }