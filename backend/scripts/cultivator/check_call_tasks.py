"""Check CallTasks in database."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from cultivator.core.database import connect_db, get_db, close_db


async def check_tasks():
    await connect_db()
    db = get_db()
    cursor = db.call_tasks.find()
    tasks = await cursor.to_list(100)
    print(f"Found {len(tasks)} CallTask(s):")
    for t in tasks:
        print(f"  - ID: {t['_id']}")
        print(f"    Status: {t['status']}")
        print(f"    AssignedTo: {t.get('assignedAdminId', 'N/A')}")
        print(f"    ScheduledDate: {t.get('scheduledDate', 'N/A')}")
        print()
    await close_db()


if __name__ == "__main__":
    asyncio.run(check_tasks())
