"""
Authentication endpoints.
Simple register and login functionality.
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.core.database import get_db
from app.core.auth import hash_password, verify_password, create_token, verify_token
from app.core.logging import get_logger
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    LoginResponse,
    MessageResponse,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def user_to_response(user: dict) -> UserResponse:
    """Convert MongoDB user document to response."""
    return UserResponse(
        id=str(user["_id"]),
        fullName=user["fullName"],
        username=user["username"],
        email=user["email"],
        address=user.get("address"),
        age=user.get("age"),
        role=user["role"],
        createdAt=user["createdAt"],
    )


@router.post("/register", response_model=MessageResponse)
async def register(data: UserRegister):
    """Register a new user (client or admin)."""
    db = get_db()
    
    # Check if username exists
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    now = datetime.now(timezone.utc)
    user_doc = {
        "fullName": data.fullName,
        "username": data.username,
        "email": data.email,
        "address": data.address,
        "age": data.age,
        "role": data.role,
        "passwordHash": hash_password(data.password),
        "createdAt": now,
        "updatedAt": now,
    }
    
    await db.users.insert_one(user_doc)
    logger.info(f"User registered: {data.username} (role: {data.role})")
    
    return MessageResponse(success=True, message="Registration successful. Please login.")


@router.post("/login", response_model=LoginResponse)
async def login(data: UserLogin):
    """Login and get authentication token."""
    db = get_db()
    
    # Find user
    user = await db.users.find_one({"username": data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create token
    token = create_token(
        user_id=str(user["_id"]),
        username=user["username"],
        role=user["role"],
    )
    
    logger.info(f"User logged in: {data.username}")
    
    return LoginResponse(
        token=token,
        user=user_to_response(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: str = Header(...)):
    """Get current user from token."""
    # Extract token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization[7:]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_to_response(user)
