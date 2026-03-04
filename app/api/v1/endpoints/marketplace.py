from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.marketplace import (
    Spice, SpiceCreate, SpiceItem, SpiceItemCreate, 
    SpiceItemUpdate, Order, OrderCreate, OrderStatusUpdate
)
from app.services.marketplace import get_marketplace_service, MarketplaceService


router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

# --- Spice Master Data ---

@router.get("/spices", response_model=List[Spice])
async def get_spices(
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """List all available spice types."""
    spices = await service.get_spices()
    
    # Auto-seed if empty (as requested: 5 spices)
    if not spices:
        seed_spices = [
            SpiceCreate(name="Cardamom", description="High quality green cardamom"),
            SpiceCreate(name="Black Pepper", description="Premium organic black pepper"),
            SpiceCreate(name="Cinnamon", description="True Ceylon cinnamon sticks"),
            SpiceCreate(name="Cloves", description="Aromatic dried flower buds"),
            SpiceCreate(name="Nutmeg", description="Whole seed nutmeg")
        ]
        for s in seed_spices:
            await service.create_spice(s)
        spices = await service.get_spices()
        
    return spices

@router.post("/spices", response_model=Spice, status_code=status.HTTP_201_CREATED)
async def create_spice(
    spice_in: SpiceCreate,
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """(Admin) Create a new spice type."""
    return await service.create_spice(spice_in)


# --- Farmer Inventory ---

@router.post("/inventory", response_model=SpiceItem, status_code=status.HTTP_201_CREATED)
async def add_inventory(
    item_in: SpiceItemCreate,
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """Add a quantity of spice to a farmer's inventory."""
    return await service.add_spice_item(item_in)

@router.get("/inventory/farmer/{farmer_id}", response_model=List[SpiceItem])
async def get_farmer_inventory(
    farmer_id: str,
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """Get all inventory items for a specific farmer."""
    return await service.get_farmer_inventory(farmer_id)


# --- Orders ---

@router.post("/orders", response_model=Order, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_in: OrderCreate,
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """Place an order and allocate inventory using FCFS."""
    return await service.place_order(order_in)

@router.get("/orders/customer/{customer_id}", response_model=List[Order])
async def get_customer_orders(
    customer_id: str,
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """Get all orders placed by a customer."""
    return await service.get_customer_orders(customer_id)

@router.get("/orders/farmer/{farmer_id}", response_model=List[Order])
async def get_farmer_orders(
    farmer_id: str,
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """Get all orders involving a specific farmer's inventory."""
    return await service.get_farmer_orders(farmer_id)

@router.patch("/orders/{order_id}/status", response_model=Order)
async def update_order_status(
    order_id: str,
    status_in: OrderStatusUpdate,
    service: MarketplaceService = Depends(get_marketplace_service)
):
    """Update order status. Moving to 'Delivered' will reduce farmer's inventory."""
    updated_order = await service.update_order_status(order_id, status_in.status)
    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return updated_order
