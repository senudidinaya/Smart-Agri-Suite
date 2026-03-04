"""
Prediction endpoint for buyer intent classification.

Accepts audio input via file upload or base64-encoded JSON.
"""

import time
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.logging import get_logger
from app.core.middleware import get_correlation_id
from app.schemas.prediction import (
    Base64AudioRequest,
    ErrorDetail,
    ErrorResponse,
    PredictionResponse,
)
from app.services.inference import get_classifier
from app.utils.audio import (
    AudioValidationError,
    decode_base64_audio,
    validate_audio_format,
    validate_audio_size,
)

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "/predict/upload",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid audio input"},
        500: {"model": ErrorResponse, "description": "Inference error"},
    },
    summary="Predict Intent from Audio Upload",
    description="Upload an audio file and predict buyer intent from paralinguistic features.",
    tags=["Prediction"],
)
async def predict_from_upload(
    audio_file: UploadFile = File(
        ...,
        description="Audio file to analyze (WAV, MP3, OGG, FLAC, M4A)",
    ),
) -> PredictionResponse:
    """
    Predict buyer intent from an uploaded audio file.
    
    Args:
        audio_file: Uploaded audio file.
        
    Returns:
        PredictionResponse with intent classification results.
        
    Raises:
        HTTPException: If audio validation or inference fails.
    """
    start_time = time.perf_counter()
    correlation_id = get_correlation_id()
    
    logger.info(
        f"Processing audio upload: {audio_file.filename}",
        extra={
            "extra_data": {
                "filename": audio_file.filename,
                "content_type": audio_file.content_type,
            },
            "correlation_id": correlation_id,
        },
    )
    
    try:
        # Validate format
        audio_format = validate_audio_format(
            filename=audio_file.filename,
            content_type=audio_file.content_type,
        )
        
        # Read file content
        audio_bytes = await audio_file.read()
        
        # Validate size
        validate_audio_size(audio_bytes)
        
        # Get classifier and predict
        classifier = get_classifier()
        
        if not classifier.is_loaded:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not loaded. Service unavailable.",
            )
        
        prediction_result, audio_duration = classifier.predict(audio_bytes)
        
        # Calculate processing time
        processing_time_ms = (time.perf_counter() - start_time) * 1000
        
        return PredictionResponse(
            success=True,
            prediction=prediction_result,
            processing_time_ms=round(processing_time_ms, 2),
            audio_duration_seconds=round(audio_duration, 2),
            correlation_id=correlation_id,
        )
        
    except AudioValidationError as e:
        logger.warning(
            f"Audio validation failed: {e.message}",
            extra={"correlation_id": correlation_id},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": e.code,
                "message": e.message,
                "field": "audio_file",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            f"Prediction failed: {e}",
            extra={"correlation_id": correlation_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INFERENCE_ERROR",
                "message": f"Prediction failed: {str(e)}",
            },
        )


@router.post(
    "/predict/base64",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid audio input"},
        500: {"model": ErrorResponse, "description": "Inference error"},
    },
    summary="Predict Intent from Base64 Audio",
    description="Submit base64-encoded audio and predict buyer intent from paralinguistic features.",
    tags=["Prediction"],
)
async def predict_from_base64(
    request: Base64AudioRequest,
) -> PredictionResponse:
    """
    Predict buyer intent from base64-encoded audio.
    
    Args:
        request: Base64AudioRequest with encoded audio data.
        
    Returns:
        PredictionResponse with intent classification results.
        
    Raises:
        HTTPException: If audio validation or inference fails.
    """
    start_time = time.perf_counter()
    correlation_id = get_correlation_id()
    
    logger.info(
        f"Processing base64 audio: format={request.audio_format}",
        extra={
            "extra_data": {
                "format": request.audio_format,
                "base64_length": len(request.audio_base64),
            },
            "correlation_id": correlation_id,
        },
    )
    
    try:
        # Validate format
        audio_format = validate_audio_format(audio_format=request.audio_format)
        
        # Decode base64
        audio_bytes = decode_base64_audio(
            request.audio_base64,
            expected_format=audio_format,
        )
        
        # Validate size
        validate_audio_size(audio_bytes)
        
        # Get classifier and predict
        classifier = get_classifier()
        
        if not classifier.is_loaded:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not loaded. Service unavailable.",
            )
        
        prediction_result, audio_duration = classifier.predict(
            audio_bytes,
            sample_rate=request.sample_rate or 16000,
        )
        
        # Calculate processing time
        processing_time_ms = (time.perf_counter() - start_time) * 1000
        
        return PredictionResponse(
            success=True,
            prediction=prediction_result,
            processing_time_ms=round(processing_time_ms, 2),
            audio_duration_seconds=round(audio_duration, 2),
            correlation_id=correlation_id,
        )
        
    except AudioValidationError as e:
        logger.warning(
            f"Audio validation failed: {e.message}",
            extra={"correlation_id": correlation_id},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": e.code,
                "message": e.message,
                "field": "audio_base64",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            f"Prediction failed: {e}",
            extra={"correlation_id": correlation_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "INFERENCE_ERROR",
                "message": f"Prediction failed: {str(e)}",
            },
        )
