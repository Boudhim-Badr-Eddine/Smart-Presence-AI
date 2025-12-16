"""
Comprehensive logging configuration for SmartPresence AI
"""

import json
import logging
import logging.handlers
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)


# Custom JSON formatter for structured logging
class JsonFormatter(logging.Formatter):
    """Format logs as JSON for easier parsing and monitoring"""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add custom fields if present
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "endpoint"):
            log_data["endpoint"] = record.endpoint
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        return json.dumps(log_data)


class ColoredFormatter(logging.Formatter):
    """Format logs with colors for console output"""

    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[41m",  # Red background
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging(
    log_level: str = "INFO",
    include_console: bool = True,
    include_file: bool = True,
    json_output: bool = False,
) -> Dict[str, logging.Logger]:
    """
    Setup comprehensive logging configuration

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        include_console: Whether to log to console
        include_file: Whether to log to files
        json_output: Whether to use JSON format

    Returns:
        Dictionary of configured loggers
    """

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Console Handler
    if include_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, log_level.upper()))

        if json_output:
            formatter = JsonFormatter()
        else:
            formatter = ColoredFormatter(
                "%(asctime)s - %(levelname)s - %(name)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
            )
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    # File Handlers
    if include_file:
        # General log file
        general_handler = logging.handlers.RotatingFileHandler(
            LOGS_DIR / "app.log", maxBytes=10485760, backupCount=10  # 10MB
        )
        general_handler.setLevel(getattr(logging, log_level.upper()))
        general_handler.setFormatter(
            JsonFormatter()
            if json_output
            else logging.Formatter(
                "%(asctime)s - %(levelname)s - %(name)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
            )
        )
        root_logger.addHandler(general_handler)

        # Error log file
        error_handler = logging.handlers.RotatingFileHandler(
            LOGS_DIR / "error.log", maxBytes=10485760, backupCount=10  # 10MB
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(
            JsonFormatter()
            if json_output
            else logging.Formatter(
                "%(asctime)s - %(levelname)s - %(name)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
            )
        )
        root_logger.addHandler(error_handler)

        # API request log file
        api_handler = logging.handlers.RotatingFileHandler(
            LOGS_DIR / "api.log", maxBytes=10485760, backupCount=20  # 10MB
        )
        api_handler.setLevel(logging.INFO)
        api_handler.setFormatter(JsonFormatter())
        root_logger.addHandler(api_handler)

    # Create specific loggers
    loggers = {
        "app": logging.getLogger("app"),
        "api": logging.getLogger("api"),
        "database": logging.getLogger("database"),
        "auth": logging.getLogger("auth"),
        "facial": logging.getLogger("facial"),
        "notifications": logging.getLogger("notifications"),
    }

    # Configure specific loggers
    for logger_name, logger in loggers.items():
        logger.setLevel(getattr(logging, log_level.upper()))

    return loggers


# Get logger instance
def get_logger(name: str) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name)


# Logger instances
app_logger = get_logger("app")
api_logger = get_logger("api")
db_logger = get_logger("database")
auth_logger = get_logger("auth")
facial_logger = get_logger("facial")
notification_logger = get_logger("notifications")
