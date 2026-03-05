"""Find client for a job."""
import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://senudidrupasinghe_db_user:MleAlaiyK2M6pM7b@cluster0.xucnmcs.mongodb.net/?appName=Cluster0")
    db = client.smartagri
    
    job = await db.jobs.find_one({"_id": ObjectId("695eb285eba166e652d64833")})
    
    if job:
        print(f"Job: {job.get('title')}")
        print(f"Created by user ID: {job.get('createdByUserId')}")
        
        user = await db.users.find_one({"_id": ObjectId(job["createdByUserId"])})
        if user:
            print(f"Client username: {user.get('username')}")
            print(f"Client has passwordHash: {'Yes' if user.get('passwordHash') else 'No'}")
    else:
        print("Job not found")

if __name__ == "__main__":
    asyncio.run(main())
