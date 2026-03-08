"""Retry assignment for NEW tasks."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from cultivator.core.database import connect_db, get_db, close_db
from cultivator.services.admin_assignment import assign_or_queue_call_task, get_today_colombo_date_str


async def retry_new_tasks():
    await connect_db()
    db = get_db()
    
    today = get_today_colombo_date_str()
    print(f"Today: {today}")
    
    # Find NEW tasks
    cursor = db.call_tasks.find({"status": "NEW"})
    tasks = await cursor.to_list(100)
    print(f"Found {len(tasks)} NEW task(s)")
    
    for task in tasks:
        task_id = str(task["_id"])
        print(f"  Assigning task {task_id}...")
        success = await assign_or_queue_call_task(task_id, today)
        print(f"    Result: {'ASSIGNED' if success else 'QUEUED'}")
    
    # Show final state
    print("\nFinal state:")
    cursor = db.call_tasks.find()
    tasks = await cursor.to_list(100)
    for t in tasks:
        print(f"  - {t['_id']}: {t['status']} -> {t.get('assignedAdminId', 'N/A')}")
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(retry_new_tasks())
