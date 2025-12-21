"""
Webhook Model - For external integrations
"""

from sqlalchemy import JSON, Boolean, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class Webhook(Base):
    """Webhook configuration for external integrations."""
    
    __tablename__ = "webhooks"
    
    __table_args__ = (
        Index("ix_webhooks_event_active", "event_type", "is_active"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Configuration
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    event_type = Column(String(50), nullable=False)  # checkin, alert, fraud, session_created, etc.
    is_active = Column(Boolean, default=True)
    
    # Authentication
    secret_key = Column(String(255))  # For HMAC signature verification
    auth_header = Column(String(512))  # Optional custom auth header
    
    # Retry configuration
    max_retries = Column(Integer, default=3)
    retry_delay_seconds = Column(Integer, default=60)
    
    # Headers and payload template
    custom_headers = Column(JSON)  # Custom HTTP headers
    payload_template = Column(JSON)  # Template for payload transformation
    
    # Metadata
    description = Column(Text)
    created_by_user_id = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Statistics
    total_calls = Column(Integer, default=0)
    successful_calls = Column(Integer, default=0)
    failed_calls = Column(Integer, default=0)
    last_called_at = Column(DateTime(timezone=True))
    last_status_code = Column(Integer)


class WebhookLog(Base):
    """Log of webhook executions."""
    
    __tablename__ = "webhook_logs"
    
    __table_args__ = (
        Index("ix_webhook_logs_webhook_created", "webhook_id", "created_at"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(Integer, nullable=False)
    
    # Request details
    event_type = Column(String(50))
    request_payload = Column(JSON)
    request_headers = Column(JSON)
    
    # Response details
    response_status_code = Column(Integer)
    response_body = Column(Text)
    response_time_ms = Column(Integer)
    
    # Status
    success = Column(Boolean)
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
