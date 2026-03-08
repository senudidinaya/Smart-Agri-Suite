"""
marketplace_models.py
---------------------
SQLAlchemy ORM models for the Land Marketplace.
Uses GeoAlchemy2 for PostGIS geometry columns (SRID 4326 / WGS84).
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    Enum,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from .database import Base


# ======================== ENUMS ========================

class ListingPurpose(str, enum.Enum):
    sell = "sell"
    lease = "lease"
    partnership = "partnership"
    contract = "contract"


class ListingStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"
    sold = "sold"


# ======================== TABLES ========================

class LandListing(Base):
    """Main listing table — one row per listed parcel of land."""
    __tablename__ = "land_listings"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # --- Link to MongoDB user (from Login-Register auth system) ---
    mongo_user_id = Column(String(50), nullable=True, index=True)

    # --- Owner info ---
    owner_name = Column(String(200), nullable=False)
    owner_phone = Column(String(20), nullable=False)
    owner_email = Column(String(200), nullable=True)
    owner_address = Column(Text, nullable=True)

    # --- Geometry (PostGIS) ---
    polygon_geom = Column(
        Geometry(geometry_type="POLYGON", srid=4326),
        nullable=False,
    )

    # --- Calculated area ---
    area_square_meters = Column(Float, nullable=True)
    area_acres = Column(Float, nullable=True)
    area_hectares = Column(Float, nullable=True)

    # --- Listing details ---
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    current_land_use = Column(String(100), nullable=True)
    soil_type = Column(String(100), nullable=True)
    water_availability = Column(String(100), nullable=True)

    listing_purpose = Column(
        Enum(ListingPurpose, name="listing_purpose_enum"),
        nullable=False,
        default=ListingPurpose.sell,
    )
    expected_price = Column(Float, nullable=True)

    # --- Status & tracking ---
    status = Column(
        Enum(ListingStatus, name="listing_status_enum"),
        nullable=False,
        default=ListingStatus.pending,
    )
    verification_code = Column(String(20), unique=True, nullable=False)
    admin_comment = Column(Text, nullable=True)

    # Flags
    has_documents = Column(Boolean, default=False)
    road_access = Column(Boolean, default=False)
    electricity = Column(Boolean, default=False)

    # --- Timestamps ---
    submitted_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    verified_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # --- Relationships ---
    photos = relationship("LandPhoto", back_populates="listing", cascade="all, delete-orphan")
    documents = relationship("LandDocument", back_populates="listing", cascade="all, delete-orphan")
    analytics = relationship("LandAnalytics", back_populates="listing", uselist=False, cascade="all, delete-orphan")
    crop_scores = relationship("CropSuitability", back_populates="listing", cascade="all, delete-orphan")


class LandPhoto(Base):
    """Stores photos for a listing"""
    __tablename__ = "land_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(Integer, ForeignKey("land_listings.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    uploaded_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    listing = relationship("LandListing", back_populates="photos")


class LandDocument(Base):
    """Stores legal & verification documents for a listing"""
    __tablename__ = "land_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(Integer, ForeignKey("land_listings.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    doc_type = Column(String(50), nullable=False) # e.g. NIC, Deed, Survey
    uploaded_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    listing = relationship("LandListing", back_populates="documents")


class LandAnalytics(Base):
    """Cached ML analysis results for a listing (one-to-one)."""
    __tablename__ = "land_analytics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(
        Integer,
        ForeignKey("land_listings.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    prediction_label = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)

    vegetation_pct = Column(Float, nullable=True)
    idle_pct = Column(Float, nullable=True)
    built_pct = Column(Float, nullable=True)

    ndvi_mean = Column(Float, nullable=True)
    ndwi_mean = Column(Float, nullable=True)
    evi_mean = Column(Float, nullable=True)
    elevation_mean = Column(Float, nullable=True)
    slope_mean = Column(Float, nullable=True)

    calculated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    listing = relationship("LandListing", back_populates="analytics")


class CropSuitability(Base):
    """Per-spice suitability score for a listing."""
    __tablename__ = "crop_suitability"

    id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(
        Integer,
        ForeignKey("land_listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    crop_name = Column(String(50), nullable=False)
    score = Column(Integer, nullable=True)
    label = Column(String(30), nullable=True)
    calculated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    listing = relationship("LandListing", back_populates="crop_scores")

    __table_args__ = (
        UniqueConstraint("listing_id", "crop_name", name="uq_listing_crop"),
    )


class RestrictedZone(Base):
    """Admin-defined zones where land listing is NOT allowed."""
    __tablename__ = "restricted_zones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_name = Column(String(200), nullable=False)
    polygon_geom = Column(
        Geometry(geometry_type="POLYGON", srid=4326),
        nullable=False,
    )
    restriction_type = Column(String(100), nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
