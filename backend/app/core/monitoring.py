"""
Monitoring and metrics collection for SmartPresence AI
"""

import json
import threading
import time
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path
from typing import Any, Dict, List, Optional

from .logging_config import get_logger

logger = get_logger("app")
metrics_logger = get_logger("api")

# Metrics file location
METRICS_DIR = Path("metrics")
METRICS_DIR.mkdir(exist_ok=True)


@dataclass
class RequestMetric:
    """Request metric data"""

    timestamp: str
    endpoint: str
    method: str
    status_code: int
    duration_ms: float
    user_id: Optional[int] = None
    error: Optional[str] = None
    request_size: Optional[int] = None
    response_size: Optional[int] = None


@dataclass
class SystemMetric:
    """System health metric"""

    timestamp: str
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    active_connections: int
    request_queue_size: int


@dataclass
class ServiceMetric:
    """Service-specific metric"""

    timestamp: str
    service: str
    operation: str
    success: bool
    duration_ms: float
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class MetricsCollector:
    """Collect and store application metrics"""

    def __init__(self, retention_days: int = 7):
        self.retention_days = retention_days
        self.metrics: Dict[str, List[Dict]] = defaultdict(list)
        self.lock = threading.Lock()

    def record_request(self, metric: RequestMetric) -> None:
        """Record a request metric"""
        with self.lock:
            self.metrics["requests"].append(asdict(metric))
            metrics_logger.info(
                f"API Request: {metric.method} {metric.endpoint}",
                extra={
                    "endpoint": metric.endpoint,
                    "method": metric.method,
                    "status_code": metric.status_code,
                    "duration_ms": metric.duration_ms,
                    "user_id": metric.user_id,
                },
            )

    def record_system_metric(self, metric: SystemMetric) -> None:
        """Record a system metric"""
        with self.lock:
            self.metrics["system"].append(asdict(metric))

    def record_service_metric(self, metric: ServiceMetric) -> None:
        """Record a service metric"""
        with self.lock:
            self.metrics["services"].append(asdict(metric))
            level = "info" if metric.success else "error"
            logger.log(
                getattr(logger, level),
                f"{metric.service}: {metric.operation}",
                extra={
                    "service": metric.service,
                    "operation": metric.operation,
                    "duration_ms": metric.duration_ms,
                    "success": metric.success,
                    "error": metric.error,
                },
            )

    def get_request_stats(self, hours: int = 1) -> Dict[str, Any]:
        """Get request statistics for the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        cutoff_str = cutoff_time.isoformat()

        requests = [r for r in self.metrics["requests"] if r.get("timestamp", "") > cutoff_str]

        if not requests:
            return {}

        status_codes = defaultdict(int)
        endpoints = defaultdict(lambda: {"count": 0, "avg_duration": 0})
        total_duration = 0

        for req in requests:
            status_codes[req["status_code"]] += 1
            endpoint = req["endpoint"]
            endpoints[endpoint]["count"] += 1
            total_duration += req["duration_ms"]

        # Calculate average durations
        for endpoint in endpoints:
            endpoint_requests = [r for r in requests if r["endpoint"] == endpoint]
            endpoint_durations = [r["duration_ms"] for r in endpoint_requests]
            endpoints[endpoint]["avg_duration"] = (
                sum(endpoint_durations) / len(endpoint_durations) if endpoint_durations else 0
            )

        return {
            "total_requests": len(requests),
            "status_codes": dict(status_codes),
            "endpoints": dict(endpoints),
            "avg_duration_ms": total_duration / len(requests) if requests else 0,
            "min_duration_ms": min((r["duration_ms"] for r in requests), default=0),
            "max_duration_ms": max((r["duration_ms"] for r in requests), default=0),
        }

    def get_error_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get error statistics"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        cutoff_str = cutoff_time.isoformat()

        errors = [
            r
            for r in self.metrics["requests"]
            if r.get("status_code", 0) >= 400 and r.get("timestamp", "") > cutoff_str
        ]

        error_types = defaultdict(int)
        error_endpoints = defaultdict(int)

        for error in errors:
            error_types[error.get("status_code", "unknown")] += 1
            error_endpoints[error.get("endpoint", "unknown")] += 1

        return {
            "total_errors": len(errors),
            "error_types": dict(error_types),
            "error_endpoints": dict(error_endpoints),
            "errors_by_hour": self._count_by_hour(errors),
        }

    def cleanup_old_metrics(self) -> None:
        """Remove metrics older than retention period"""
        cutoff_time = datetime.utcnow() - timedelta(days=self.retention_days)
        cutoff_str = cutoff_time.isoformat()

        with self.lock:
            for metric_type in self.metrics:
                self.metrics[metric_type] = [
                    m for m in self.metrics[metric_type] if m.get("timestamp", "") > cutoff_str
                ]

    def export_metrics(self, filepath: Optional[Path] = None) -> str:
        """Export metrics to JSON file"""
        if filepath is None:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filepath = METRICS_DIR / f"metrics_{timestamp}.json"

        with self.lock:
            with open(filepath, "w") as f:
                json.dump(dict(self.metrics), f, indent=2, default=str)

        logger.info(f"Metrics exported to {filepath}")
        return str(filepath)

    @staticmethod
    def _count_by_hour(items: List[Dict]) -> Dict[str, int]:
        """Count items by hour"""
        hourly_counts = defaultdict(int)
        for item in items:
            timestamp_str = item.get("timestamp", "")
            if timestamp_str:
                # Extract hour from ISO format timestamp
                hour = timestamp_str[:13] + ":00"
                hourly_counts[hour] += 1
        return dict(hourly_counts)


# Global metrics collector instance
metrics_collector = MetricsCollector()


def track_request(func):
    """Decorator to track request metrics"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = None
        error = None
        status_code = 500

        try:
            result = func(*args, **kwargs)
            status_code = getattr(result, "status_code", 200)
            return result
        except Exception as e:
            error = str(e)
            logger.exception(f"Error in {func.__name__}")
            raise
        finally:
            duration_ms = (time.time() - start_time) * 1000

            # Try to extract request context if available
            user_id = None
            endpoint = getattr(func, "__name__", "unknown")
            method = "GET"

            metric = RequestMetric(
                timestamp=datetime.utcnow().isoformat(),
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                duration_ms=duration_ms,
                user_id=user_id,
                error=error,
            )
            metrics_collector.record_request(metric)

    return wrapper


