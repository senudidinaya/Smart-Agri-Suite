"""
Authentication endpoints.
Simple register and login functionality.
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends

from cultivator.core.database import get_db
from cultivator.core.logging import get_logger
from auth_utils import hash_password, verify_password, create_token, require_auth
from cultivator.schemas.user import (
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
    """Register a new user."""
    normalized_role = "client" if data.role == "farmer" else data.role
    logger.info(f"[REGISTER] Request received for username: {data.username}, role: {normalized_role}")
    
    db = get_db()
    if db is None:
        logger.error("[REGISTER] Database connection is not available")
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    # Check if username exists
    logger.debug(f"[REGISTER] Checking if username exists: {data.username}")
    existing = await db.users.find_one({"username": data.username})
    if existing:
        logger.warning(f"[REGISTER] Username already exists: {data.username}")
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email exists
    logger.debug(f"[REGISTER] Checking if email exists: {data.email}")
    existing = await db.users.find_one({"email": data.email})
    if existing:
        logger.warning(f"[REGISTER] Email already exists: {data.email}")
        raise HTTPException(status_code=400, detail="Email already exists")
    
    now = datetime.now(timezone.utc)
    user_doc = {
        "fullName": data.fullName,
        "username": data.username,
        "email": data.email,
        "address": data.address,
        "age": data.age,
        "role": normalized_role,
        "passwordHash": hash_password(data.password),
        "createdAt": now,
        "updatedAt": now,
    }
    
    logger.debug(f"[REGISTER] Inserting new user: {data.username}")
    await db.users.insert_one(user_doc)
    logger.info(f"[REGISTER] User registered successfully: {data.username} (role: {normalized_role})")
    
    return MessageResponse(success=True, message="Registration successful. Please login.")


@router.post("/login", response_model=LoginResponse)
async def login(data: UserLogin):
    """Login and get authentication token."""
    logger.info(f"[LOGIN] Request received for username: {data.username}")
    
    db = get_db()
    if db is None:
        logger.error("[LOGIN] Database connection is not available")
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    # Find user
    logger.debug(f"[LOGIN] Searching for user: {data.username}")
    user = await db.users.find_one({"username": data.username})
    
    if not user:
        logger.warning(f"[LOGIN] User not found: {data.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    logger.debug(f"[LOGIN] User found: {data.username}")
    
    # Verify password
    logger.debug(f"[LOGIN] Verifying password for user: {data.username}")
    if not verify_password(data.password, user["passwordHash"]):
        logger.warning(f"[LOGIN] Invalid password for user: {data.username}")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    logger.info(f"[LOGIN] Password verified successfully for user: {data.username}")
    
    # Create token
    logger.debug(f"[LOGIN] Creating JWT token for user: {data.username}")
    token = create_token(
        user_id=str(user["_id"]),
        username=user["username"],
        role=user["role"],
    )
    
    logger.info(f"[LOGIN] User logged in successfully: {data.username} (role: {user['role']})")
    
    return LoginResponse(
        token=token,
        user=user_to_response(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(require_auth)):
    """Get current user from token."""
    
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_to_response(user)
