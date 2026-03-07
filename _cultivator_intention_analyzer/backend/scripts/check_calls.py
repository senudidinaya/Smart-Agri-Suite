"""Check recent calls and their status."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://senudidrupasinghe_db_user:MleAlaiyK2M6pM7b@cluster0.xucnmcs.mongodb.net/?appName=Cluster0")
    db = client.smartagri
    
    # Find all recent calls
    calls = await db.calls.find({}).sort("createdAt", -1).limit(10).to_list(10)
    print(f"Found {len(calls)} recent call(s):\n")
    
    for c in calls:
        print(f"Call ID: {c['_id']}")
        print(f"  Status: {c['status']}")
        print(f"  Job ID: {c.get('jobId')}")
        print(f"  Interviewer: {c.get('interviewerUserId')}")
        print(f"  Cultivator: {c.get('cultivatorUserId')}")
        print(f"  Channel: {c.get('channelName', c.get('roomName', 'N/A'))}")
        print(f"  Client Token: {'Yes' if c.get('clientToken') else 'NO TOKEN!'}")
        print(f"  Admin Token: {'Yes' if c.get('adminToken') else 'NO TOKEN!'}")
        print(f"  Created: {c.get('createdAt')}")
        print()

if __name__ == "__main__":
    asyncio.run(main())
