"""
Admin assignment service for call tasks.

Handles automatic assignment of call tasks to admins based on load balancing.
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import pytz

from bson import ObjectId

from app.core.database import get_db
from app.core.logging import get_logger

logger = get_logger(__name__)


def get_today_colombo_date_str() -> str:
    """Get today's date in Asia/Colombo timezone as YYYY-MM-DD."""
    colombo_tz = pytz.timezone("Asia/Colombo")
    now = datetime.now(colombo_tz)
    return now.strftime("%Y-%m-%d")


async def get_active_admins() -> List[Dict[str, Any]]:
    """Get list of active admins with their daily call limits."""
    db = get_db()

    cursor = db.users.find({
        "role": "admin",
        "isActive": {"$ne": False}  # Default to true if missing
    })

    admins = await cursor.to_list(length=100)

    # Add default dailyCallLimit if missing
    for admin in admins:
        if "dailyCallLimit" not in admin:
            admin["dailyCallLimit"] = 20

    return admins


async def get_admin_load(admin_id: str, today_date: str) -> int:
    """Get current load for admin on given date."""
    db = get_db()

    count = await db.call_tasks.count_documents({
        "assignedAdminId": admin_id,
        "scheduledDate": today_date,
        "status": {"$in": ["ASSIGNED", "IN_PROGRESS"]}
    })

    return count


async def find_best_admin_for_task(today_date: str) -> Optional[str]:
    """
    Find the best admin for a new task based on load balancing.

    Returns admin ID with smallest load under capacity, or None if none available.
    """
    admins = await get_active_admins()

    if not admins:
        return None

    # Calculate load for each admin
    admin_loads = []
    for admin in admins:
        load = await get_admin_load(str(admin["_id"]), today_date)
        capacity = admin.get("dailyCallLimit", 20)

        if load < capacity:
            admin_loads.append({
                "admin_id": str(admin["_id"]),
                "load": load,
                "username": admin.get("username", "")
            })

    if not admin_loads:
        return None

    # Sort by load (ascending), then by username (ascending)
    admin_loads.sort(key=lambda x: (x["load"], x["username"]))

    best_admin = admin_loads[0]
    logger.info(f"Selected admin {best_admin['admin_id']} ({best_admin['username']}) with load {best_admin['load']}")
    return best_admin["admin_id"]


async def assign_or_queue_call_task(call_task_id: str, today_date: str) -> bool:
    """
    Try to assign a call task to an admin, or queue it if none available.

    Returns True if assigned, False if queued.
    """
    db = get_db()

    # Convert string ID to ObjectId if needed
    task_oid = ObjectId(call_task_id) if isinstance(call_task_id, str) else call_task_id

    admin_id = await find_best_admin_for_task(today_date)

    if admin_id:
        # Assign to admin
        await db.call_tasks.update_one(
            {"_id": task_oid},
            {
                "$set": {
                    "status": "ASSIGNED",
                    "assignedAdminId": admin_id,
                    "updatedAt": datetime.now(timezone.utc)
                }
            }
        )
        logger.info(f"Call task {call_task_id} assigned to admin {admin_id}")
        return True
    else:
        # Queue the task
        await db.call_tasks.update_one(
            {"_id": task_oid},
            {
                "$set": {
                    "status": "QUEUED",
                    "assignedAdminId": None,
                    "updatedAt": datetime.now(timezone.utc)
                }
            }
        )
        logger.info(f"Call task {call_task_id} queued (no available admin)")
        return False