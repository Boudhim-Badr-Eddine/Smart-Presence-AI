"""
Audit Logging Service - Track all sensitive operations
"""

from typing import Any, Dict, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


class AuditService:
    """Async-friendly audit service used by middleware/routes."""

    def __init__(self, db: Session):
        self.db = db

    async def log_action(
        self,
        *,
        user_id: int,
        action_type: str,
        action_description: str,
        resource_type: str | None = None,
        resource_id: int | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        request_method: str | None = None,
        request_path: str | None = None,
        old_values: Dict[str, Any] | None = None,
        new_values: Dict[str, Any] | None = None,
        success: str = "success",
        error_message: str | None = None,
        meta: Dict[str, Any] | None = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            action_description=action_description,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            old_values=old_values,
            new_values=new_values,
            meta=meta,
            success=success,
            error_message=error_message,
        )
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log


class AuditLogger:
    """Service for logging auditable events."""
    
    @staticmethod
    def log(
        db: Session,
        user: Optional[User],
        action_type: str,
        action_description: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
        success: str = "success",
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        Examples:
        - AuditLogger.log(db, user, "login", "User logged in", request=request)
        - AuditLogger.log(db, admin, "delete", "Deleted student", "student", 123, old_values={...})
        - AuditLogger.log(db, trainer, "export", "Exported attendance report", metadata={"format": "pdf"})
        """
        
        # Extract request details
        ip_address = None
        user_agent = None
        request_method = None
        request_path = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            request_method = request.method
            request_path = str(request.url.path)
        
        # Create audit log
        audit_log = AuditLog(
            user_id=user.id if user else None,
            user_role=user.role if user else None,
            user_email=user.email if user else None,
            action_type=action_type,
            action_description=action_description,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            old_values=old_values,
            new_values=new_values,
            meta=metadata,
            success=success,
            error_message=error_message,
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
    
    @staticmethod
    def log_data_access(
        db: Session,
        user: User,
        resource_type: str,
        resource_id: int,
        action: str = "view",
        request: Optional[Request] = None,
    ):
        """Log GDPR-required data access (viewing personal data)."""
        return AuditLogger.log(
            db,
            user,
            action,
            f"Accessed {resource_type} #{resource_id}",
            resource_type=resource_type,
            resource_id=resource_id,
            request=request,
        )
    
    @staticmethod
    def log_data_export(
        db: Session,
        user: User,
        export_type: str,
        format: str,
        filters: Dict[str, Any],
        request: Optional[Request] = None,
    ):
        """Log data export operations for GDPR compliance."""
        return AuditLogger.log(
            db,
            user,
            "export",
            f"Exported {export_type} data as {format}",
            resource_type=export_type,
            metadata={"format": format, "filters": filters},
            request=request,
        )
    
    @staticmethod
    def log_data_deletion(
        db: Session,
        user: User,
        resource_type: str,
        resource_id: int,
        old_values: Dict[str, Any],
        request: Optional[Request] = None,
    ):
        """Log GDPR data deletion requests."""
        return AuditLogger.log(
            db,
            user,
            "delete",
            f"Deleted {resource_type} #{resource_id} (GDPR request)",
            resource_type=resource_type,
            resource_id=resource_id,
            old_values=old_values,
            request=request,
        )