def track_service(service_name: str, operation: str):
    """Decorator to track service operation metrics"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = False
            error = None
            result = None

            try:
                result = func(*args, **kwargs)
                success = True
                return result
            except Exception as e:
                error = str(e)
                logger.exception(f"Error in {service_name}.{operation}")
                raise
            finally:
                duration_ms = (time.time() - start_time) * 1000
                metric = ServiceMetric(
                    timestamp=datetime.utcnow().isoformat(),
                    service=service_name,
                    operation=operation,
                    success=success,
                    duration_ms=duration_ms,
                    error=error,
                )
                metrics_collector.record_service_metric(metric)

        return wrapper

    return decorator


# Health check data
class HealthStatus:
    """Track system health status"""

    def __init__(self):
        self.api_healthy = True
        self.database_healthy = True
        self.facial_service_healthy = True
        self.redis_healthy = True
        self.last_check = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "status": "healthy" if self.is_healthy else "degraded",
            "api": "healthy" if self.api_healthy else "unhealthy",
            "database": "healthy" if self.database_healthy else "unhealthy",
            "facial_service": "healthy" if self.facial_service_healthy else "unhealthy",
            "redis": "healthy" if self.redis_healthy else "unhealthy",
            "last_check": self.last_check.isoformat(),
            "timestamp": datetime.utcnow().isoformat(),
        }

    @property
    def is_healthy(self) -> bool:
        """Check if all critical services are healthy"""
        return all(
            [
                self.api_healthy,
                self.database_healthy,
            ]
        )


# Global health status
health_status = HealthStatus()
