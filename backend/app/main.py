import os
import time
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.audit_middleware import AuditMiddleware
from app.core.config import get_settings
from app.core.logging_config import get_logger, setup_logging
from app.core.monitoring import RequestMetric, health_status, metrics_collector
from app.utils.scheduler import scheduler

# Setup comprehensive logging
setup_logging(log_level="INFO", include_console=True, include_file=True, json_output=True)

logger = get_logger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Smart Presence AI - Intelligent Attendance Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Response compression for bandwidth savings
app.add_middleware(GZipMiddleware, minimum_size=500)

# Audit logging middleware for compliance
app.add_middleware(AuditMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for face images
storage_dir = Path(os.getenv("FACE_STORAGE_DIR", "/app/storage"))
storage_dir.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_dir)), name="storage")


# Request logging middleware with metrics
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and measure response time with metrics"""
    start_time = time.time()

    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time
    duration_ms = duration * 1000

    # Log response
    logger.info(
        f"Response: {request.method} {request.url.path} "
        f"Status: {response.status_code} Duration: {duration_ms:.1f}ms"
    )

    # Record metrics
    metric = RequestMetric(
        timestamp=datetime.utcnow().isoformat(),
        endpoint=request.url.path,
        method=request.method,
        status_code=response.status_code,
        duration_ms=duration_ms,
        user_id=None,  # Can be extracted from request context if available
        error=None if response.status_code < 400 else f"Status {response.status_code}",
    )
    metrics_collector.record_request(metric)

    # Add performance header
    response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"

    return response


# Global exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with consistent format"""
    logger.error(f"HTTP error: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": "http_error",
            "message": exc.detail,
            "status_code": exc.status_code,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed feedback"""
    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": " -> ".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(f"Validation error: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "validation_error",
            "message": "Invalid request data",
            "details": errors,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for unexpected errors"""
    logger.exception(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again later.",
            "details": str(exc) if settings.debug else None,
        },
    )


# Include API router
app.include_router(api_router, prefix="/api")


# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """Detailed health check endpoint"""
    health_status.last_check = datetime.utcnow()
    return health_status.to_dict()


@app.get("/metrics/summary", tags=["Metrics"])
async def metrics_summary() -> dict:
    """Get metrics summary for the last hour"""
    return {
        "requests": metrics_collector.get_request_stats(hours=1),
        "errors": metrics_collector.get_error_stats(hours=24),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/metrics/requests", tags=["Metrics"])
async def metrics_requests(hours: int = 1) -> dict:
    """Get detailed request metrics"""
    return metrics_collector.get_request_stats(hours=hours)


@app.get("/metrics/errors", tags=["Metrics"])
async def metrics_errors(hours: int = 24) -> dict:
    """Get detailed error metrics"""
    return metrics_collector.get_error_stats(hours=hours)


@app.post("/metrics/export", tags=["Metrics"])
async def export_metrics() -> dict:
    """Export all collected metrics to file"""
    filepath = metrics_collector.export_metrics()
    return {"success": True, "message": "Metrics exported successfully", "filepath": filepath}


@app.post("/metrics/cleanup", tags=["Metrics"])
async def cleanup_metrics() -> dict:
    """Clean up old metrics"""
    metrics_collector.cleanup_old_metrics()
    return {
        "success": True,
        "message": f"Metrics older than {metrics_collector.retention_days} days cleaned up",
    }


@app.get("/", tags=["Root"])
async def root() -> dict:
    """Root endpoint with API information"""
    return {
        "message": "Smart Presence AI - Intelligent Attendance Management System",
        "version": "1.0.0",
        "docs": "/docs",
        "api": "/api",
        "health": "/health",
        "metrics": "/metrics/summary",
    }


@app.on_event("startup")
async def on_startup():
    logger.info("Starting scheduler for recurring tasks")
    scheduler.start()
    
    # Initialize event subscribers
    from app.core.event_subscribers import initialize_event_subscribers
    await initialize_event_subscribers()
    logger.info("Event bus subscribers initialized")


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Stopping scheduler")
    scheduler.stop()
