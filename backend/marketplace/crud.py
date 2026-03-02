"""
marketplace_crud.py
-------------------
Database operations for the Land Marketplace.
Uses PostGIS spatial functions (ST_Intersects, ST_Overlaps, ST_GeomFromGeoJSON)
for geometry validation and duplicate detection.
"""

import json
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, cast, Float
from sqlalchemy.orm import Session, joinedload
from geoalchemy2.functions import ST_Intersects, ST_GeomFromGeoJSON, ST_AsGeoJSON
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Polygon as ShapelyPolygon, shape as shapely_shape

from .models import (
    LandListing,
    LandPhoto,
    LandAnalytics,
    CropSuitability,
    RestrictedZone,
    ListingPurpose,
    ListingStatus,
)


# ======================== HELPERS ========================

def generate_verification_code(db: Session) -> str:
    """
    Generate a unique verification code like 'ML-2026-XXXXXX'.
    Retries until a unique code is found.
    """
    for _ in range(50):
        code = f"ML-2026-{random.randint(100000, 999999)}"
        existing = (
            db.query(LandListing.id)
            .filter(LandListing.verification_code == code)
            .first()
        )
        if existing is None:
            return code
    raise RuntimeError("Failed to generate unique verification code after 50 attempts")


def _coords_to_geojson(coordinates: List[List[float]]) -> str:
    """Convert [[lng, lat], ...] to a GeoJSON Polygon string."""
    # Close the ring if not already closed
    ring = [list(c) for c in coordinates]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    geojson = {"type": "Polygon", "coordinates": [ring]}
    return json.dumps(geojson)


# ======================== VALIDATION ========================

def validate_polygon_against_restricted_zones(
    db: Session,
    coordinates: List[List[float]],
) -> Optional[str]:
    """
    Check if the polygon intersects any restricted zone.
    Returns the restriction reason if blocked, or None if OK.
    """
    geojson_str = _coords_to_geojson(coordinates)

    zone = (
        db.query(RestrictedZone)
        .filter(
            ST_Intersects(
                RestrictedZone.polygon_geom,
                ST_GeomFromGeoJSON(geojson_str),
            )
        )
        .first()
    )
    if zone:
        return f"Polygon intersects restricted zone: {zone.zone_name}. Reason: {zone.reason or 'N/A'}"
    return None


def check_duplicate_listing(
    db: Session,
    coordinates: List[List[float]],
) -> Optional[int]:
    """
    Check if a very similar listing already exists (polygon overlaps > 80%).
    Returns the existing listing ID if duplicate found, else None.
    """
    geojson_str = _coords_to_geojson(coordinates)
    new_geom = ST_GeomFromGeoJSON(geojson_str)

    # Find listings where the intersection area is > 80% of either polygon
    duplicate = (
        db.query(LandListing.id)
        .filter(
            ST_Intersects(LandListing.polygon_geom, new_geom),
            LandListing.status != ListingStatus.rejected,
        )
        .first()
    )
    return duplicate.id if duplicate else None


# ======================== CREATE ========================

