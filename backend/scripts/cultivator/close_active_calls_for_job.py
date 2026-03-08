"""Close active calls for a job ID.

Usage:
  python scripts/cultivator/close_active_calls_for_job.py <job_id>
"""

import asyncio
import sys
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb+srv://senudidrupasinghe_db_user:MleAlaiyK2M6pM7b@cluster0.xucnmcs.mongodb.net/?appName=Cluster0"
DB_NAME = "smartagri"


async def main(job_id: str) -> None:
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    now = datetime.now(timezone.utc)
    result = await db.calls.update_many(
        {
            "jobId": job_id,
            "status": {"$in": ["ringing", "accepted", "pending", "active"]},
        },
        {
            "$set": {
                "status": "ended",
                "endedAt": now,
                "updatedAt": now,
                "endedReason": "manual_cleanup",
            }
        },
    )

    print(f"Updated {result.modified_count} call(s) for job {job_id}")
    client.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/cultivator/close_active_calls_for_job.py <job_id>")
        raise SystemExit(1)

    asyncio.run(main(sys.argv[1]))
