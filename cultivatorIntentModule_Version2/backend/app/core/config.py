"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables and .env file.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application settings
    app_name: str = Field(
        default="Smart Agri-Suite API",
        description="Application name",
    )
    app_version: str = Field(default="2.0.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(default="development", description="Environment name")

    # Server settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")

    # CORS settings
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:8080",
            "http://localhost:19006",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:19006",
        ],
        description="Allowed CORS origins",
    )

    # MongoDB settings
    mongodb_url: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB connection URL",
    )
    mongodb_database: str = Field(
        default="smartagri",
        description="MongoDB database name",
    )

    # Simple auth secret
    auth_secret: str = Field(
        default="smartagri_secret_key_change_in_production",
        description="Secret key for token generation",
    )

    # Model settings
    model_path: Path = Field(
        default=Path("models/intent_classifier.pt"),
        description="Path to the trained model file",
    )
    model_device: str = Field(
        default="cpu",
        description="Device to run model on (cpu/cuda)",
    )

    # Audio processing settings
    max_audio_duration_seconds: float = Field(
        default=30.0,
        description="Maximum audio duration in seconds",
    )
    supported_audio_formats: List[str] = Field(
        default=["wav", "mp3", "ogg", "flac", "m4a"],
        description="Supported audio file formats",
    )
    sample_rate: int = Field(default=16000, description="Target audio sample rate")

    # Logging settings
    log_level: str = Field(default="INFO", description="Logging level")
    log_json_format: bool = Field(
        default=True,
        description="Use JSON format for logs",
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    
    Returns:
        Settings: Application settings instance.
    """
    return Settings()
