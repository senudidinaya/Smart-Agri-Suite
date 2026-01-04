"""
Client profile endpoints.
Allows clients to create and manage their farmer profile.
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.core.database import get_db
from app.core.auth import verify_token
from app.core.logging import get_logger
from app.schemas.profile import ProfileCreate, ProfileResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/profiles", tags=["Profiles"])


def get_user_from_token(authorization: str) -> dict:
    """Extract and verify user from authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload


def profile_to_response(profile: dict) -> ProfileResponse:
    """Convert MongoDB profile to response."""
    return ProfileResponse(
        id=str(profile["_id"]),
        userId=profile["userId"],
        fullName=profile["fullName"],
        villageOrDistrict=profile["villageOrDistrict"],
        contactNumber=profile.get("contactNumber"),
        typeOfWork=profile["typeOfWork"],
        availableFrom=profile.get("availableFrom"),
        createdAt=profile["createdAt"],
        updatedAt=profile["updatedAt"],
    )


@router.get("/me", response_model=Optional[ProfileResponse])
async def get_my_profile(authorization: str = Header(...)):
    """Get the current user's profile."""
    user = get_user_from_token(authorization)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can have profiles")
    
    db = get_db()
    profile = await db.client_profiles.find_one({"userId": user["sub"]})
    
    if not profile:
        return None
    
    return profile_to_response(profile)


@router.post("/", response_model=ProfileResponse)
async def create_or_update_profile(
    data: ProfileCreate,
    authorization: str = Header(...)
):
    """Create or update the current user's profile."""
    user = get_user_from_token(authorization)
    
    if user["role"] != "client":
        raise HTTPException(status_code=403, detail="Only clients can create profiles")
    
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # Check if profile exists
    existing = await db.client_profiles.find_one({"userId": user["sub"]})
    
    if existing:
        # Update existing profile
        await db.client_profiles.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "fullName": data.fullName,
                "villageOrDistrict": data.villageOrDistrict,
                "contactNumber": data.contactNumber,
                "typeOfWork": data.typeOfWork,
                "availableFrom": data.availableFrom,
                "updatedAt": now,
            }}
        )
        updated = await db.client_profiles.find_one({"_id": existing["_id"]})
        logger.info(f"Profile updated for user: {user['username']}")
        return profile_to_response(updated)
    else:
        # Create new profile
        profile_doc = {
            "userId": user["sub"],
            "fullName": data.fullName,
            "villageOrDistrict": data.villageOrDistrict,
            "contactNumber": data.contactNumber,
            "typeOfWork": data.typeOfWork,
            "availableFrom": data.availableFrom,
            "createdAt": now,
            "updatedAt": now,
        }
        result = await db.client_profiles.insert_one(profile_doc)
        profile_doc["_id"] = result.inserted_id
        logger.info(f"Profile created for user: {user['username']}")
        return profile_to_response(profile_doc)
