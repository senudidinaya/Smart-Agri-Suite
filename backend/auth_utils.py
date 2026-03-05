"""
auth_utils.py
-------------
Lightweight JWT verification + MongoDB auth for the Idle Land Mobilization API.
Shares the same AUTH_SECRET and user schema as the teammate's Login-Register backend
so that a single JWT works across both services.
"""

import os
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
from jose import jwt, JWTError
from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

# ─── Config ────────────────────────────────────────────────
AUTH_SECRET = os.getenv("AUTH_SECRET", "smartagri_secret_key_change_in_production")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "smartagri")


# ─── MongoDB Connection (Motor async) ─────────────────────
_mongo_client = None
_mongo_db = None


def get_mongo_db():
    """Return the MongoDB database handle (lazy‐initialised)."""
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        _mongo_client = AsyncIOMotorClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=10000,
            tlsAllowInvalidCertificates=True,
        )
        _mongo_db = _mongo_client[MONGODB_DATABASE]
    return _mongo_db


async def close_mongo():
    """Call on app shutdown to tidy up."""
    global _mongo_client, _mongo_db
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
        _mongo_db = None


# ─── Password helpers ──────────────────────────────────────
def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


# ─── JWT helpers ───────────────────────────────────────────
def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, AUTH_SECRET, algorithm="HS256")


def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, AUTH_SECRET, algorithms=["HS256"])
    except JWTError:
        return None


# ─── FastAPI dependencies ─────────────────────────────────
def get_current_user_id(authorization: str = Header(None)) -> Optional[str]:
    """
    Extract the MongoDB user‐id from the JWT *if* a valid token is present.
    Returns None when no token is supplied (allows unauthenticated access).
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    payload = verify_token(token)
    if not payload:
        return None

    return payload.get("sub")


def require_auth(authorization: str = Header(...)) -> str:
    """
    Strict variant — raises 401 when no valid token is present.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization[7:]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return user_id


# ─── Pydantic schemas (matching teammate's) ───────────────
class UserRegister(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    address: Optional[str] = Field(None, max_length=200)
    age: Optional[int] = Field(None, ge=18, le=100)
    password: str = Field(..., min_length=4)
    role: Literal["client", "admin"] = "client"


class UserLogin(BaseModel):
    username: str
    password: str
    rememberMe: bool = False


class UserResponse(BaseModel):
    id: str
    fullName: str
    username: str
    email: str
    address: Optional[str] = None
    age: Optional[int] = None
    role: str
    createdAt: str  # ISO string


def user_doc_to_response(user: dict) -> dict:
    """Convert a MongoDB user document to a JSON‐safe dict."""
    return {
        "id": str(user["_id"]),
        "fullName": user["fullName"],
        "username": user["username"],
        "email": user["email"],
        "address": user.get("address"),
        "age": user.get("age"),
        "role": user["role"],
        "createdAt": user["createdAt"].isoformat() if isinstance(user.get("createdAt"), datetime) else str(user.get("createdAt", "")),
    }
