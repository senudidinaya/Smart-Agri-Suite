"""
Audio processing utilities.

Provides functions for audio validation, conversion, and base64 handling.
"""

import base64
import io
from typing import Optional, Tuple

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class AudioValidationError(Exception):
    """Raised when audio validation fails."""

    def __init__(self, message: str, code: str = "INVALID_AUDIO") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


def decode_base64_audio(
    audio_base64: str,
    expected_format: Optional[str] = None,
) -> bytes:
    """
    Decode base64-encoded audio data.
    
    Args:
        audio_base64: Base64-encoded audio string.
        expected_format: Expected audio format (for logging).
        
    Returns:
        Decoded audio bytes.
        
    Raises:
        AudioValidationError: If decoding fails.
    """
    try:
        # Handle data URI prefix if present
        if "," in audio_base64:
            audio_base64 = audio_base64.split(",", 1)[1]
        
        # Decode base64
        audio_bytes = base64.b64decode(audio_base64)
        
        if len(audio_bytes) == 0:
            raise AudioValidationError(
                "Decoded audio data is empty",
                code="EMPTY_AUDIO",
            )
        
        logger.debug(
            f"Decoded base64 audio: {len(audio_bytes)} bytes",
            extra={"extra_data": {"format": expected_format}},
        )
        
        return audio_bytes
        
    except base64.binascii.Error as e:
        raise AudioValidationError(
            f"Invalid base64 encoding: {e}",
            code="INVALID_BASE64",
        )


def validate_audio_format(
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
    audio_format: Optional[str] = None,
) -> str:
    """
    Validate and determine audio format.
    
    Args:
        filename: Original filename (e.g., "audio.wav").
        content_type: MIME content type (e.g., "audio/wav").
        audio_format: Explicit format string (e.g., "wav").
        
    Returns:
        Validated audio format string.
        
    Raises:
        AudioValidationError: If format is not supported.
    """
    settings = get_settings()
    supported = settings.supported_audio_formats
    
    # Determine format from available info
    detected_format: Optional[str] = None
    
    if audio_format:
        detected_format = audio_format.lower().strip()
    elif filename:
        # Extract extension from filename
        if "." in filename:
            detected_format = filename.rsplit(".", 1)[-1].lower()
    elif content_type:
        # Extract from MIME type
        mime_to_format = {
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/wave": "wav",
            "audio/mp3": "mp3",
            "audio/mpeg": "mp3",
            "audio/ogg": "ogg",
            "audio/flac": "flac",
            "audio/x-flac": "flac",
            "audio/m4a": "m4a",
            "audio/x-m4a": "m4a",
            "audio/mp4": "m4a",
        }
        detected_format = mime_to_format.get(content_type.lower())
    
    if not detected_format:
        raise AudioValidationError(
            "Could not determine audio format. Please specify format explicitly.",
            code="UNKNOWN_FORMAT",
        )
    
    if detected_format not in supported:
        raise AudioValidationError(
            f"Unsupported audio format: {detected_format}. "
            f"Supported formats: {', '.join(supported)}",
            code="UNSUPPORTED_FORMAT",
        )
    
    return detected_format


def validate_audio_size(
    audio_bytes: bytes,
    max_size_mb: float = 50.0,
) -> None:
    """
    Validate audio file size.
    
    Args:
        audio_bytes: Audio data bytes.
        max_size_mb: Maximum allowed size in megabytes.
        
    Raises:
        AudioValidationError: If file is too large.
    """
    size_mb = len(audio_bytes) / (1024 * 1024)
    
    if size_mb > max_size_mb:
        raise AudioValidationError(
            f"Audio file too large: {size_mb:.1f}MB. Maximum: {max_size_mb}MB",
            code="FILE_TOO_LARGE",
        )


def estimate_audio_duration(
    audio_bytes: bytes,
    sample_rate: int = 16000,
    bits_per_sample: int = 16,
    channels: int = 1,
) -> float:
    """
    Estimate audio duration from raw bytes.
    
    This is a rough estimate based on typical audio parameters.
    For accurate duration, use a library like librosa or pydub.
    
    Args:
        audio_bytes: Audio data bytes.
        sample_rate: Samples per second.
        bits_per_sample: Bits per sample.
        channels: Number of audio channels.
        
    Returns:
        Estimated duration in seconds.
    """
    bytes_per_sample = bits_per_sample // 8
    bytes_per_second = sample_rate * bytes_per_sample * channels
    
    if bytes_per_second == 0:
        return 0.0
    
    return len(audio_bytes) / bytes_per_second


def validate_audio_duration(
    duration_seconds: float,
    max_duration: Optional[float] = None,
) -> None:
    """
    Validate audio duration.
    
    Args:
        duration_seconds: Audio duration in seconds.
        max_duration: Maximum allowed duration. Uses config default if None.
        
    Raises:
        AudioValidationError: If duration exceeds limit.
    """
    settings = get_settings()
    max_dur = max_duration or settings.max_audio_duration_seconds
    
    if duration_seconds > max_dur:
        raise AudioValidationError(
            f"Audio too long: {duration_seconds:.1f}s. Maximum: {max_dur}s",
            code="AUDIO_TOO_LONG",
        )
