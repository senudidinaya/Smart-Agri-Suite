"""
Simple authentication utilities.
Basic password hashing and token generation.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import jwt, JWTError

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    # Truncate to 72 bytes (bcrypt limit)
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        # Truncate to 72 bytes (bcrypt limit)
        password_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_token(user_id: str, username: str, role: str) -> str:
    """
    Create a simple JWT token.
    Token expires in 24 hours.
    """
    settings = get_settings()
    
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    
    token = jwt.encode(payload, settings.auth_secret, algorithm="HS256")
    return token


def verify_token(token: str) -> Optional[dict]:
    """
    Verify a JWT token and return the payload.
    Returns None if token is invalid or expired.
    """
    settings = get_settings()
    
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
        return payload
    except JWTError as e:
        logger.warning(f"Token verification failed: {e}")
        return None
