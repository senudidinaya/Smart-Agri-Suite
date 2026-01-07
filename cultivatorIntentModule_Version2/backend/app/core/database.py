"""
MongoDB database connection and management.
Simple connection handling for the Smart Agri-Suite.

TROUBLESHOOTING SSL ERRORS ON WINDOWS:
--------------------------------------
If you see "TLSV1_ALERT_INTERNAL_ERROR", it means MongoDB Atlas is rejecting the connection.
This is usually caused by:

1. YOUR IP IS NOT WHITELISTED in MongoDB Atlas
   - Go to: https://cloud.mongodb.com
   - Select your cluster > Network Access > Add IP Address
   - Add your current IP or use 0.0.0.0/0 for development

2. OR set SKIP_MONGODB=true in .env to develop without database
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Global database instance
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None
_connection_failed: bool = False


async def connect_db() -> None:
    """Connect to MongoDB on application startup."""
    global _client, _db, _connection_failed
    
    settings = get_settings()
    
    # Check if we should skip MongoDB entirely (for development without DB)
    skip_mongodb = os.environ.get("SKIP_MONGODB", "").lower() == "true"
    if skip_mongodb:
        _connection_failed = True
        logger.warning("SKIP_MONGODB=true - Running without database connection")
        return
    
    logger.info("Connecting to MongoDB...")
    
    try:
        # Create client with SSL configured for Windows compatibility
        _client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=10000,
            tlsAllowInvalidCertificates=True,
        )
        
        # Verify connection
        await _client.admin.command("ping")
        _db = _client[settings.mongodb_database]
        _connection_failed = False
        
        logger.info(f"Connected to database: {settings.mongodb_database}")
        
        # Create indexes
        await _create_indexes()
        
    except Exception as e:
        _connection_failed = True
        error_msg = str(e)
        
        if "SSL" in error_msg or "TLS" in error_msg:
            logger.error("MongoDB SSL connection failed!")
            logger.error("=" * 60)
            logger.error("MOST LIKELY CAUSE: Your IP is not whitelisted in MongoDB Atlas")
            logger.error("")
            logger.error("TO FIX:")
            logger.error("1. Go to https://cloud.mongodb.com")
            logger.error("2. Select your cluster > Network Access")
            logger.error("3. Click 'Add IP Address' and add your current IP")
            logger.error("   Or use 0.0.0.0/0 to allow all IPs (for development only)")
            logger.error("")
            logger.error("OR set SKIP_MONGODB=true in .env to develop without database")
            logger.error("=" * 60)
        else:
            logger.error(f"MongoDB connection failed: {e}")
            
        logger.warning("App will continue without database. Some features won't work.")


async def close_db() -> None:
    """Close MongoDB connection on application shutdown."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")


def get_db() -> Optional[AsyncIOMotorDatabase]:
    """Get the database instance. Returns None if not connected."""
    return _db


def is_db_connected() -> bool:
    """Check if database is connected."""
    return _db is not None and not _connection_failed


async def _create_indexes() -> None:
    """Create required database indexes."""
    db = get_db()
    if db is None:
        logger.warning("Cannot create indexes - database not connected")
        return
    
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
    await db.job_applications.create_index([("jobId", 1), ("applicantUserId", 1)], unique=True)
    
    # Call assessments indexes
    await db.call_assessments.create_index("jobId")
    await db.call_assessments.create_index("clientId")
    await db.call_assessments.create_index([("jobId", 1), ("clientId", 1)])
    
    # In-person interviews indexes
    await db.inperson_interviews.create_index("jobId")
    await db.inperson_interviews.create_index("clientId")
    await db.inperson_interviews.create_index([("jobId", 1), ("clientId", 1)])
    
    # Notifications indexes
    await db.notifications.create_index("userId")
    await db.notifications.create_index([("userId", 1), ("isRead", 1)])
    await db.notifications.create_index([("userId", 1), ("createdAt", -1)])
    
    logger.info("Database indexes created")
