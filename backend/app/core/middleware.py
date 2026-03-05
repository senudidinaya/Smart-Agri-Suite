"""
Custom middleware for request processing.
Includes correlation ID injection and request logging.
"""

import time
import uuid
from contextvars import ContextVar
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger(__name__)

# Context variable for correlation ID (thread-safe)
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """
    Get the current request's correlation ID.
    
    Returns:
        Current correlation ID or empty string if not set.
    """
    return correlation_id_var.get()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware to inject and propagate correlation IDs.
    
    Extracts correlation ID from X-Correlation-ID header or generates a new one.
    Makes it available throughout the request lifecycle.
    """

    HEADER_NAME = "X-Correlation-ID"

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """
        Process request with correlation ID.
        
        Args:
            request: Incoming request.
            call_next: Next middleware/handler in chain.
            
        Returns:
            Response with correlation ID header.
        """
        # Extract or generate correlation ID
        correlation_id = request.headers.get(
            self.HEADER_NAME,
            str(uuid.uuid4()),
        )
        
        # Set context variable
        correlation_id_var.set(correlation_id)

        # Process request
        response = await call_next(request)

        # Add correlation ID to response headers
        response.headers[self.HEADER_NAME] = correlation_id

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging request/response details.
    
    Logs request method, path, status code, and processing time.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """
        Log request and response details.
        
        Args:
            request: Incoming request.
            call_next: Next middleware/handler in chain.
            
        Returns:
            Response from handler.
        """
        start_time = time.perf_counter()
        
        # Process request
        response = await call_next(request)
        
        # Calculate processing time
        process_time_ms = (time.perf_counter() - start_time) * 1000
        
        # Log request details
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code}",
            extra={
                "extra_data": {
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "process_time_ms": round(process_time_ms, 2),
                    "client_ip": request.client.host if request.client else None,
                },
                "correlation_id": get_correlation_id(),
            },
        )

        # Add processing time header
        response.headers["X-Process-Time-Ms"] = str(round(process_time_ms, 2))

        return response
