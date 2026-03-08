"""
marketplace_db.py
-----------------
SQLAlchemy engine, session factory, and dependency injection for the
Land Marketplace database (PostgreSQL + PostGIS).
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Generator

load_dotenv()

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/land_marketplace",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a DB session, auto-closes on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
