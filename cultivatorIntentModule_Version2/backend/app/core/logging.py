"""
Structured logging configuration with JSON support.
Provides consistent logging across the application.
"""

import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import json

from app.core.config import get_settings


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON.
        
        Args:
            record: The log record to format.
            
        Returns:
            JSON formatted string.
        """
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add correlation ID if present
        if hasattr(record, "correlation_id"):
            log_data["correlation_id"] = record.correlation_id

        # Add extra fields
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, default=str)


class StandardFormatter(logging.Formatter):
    """Standard text formatter with correlation ID support."""

    def __init__(self) -> None:
        super().__init__(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(correlation_id)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record with correlation ID.
        
        Args:
            record: The log record to format.
            
        Returns:
            Formatted string.
        """
        if not hasattr(record, "correlation_id"):
            record.correlation_id = "-"
        return super().format(record)


def setup_logging(
    log_level: Optional[str] = None,
    json_format: Optional[bool] = None,
) -> logging.Logger:
    """
    Configure application logging.
    
    Args:
        log_level: Override log level from settings.
        json_format: Override JSON format setting.
        
    Returns:
        Configured root logger.
    """
    settings = get_settings()
    
    level = log_level or settings.log_level
    use_json = json_format if json_format is not None else settings.log_json_format

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    root_logger.handlers.clear()

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper()))

    # Set formatter based on configuration
    if use_json:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(StandardFormatter())

    root_logger.addHandler(console_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the specified name.
    
    Args:
        name: Logger name (typically __name__).
        
    Returns:
        Logger instance.
    """
    return logging.getLogger(name)
