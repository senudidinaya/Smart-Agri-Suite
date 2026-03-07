"""
Pytest configuration and fixtures.

Provides test client and common fixtures for API testing.
"""

import base64
from typing import Generator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.inference import reset_classifier


@pytest.fixture(scope="session")
def test_client() -> Generator[TestClient, None, None]:
    """
    Create a test client for the FastAPI application.
    
    Yields:
        TestClient instance for making test requests.
    """
    with TestClient(app) as client:
        yield client


@pytest.fixture(autouse=True)
def reset_state() -> Generator[None, None, None]:
    """Reset application state between tests."""
    yield
    # Cleanup after each test if needed


@pytest.fixture
def sample_audio_bytes() -> bytes:
    """
    Generate sample audio bytes for testing.
    
    Returns:
        Simple WAV-like bytes for testing.
    """
    # Minimal WAV header + some data
    # This is not a valid WAV file but sufficient for placeholder testing
    wav_header = b"RIFF" + b"\x00" * 4 + b"WAVE"
    wav_header += b"fmt " + b"\x10\x00\x00\x00"  # Chunk size
    wav_header += b"\x01\x00"  # Audio format (PCM)
    wav_header += b"\x01\x00"  # Num channels (mono)
    wav_header += b"\x80\x3e\x00\x00"  # Sample rate (16000)
    wav_header += b"\x00\x7d\x00\x00"  # Byte rate
    wav_header += b"\x02\x00"  # Block align
    wav_header += b"\x10\x00"  # Bits per sample (16)
    wav_header += b"data" + b"\x00" * 4  # Data chunk
    
    # Add some dummy audio data
    audio_data = bytes([0] * 16000)  # 1 second of silence
    
    return wav_header + audio_data


@pytest.fixture
def sample_audio_base64(sample_audio_bytes: bytes) -> str:
    """
    Generate base64-encoded sample audio.
    
    Args:
        sample_audio_bytes: Raw audio bytes.
        
    Returns:
        Base64-encoded audio string.
    """
    return base64.b64encode(sample_audio_bytes).decode("utf-8")


@pytest.fixture
def api_prefix() -> str:
    """Get the API v1 prefix."""
    return "/api/v1"
