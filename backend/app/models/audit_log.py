"""
Audit Log Model - Track all admin and trainer actions for GDPR compliance
"""

from sqlalchemy import JSON, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class AuditLog(Base):
    """Comprehensive audit logging for all sensitive operations."""
    
    __tablename__ = "audit_logs"
    
    __table_args__ = (
        Index("ix_audit_user_action", "user_id", "action_type"),
        Index("ix_audit_timestamp", "timestamp"),
        Index("ix_audit_resource", "resource_type", "resource_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Who performed the action
    user_id = Column(Integer, nullable=False)
    user_role = Column(String(20))  # admin, trainer, student
    user_email = Column(String(255))
    
    # What action was performed
    action_type = Column(String(50), nullable=False)  # create, update, delete, view, export, login, etc.
    action_description = Column(Text)
    
    # What resource was affected
    resource_type = Column(String(50))  # user, session, attendance, alert, message, etc.
    resource_id = Column(Integer)
    
    # Request details
    ip_address = Column(String(45))
    user_agent = Column(String(512))
    request_method = Column(String(10))
    request_path = Column(String(512))
    
    # Changes (for update/delete actions)
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # Additional metadata
    meta = Column(JSON)
    
    # Status
    success = Column(String(20), default="success")  # success, failed, unauthorized
    error_message = Column(Text)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # GDPR retention (auto-delete after X days)
    retention_days = Column(Integer, default=365)
