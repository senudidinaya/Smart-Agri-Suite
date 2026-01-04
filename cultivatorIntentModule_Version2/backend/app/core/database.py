"""
MongoDB database connection and management.
Simple connection handling for the Smart Agri-Suite.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Global database instance
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_db() -> None:
    """Connect to MongoDB on application startup."""
    global _client, _db
    
    settings = get_settings()
    logger.info(f"Connecting to MongoDB: {settings.mongodb_url}")
    
    try:
        _client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000,
        )
        # Verify connection
        await _client.admin.command("ping")
        _db = _client[settings.mongodb_database]
        
        logger.info(f"Connected to database: {settings.mongodb_database}")
        
        # Create indexes
        await _create_indexes()
        
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        logger.error("Make sure MongoDB is running on localhost:27017")
        raise


async def close_db() -> None:
    """Close MongoDB connection on application shutdown."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """Get the database instance."""
    if _db is None:
        raise RuntimeError("Database not connected")
    return _db


async def _create_indexes() -> None:
    """Create required database indexes."""
    db = get_db()
    
    # Users indexes
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True, sparse=True)
    
    # Client profiles index
    await db.client_profiles.create_index("userId", unique=True)
    
    # Jobs indexes
    await db.jobs.create_index("createdByUserId")
    await db.jobs.create_index("status")
    
    # Job applications indexes
    await db.job_applications.create_index("jobId")
    await db.job_applications.create_index("applicantUserId")
    
    logger.info("Database indexes created")