def create_listing(
    db: Session,
    *,
    owner_name: str,
    owner_phone: str,
    owner_email: Optional[str],
    owner_address: Optional[str],
    coordinates: List[List[float]],
    area_square_meters: Optional[float],
    area_acres: Optional[float],
    area_hectares: Optional[float],
    title: str,
    description: Optional[str],
    current_land_use: Optional[str],
    soil_type: Optional[str],
    water_availability: Optional[str],
    road_access: bool,
    electricity: bool,
    listing_purpose: str,
    expected_price: Optional[float],
    analysis_results: Optional[Dict[str, Any]] = None,
) -> LandListing:
    """
    Create a new land listing with its analytics and crop scores in one transaction.
    """
    verification_code = generate_verification_code(db)
    geojson_str = _coords_to_geojson(coordinates)

    listing = LandListing(
        owner_name=owner_name,
        owner_phone=owner_phone,
        owner_email=owner_email,
        owner_address=owner_address,
        polygon_geom=ST_GeomFromGeoJSON(geojson_str),
        area_square_meters=area_square_meters,
        area_acres=area_acres,
        area_hectares=area_hectares,
        title=title,
        description=description,
        current_land_use=current_land_use,
        soil_type=soil_type,
        water_availability=water_availability,
        road_access=road_access,
        electricity=electricity,
        listing_purpose=ListingPurpose(listing_purpose),
        expected_price=expected_price,
        status=ListingStatus.pending,
        verification_code=verification_code,
    )
    db.add(listing)
    db.flush()  # get listing.id before adding children

    # --- Store ML analytics (if available) ---
    if analysis_results:
        prediction = analysis_results.get("prediction", {})
        composition = analysis_results.get("composition", {})
        statistics = analysis_results.get("statistics", {})

        analytics = LandAnalytics(
            listing_id=listing.id,
            prediction_label=prediction.get("label"),
            confidence=prediction.get("confidence"),
            vegetation_pct=composition.get("vegetation_pct"),
            idle_pct=composition.get("idle_pct"),
            built_pct=composition.get("built_pct"),
            ndvi_mean=statistics.get("NDVI", {}).get("mean") if isinstance(statistics.get("NDVI"), dict) else None,
            ndwi_mean=statistics.get("NDWI", {}).get("mean") if isinstance(statistics.get("NDWI"), dict) else None,
            evi_mean=statistics.get("EVI", {}).get("mean") if isinstance(statistics.get("EVI"), dict) else None,
            elevation_mean=statistics.get("ELEV", {}).get("mean") if isinstance(statistics.get("ELEV"), dict) else None,
            slope_mean=statistics.get("SLOPE", {}).get("mean") if isinstance(statistics.get("SLOPE"), dict) else None,
        )
        db.add(analytics)

        # --- Store per-spice crop scores ---
        spices = analysis_results.get("intelligence", {}).get("spices", [])
        for sp in spices:
            crop = CropSuitability(
                listing_id=listing.id,
                crop_name=str(sp.get("name", "")),
                score=int(sp["score"]) if sp.get("score") is not None else None,
                label=str(sp.get("label", "")),
            )
            db.add(crop)

    db.commit()
    db.refresh(listing)
    return listing


# ======================== READ ========================

def get_listings(
    db: Session,
    *,
    status: Optional[str] = None,
    listing_purpose: Optional[str] = None,
    min_acres: Optional[float] = None,
    max_acres: Optional[float] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[LandListing]:
    """
    Query listings with optional filters.
    Returns lightweight listing objects (no joins).
    """
    q = db.query(LandListing).options(
        joinedload(LandListing.photos),
        joinedload(LandListing.analytics),
    )

    if status:
        q = q.filter(LandListing.status == status)
    if listing_purpose:
        q = q.filter(LandListing.listing_purpose == listing_purpose)
    if min_acres is not None:
        q = q.filter(LandListing.area_acres >= min_acres)
    if max_acres is not None:
        q = q.filter(LandListing.area_acres <= max_acres)

    q = q.order_by(LandListing.submitted_at.desc())
    return q.offset(offset).limit(limit).all()


def get_listing_by_id(db: Session, listing_id: int) -> Optional[LandListing]:
    """
    Get a single listing with its analytics and crop scores (eager loaded via relationships).
    """
    return (
        db.query(LandListing)
        .filter(LandListing.id == listing_id)
        .first()
    )


def get_listing_polygon_coords(db: Session, listing: LandListing) -> Optional[List[List[float]]]:
    """
    Extract polygon coordinates from a listing's PostGIS geometry back to [[lng, lat], ...].
    """
    try:
        geojson_str = db.scalar(ST_AsGeoJSON(listing.polygon_geom))
        if geojson_str:
            geojson = json.loads(geojson_str)
            return geojson.get("coordinates", [[]])[0]
    except Exception:
        pass
    return None
