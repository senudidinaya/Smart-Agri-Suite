"""Fix stale active calls in database."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://senudidrupasinghe_db_user:MleAlaiyK2M6pM7b@cluster0.xucnmcs.mongodb.net/?appName=Cluster0")
    db = client.smartagri
    
    # Find active calls
    calls = await db.calls.find({"status": {"$in": ["pending", "active", "ringing", "accepted"]}}).to_list(200)
    print(f"Found {len(calls)} active call(s):")
    for c in calls:
        print(f"  - {c['_id']}: status={c['status']}, job={c.get('jobId')}")
    
    if calls:
        # End all stale calls
        result = await db.calls.update_many(
            {"status": {"$in": ["pending", "active", "ringing", "accepted"]}},
            {"$set": {"status": "ended"}}
        )
        print(f"\nEnded {result.modified_count} stale call(s)")
    else:
        print("No stale calls found")

if __name__ == "__main__":
    asyncio.run(main())
