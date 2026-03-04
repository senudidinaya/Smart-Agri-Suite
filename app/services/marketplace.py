from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.schemas.marketplace import (
    Spice, SpiceCreate, SpiceItem, SpiceItemCreate, 
    SpiceItemUpdate, Order, OrderCreate, OrderAllocation
)


class MarketplaceService:
    def __init__(self):
        self._db: Optional[AsyncIOMotorDatabase] = None

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is None:
            self._db = get_db()
        if self._db is None:
            raise RuntimeError("Database not connected")
        return self._db

    # --- Spice Management ---

    async def create_spice(self, spice_in: SpiceCreate) -> Spice:
        doc = spice_in.dict()
        result = await self.db.spices.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        return Spice(**doc)

    async def get_spices(self) -> List[Spice]:
        cursor = self.db.spices.find()
        spices = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            spices.append(Spice(**doc))
        return spices

    # --- Inventory (Spice Items) ---

    async def add_spice_item(self, item_in: SpiceItemCreate) -> SpiceItem:
        doc = item_in.dict()
        doc["createdAt"] = datetime.now(timezone.utc)
        result = await self.db.spice_items.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        return SpiceItem(**doc)

    async def get_farmer_inventory(self, farmer_id: str) -> List[SpiceItem]:
        cursor = self.db.spice_items.find({"farmerId": farmer_id})
        items = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            items.append(SpiceItem(**doc))
        return items

    # --- Orders & FCFS Fulfillment ---

    async def place_order(self, order_in: OrderCreate) -> Order:
        """
        Place an order and allocate quantity from farmer inventory using FCFS.
        Only allows order if the full quantity can be allocated across farmers.
        """
        spice_id = order_in.spiceId
        needed_qty = order_in.totalQuantity
        
        # 1. Find all available inventory for this spice, oldest first
        cursor = self.db.spice_items.find(
            {"spiceId": spice_id, "quantity": {"$gt": 0}}
        ).sort("createdAt", 1)
        
        items = await cursor.to_list(length=100)
        total_available = sum(item["quantity"] for item in items)
        
        # 2. Strict Validation: Full quantity must be available
        if needed_qty > total_available:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested quantity ({needed_qty}kg) exceeds total available stock ({total_available}kg) across all farmers."
            )

        # 3. Allocation logic
        allocations = []
        remaining_to_allocate = needed_qty
        
        for item in items:
            if remaining_to_allocate <= 0:
                break
            
            available_in_item = item["quantity"]
            take_qty = min(available_in_item, remaining_to_allocate)
            
            allocations.append(OrderAllocation(
                spiceItemId=str(item["_id"]),
                farmerId=item["farmerId"],
                quantity=take_qty
            ))
            
            remaining_to_allocate -= take_qty
            
        # 4. Final check (safety)
        if remaining_to_allocate > 0:
             from fastapi import HTTPException, status
             raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Allocation logic failed to satisfy total quantity despite availability check."
            )

        # 5. Create the order
        order_doc = order_in.dict()
        order_doc["status"] = "Allocated"
        order_doc["allocations"] = [a.dict() for a in allocations]
        order_doc["createdAt"] = datetime.now(timezone.utc)
        
        result = await self.db.orders.insert_one(order_doc)
        order_doc["id"] = str(result.inserted_id)
        
        return Order(**order_doc)

    async def update_order_status(self, order_id: str, status: str) -> Optional[Order]:
        """
        Update order status. If marked as 'Delivered', reduce the farmer's available quantity.
        """
        order_doc = await self.db.orders.find_one({"_id": ObjectId(order_id)})
        if not order_doc:
            return None
            
        old_status = order_doc.get("status")
        
        # Logic: Reduce inventory only once when moving to 'Delivered'
        if status == "Delivered" and old_status != "Delivered":
            for allocation in order_doc.get("allocations", []):
                item_id = allocation["spiceItemId"]
                qty_to_reduce = allocation["quantity"]
                
                # Atomic decrement of quantity in spice_items
                await self.db.spice_items.update_one(
                    {"_id": ObjectId(item_id)},
                    {"$inc": {"quantity": -qty_to_reduce}}
                )
                
        # Update the order status
        await self.db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": status}}
        )
        
        order_doc["status"] = status
        order_doc["id"] = str(order_doc["_id"])
        return Order(**order_doc)

    async def get_customer_orders(self, customer_id: str) -> List[Order]:
        cursor = self.db.orders.find({"customerId": customer_id})
        orders = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            orders.append(Order(**doc))
        return orders

    async def get_farmer_orders(self, farmer_id: str) -> List[Order]:
        """Find orders where at least one allocation is from this farmer."""
        cursor = self.db.orders.find({"allocations.farmerId": farmer_id})
        orders = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            orders.append(Order(**doc))
        return orders

# Singleton instance access
_marketplace_service: Optional[MarketplaceService] = None

def get_marketplace_service() -> MarketplaceService:
    global _marketplace_service
    if _marketplace_service is None:
        _marketplace_service = MarketplaceService()
    return _marketplace_service
