"""
FastAPI Application Entry Point.

Paralinguistic Voice-Based Buyer Intent Prediction System
Smart Agri-Suite - Backend API
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.routes import router as api_v1_router
from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.core.middleware import CorrelationIdMiddleware, RequestLoggingMiddleware, get_correlation_id
from app.core.database import connect_db, close_db
from app.services.inference import get_classifier, reset_classifier

# Initialize logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    
    Handles startup and shutdown events:
    - Startup: Connect to MongoDB, load ML model
    - Shutdown: Close database, cleanup resources
    """
    settings = get_settings()
    
    # Startup
    logger.info(
        f"Starting {settings.app_name} v{settings.app_version}",
        extra={
            "extra_data": {
                "environment": settings.environment,
                "debug": settings.debug,
            }
        },
    )
    
    # Connect to MongoDB
    try:
        await connect_db()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # Continue without database for health checks
    
    # Initialize classifier (loads model)
    classifier = get_classifier()
    logger.info(f"Model loaded: {classifier.is_loaded}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await close_db()
    reset_classifier()
    logger.info("Cleanup complete")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        Configured FastAPI application instance.
    """
    settings = get_settings()
    
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Paralinguistic Voice-Based Buyer Intent Prediction API.\n\n"
            "Analyzes voice recordings to predict buyer intent using "
            "paralinguistic features (tone, pitch, pace, etc.)."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    
    # Add middleware (order matters - last added = runs first)
    # CORS middleware must be added LAST so it runs FIRST
    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    
    # CORS middleware - allow all origins for mobile app development
    # Added last so it processes requests first (handles preflight OPTIONS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins for mobile development
        allow_credentials=False,  # Must be False when using allow_origins=["*"]
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID", "X-Process-Time-Ms"],
    )
    
    # Include API routers
    app.include_router(api_v1_router)
    
    # Register exception handlers
    register_exception_handlers(app)
    
    return app


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers.
    
    Args:
        app: FastAPI application instance.
    """
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        """Handle request validation errors."""
        correlation_id = get_correlation_id()
        
        # Extract first error for simplified message
        errors = exc.errors()
        first_error = errors[0] if errors else {}
        
        field = ".".join(str(loc) for loc in first_error.get("loc", ["unknown"]))
        message = first_error.get("msg", "Validation error")
        
        logger.warning(
            f"Validation error: {field} - {message}",
            extra={
                "extra_data": {"errors": errors},
                "correlation_id": correlation_id,
            },
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": message,
                    "field": field,
                    "details": errors,
                },
                "correlation_id": correlation_id,
            },
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        """Handle HTTP exceptions."""
        correlation_id = get_correlation_id()
        
        # Handle structured detail (dict) or simple string
        if isinstance(exc.detail, dict):
            error_content = exc.detail
        else:
            error_content = {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
            }
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": error_content,
                "correlation_id": correlation_id,
            },
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """Handle unexpected exceptions."""
        correlation_id = get_correlation_id()
        
        logger.exception(
            f"Unhandled exception: {exc}",
            extra={"correlation_id": correlation_id},
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                },
                "correlation_id": correlation_id,
            },
        )


# Create application instance
app = create_app()


# Root endpoint
@app.get("/", include_in_schema=False)
async def root() -> dict:
    """Root endpoint - redirects to docs."""
    settings = get_settings()
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health",
    }


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
