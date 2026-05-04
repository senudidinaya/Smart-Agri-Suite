"""
Speech-to-text transcription service.

Uses Groq's Whisper Large v3 (turbo) endpoint to convert call/interview
audio bytes into a transcript. The transcript is fed into the Gate-1
intent model so the text-feature half of the feature vector is populated
(urgency_count, money_count, otp_pin_count, etc.) instead of zeros.
"""

import time
from typing import Optional

import httpx

from cultivator.core.config import get_settings
from cultivator.core.logging import get_logger

logger = get_logger(__name__)

# Groq's fastest Whisper variant. Accuracy is comparable to whisper-large-v3
# at a fraction of the latency, which matters on the inference path.
_WHISPER_MODEL = "whisper-large-v3-turbo"


async def transcribe_audio(
    audio_bytes: bytes,
    *,
    filename: str = "call.wav",
    language: Optional[str] = None,
    timeout_seconds: float = 30.0,
) -> str:
    """
    Transcribe an audio payload to text via Groq's Whisper API.

    Args:
        audio_bytes: Raw audio bytes (WAV/MP3/etc.).
        filename: Filename hint sent to the API; used for content-type sniffing.
        language: Optional ISO-639-1 code (e.g. "en", "si", "ta"). If omitted,
            Whisper auto-detects.
        timeout_seconds: Network timeout.

    Returns:
        The transcript as a single string. Empty string if Whisper produced
        no speech.

    Raises:
        RuntimeError: If GROQ_API_KEY is missing or the API call fails.
    """
    settings = get_settings()

    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured in .env")

    url = f"{settings.groq_base_url}/audio/transcriptions"
    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}

    files = {"file": (filename, audio_bytes, "audio/wav")}
    data = {
        "model": _WHISPER_MODEL,
        "response_format": "text",
    }
    if language:
        data["language"] = language

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(url, headers=headers, files=files, data=data)
            response.raise_for_status()
            transcript = response.text.strip()

        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        logger.info(
            f"[GATE1 STT] transcription=succeeded length={len(transcript)} "
            f"latency_ms={latency_ms} model={_WHISPER_MODEL}"
        )
        return transcript

    except httpx.HTTPStatusError as exc:
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        logger.error(
            f"[GATE1 STT] transcription=failed http_status={exc.response.status_code} "
            f"latency_ms={latency_ms} body={exc.response.text[:200]}"
        )
        raise RuntimeError(f"Groq Whisper returned {exc.response.status_code}") from exc

    except httpx.HTTPError as exc:
        latency_ms = round((time.monotonic() - t0) * 1000, 1)
        logger.error(
            f"[GATE1 STT] transcription=failed network_error={exc} latency_ms={latency_ms}"
        )
        raise RuntimeError(f"Groq Whisper network error: {exc}") from exc
