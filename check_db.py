import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.janakalyani_db
    
    print("--- Spices ---")
    spices = await db.spices.find().to_list(length=100)
    for s in spices:
        print(f"ID: {s['_id']}, Name: {s['name']}")
        
    print("\n--- Spice Items (Inventory) ---")
    items = await db.spice_items.find().to_list(length=100)
    for i in items:
        print(f"ID: {i['_id']}, SpiceID: {i['spiceId']}, Qty: {i['quantity']}, Farmer: {i['farmerId']}")

if __name__ == "__main__":
    asyncio.run(check())
