"""List all client users."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://senudidrupasinghe_db_user:MleAlaiyK2M6pM7b@cluster0.xucnmcs.mongodb.net/?appName=Cluster0")
    db = client.smartagri
    
    users = await db.users.find({"role": "client"}).to_list(100)
    print(f"Found {len(users)} client(s):\n")
    
    for u in users:
        print(f"  {u['_id']} - {u.get('username')} ({u.get('email')})")
        print(f"    Has passwordHash: {'Yes' if u.get('passwordHash') else 'No'}")

if __name__ == "__main__":
    asyncio.run(main())
