"""List interviewers in database."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://senudidrupasinghe_db_user:MleAlaiyK2M6pM7b@cluster0.xucnmcs.mongodb.net/?appName=Cluster0")
    db = client.smartagri
    admins = await db.users.find({"role": "interviewer"}).to_list(100)
    print("Interviewers:")
    for a in admins:
        print(f"  {a['_id']} - {a['username']}")
        print(f"    limit: {a.get('dailyCallLimit')}")
        print(f"    passwordHash: {a.get('passwordHash', 'MISSING')[:30] if a.get('passwordHash') else 'MISSING'}...")

if __name__ == "__main__":
    asyncio.run(main())
