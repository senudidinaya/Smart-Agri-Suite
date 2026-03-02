"""
marketplace_schemas.py
----------------------
Pydantic v2 request / response schemas for the Land Marketplace API.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ======================== REQUESTS ========================

class ValidateAreaRequest(BaseModel):
    """Body for POST /api/listings/validate-area"""
    coordinates: List[List[float]] = Field(
        ...,
        min_length=3,
        description="Polygon vertices as [[lng, lat], ...]",
    )


class ListingCreate(BaseModel):
    """Body for POST /api/listings/create"""
    # Owner
    owner_name: str = Field(..., max_length=200)
    owner_phone: str = Field(..., max_length=20)
    owner_email: Optional[str] = Field(None, max_length=200)
    owner_address: Optional[str] = None

    # Polygon
    coordinates: List[List[float]] = Field(
        ...,
        min_length=3,
        description="Polygon vertices as [[lng, lat], ...]",
    )

    # Land details
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    current_land_use: Optional[str] = None
    soil_type: Optional[str] = None
    water_availability: Optional[str] = None
    road_access: bool = False
    electricity: bool = False

    listing_purpose: str = Field(
        "sell",
        description="One of: sell, lease, partnership, contract",
    )
    expected_price: Optional[float] = None


class ListingFilter(BaseModel):
    """Query params for GET /api/listings"""
    status: Optional[str] = None
    listing_purpose: Optional[str] = None
    min_acres: Optional[float] = None
    max_acres: Optional[float] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


# ======================== RESPONSES ========================

class ValidateAreaResponse(BaseModel):
    allowed: bool
    reason: str


class CropScoreOut(BaseModel):
    crop_name: str
    score: Optional[int] = None
    label: Optional[str] = None


class AnalyticsOut(BaseModel):
    prediction_label: Optional[str] = None
    confidence: Optional[float] = None
    vegetation_pct: Optional[float] = None
    idle_pct: Optional[float] = None
    built_pct: Optional[float] = None
    ndvi_mean: Optional[float] = None
    ndwi_mean: Optional[float] = None
    evi_mean: Optional[float] = None
    elevation_mean: Optional[float] = None
    slope_mean: Optional[float] = None


class LandPhotoOut(BaseModel):
    id: int
    url: str
    is_primary: bool

    class Config:
        from_attributes = True


class LandDocumentOut(BaseModel):
    id: int
    url: str
    doc_type: str

    class Config:
        from_attributes = True


class ListingSummary(BaseModel):
    """Lightweight listing for list views."""
    id: int
    title: str
    verification_code: str
    area_acres: Optional[float] = None
    area_hectares: Optional[float] = None
    listing_purpose: str
    status: str
    expected_price: Optional[float] = None
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ListingResponse(BaseModel):
    """Full listing detail including analytics and crop scores."""
    id: int
    owner_name: str
    owner_phone: str
    owner_email: Optional[str] = None
    owner_address: Optional[str] = None

    polygon_coordinates: Optional[List[List[float]]] = None

    area_square_meters: Optional[float] = None
    area_acres: Optional[float] = None
    area_hectares: Optional[float] = None

    title: str
    description: Optional[str] = None
    current_land_use: Optional[str] = None
    soil_type: Optional[str] = None
    water_availability: Optional[str] = None
    road_access: bool = False
    electricity: bool = False

    listing_purpose: str
    expected_price: Optional[float] = None
    status: str
    verification_code: str

    submitted_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    has_documents: bool = False

    analytics: Optional[AnalyticsOut] = None
    crop_scores: List[CropScoreOut] = []
    photos: List[LandPhotoOut] = []
    documents: List[LandDocumentOut] = []

    class Config:
        from_attributes = True
