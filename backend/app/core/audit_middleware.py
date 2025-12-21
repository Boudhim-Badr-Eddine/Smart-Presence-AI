"""Audit logging middleware for tracking admin/trainer actions."""
import json
import time
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging_config import logger
from app.db.session import SessionLocal
from app.services.audit_logger import AuditService


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to log admin and trainer actions for audit trail."""
    
    # Paths that should be audited
    AUDIT_PATHS = [
        "/api/admin/",
        "/api/trainer/",
        "/api/gdpr/",
        "/api/users/",
        "/api/students/",
    ]
    
    # Methods to audit
    AUDIT_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request and log if it's an auditable action."""
        path = request.url.path
        method = request.method
        
        # Check if this request should be audited
        should_audit = (
            method in self.AUDIT_METHODS
            and any(path.startswith(audit_path) for audit_path in self.AUDIT_PATHS)
        )
        
        if not should_audit:
            return await call_next(request)
        
        # Get user from request state (set by auth dependency)
        user = getattr(request.state, 'user', None)
        
        # Capture request body for audit
        body = None
        if method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                if body_bytes:
                    body = json.loads(body_bytes)
                    # Re-add body to request for downstream processing
                    async def receive():
                        return {"type": "http.request", "body": body_bytes}
                    request._receive = receive
            except Exception as e:
                logger.warning(f"Could not capture request body for audit: {e}")
        
        # Process request
        start_time = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Log audit entry in background
        if user and hasattr(user, 'id'):
            try:
                db = SessionLocal()
                audit_service = AuditService(db)
                
                # Extract resource info from path
                path_parts = path.split('/')
                resource_type = path_parts[2] if len(path_parts) > 2 else None
                resource_id = None
                
                # Try to extract ID from path
                for part in path_parts:
                    if part.isdigit():
                        resource_id = int(part)
                        break
                
                # Determine action type
                action_type = f"{method.lower()}_{resource_type}"
                
                # Get client info
                client_host = request.client.host if request.client else None
                user_agent = request.headers.get('user-agent', '')
                
                # Log the action
                await audit_service.log_action(
                    user_id=user.id,
                    action_type=action_type,
                    action_description=f"{method} {path}",
                    resource_type=resource_type,
                    resource_id=resource_id,
                    ip_address=client_host,
                    user_agent=user_agent,
                    request_method=method,
                    request_path=path,
                    new_values=body if method in ["POST", "PUT", "PATCH"] else None,
                    success="success" if response.status_code < 400 else "failure",
                    meta={
                        'status_code': response.status_code,
                        'duration_ms': duration_ms,
                    }
                )
                
                db.close()
                
            except Exception as e:
                logger.error(f"Failed to log audit entry: {e}")
        
        return response
