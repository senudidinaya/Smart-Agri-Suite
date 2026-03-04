from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# --- Spice Master Data ---

class SpiceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class SpiceCreate(SpiceBase):
    pass

class Spice(SpiceBase):
    id: str

# --- Farmer Inventory (Spice Items) ---

class SpiceItemBase(BaseModel):
    spiceId: str
    quantity: float = Field(..., gt=0)
    pricePerUnit: float = Field(..., gt=0)
    unit: str = "kg"

class SpiceItemCreate(SpiceItemBase):
    farmerId: str

class SpiceItem(SpiceItemBase):
    id: str
    farmerId: str
    createdAt: datetime

class SpiceItemUpdate(BaseModel):
    quantity: Optional[float] = Field(None, ge=0)
    pricePerUnit: Optional[float] = Field(None, gt=0)

# --- Orders ---

class OrderAllocation(BaseModel):
    spiceItemId: str
    farmerId: str
    quantity: float

class OrderBase(BaseModel):
    spiceId: str
    totalQuantity: float = Field(..., gt=0)

class OrderCreate(OrderBase):
    customerId: str

class Order(OrderBase):
    id: str
    customerId: str
    status: Literal["Pending", "Allocated", "Delivered", "Cancelled"] = "Pending"
    allocations: List[OrderAllocation] = []
    createdAt: datetime

class OrderStatusUpdate(BaseModel):
    status: Literal["Allocated", "Delivered", "Cancelled"]
