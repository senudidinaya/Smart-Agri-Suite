"""Check call tokens in detail."""
import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb+srv://senudidrupasinghe_db_user:MleAlaiyK2M6pM7b@cluster0.xucnmcs.mongodb.net/?appName=Cluster0")
    db = client.smartagri
    
    # Get most recent call
    call = await db.calls.find_one({}, sort=[("createdAt", -1)])
    
    if call:
        print(f"Call ID: {call['_id']}")
        print(f"Status: {call['status']}")
        print(f"Channel: {call.get('channelName')}")
        print(f"Admin UID: {call.get('adminUid')}")
        print(f"Client UID: {call.get('clientUid')}")
        print()
        
        client_token = call.get('clientToken', '')
        print(f"Client Token (first 50 chars): {client_token[:50] if client_token else 'NONE'}...")
        print(f"Client Token length: {len(client_token) if client_token else 0}")
        print(f"Client Token starts with 006/007: {client_token[:3] if client_token else 'N/A'}")
    else:
        print("No calls found")

if __name__ == "__main__":
    asyncio.run(main())
