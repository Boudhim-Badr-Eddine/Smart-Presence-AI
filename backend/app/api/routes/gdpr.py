"""GDPR compliance routes for data export and deletion."""
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services import auth as auth_service
from app.services.audit_logger import AuditService
from app.services.gdpr import GDPRService

router = APIRouter(prefix="/gdpr", tags=["gdpr"])


@router.get("/export/my-data")
async def export_my_data(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Export all personal data for current user (GDPR compliance)."""
    gdpr_service = GDPRService(db)
    audit_service = AuditService(db)
    
    try:
        export_data = gdpr_service.export_user_data(current_user.id)
        
        # Log the data export request
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="gdpr_export",
            action_description=f"User {current_user.email} requested data export",
            resource_type="user_data",
            resource_id=current_user.id,
            success="success",
        )
        
        return {
            "message": "Data export completed",
            "data": export_data,
            "exported_at": export_data.get("exported_at"),
        }
    except Exception as e:
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="gdpr_export",
            action_description=f"Failed data export for {current_user.email}",
            resource_type="user_data",
            resource_id=current_user.id,
            success="failure",
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=f"Data export failed: {str(e)}")


@router.delete("/delete/my-account")
async def delete_my_account(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Delete or anonymize user account (GDPR right to be forgotten)."""
    gdpr_service = GDPRService(db)
    audit_service = AuditService(db)
    
    try:
        # Log before deletion
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="gdpr_delete",
            action_description=f"User {current_user.email} requested account deletion",
            resource_type="user",
            resource_id=current_user.id,
            success="success",
        )
        
        # Anonymize user data
        result = gdpr_service.delete_user_data(current_user.id)
        
        return {
            "message": "Account deletion/anonymization completed",
            "details": result,
        }
    except Exception as e:
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="gdpr_delete",
            action_description=f"Failed account deletion for {current_user.email}",
            resource_type="user",
            resource_id=current_user.id,
            success="failure",
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=f"Account deletion failed: {str(e)}")


@router.get("/admin/export/{user_id}")
async def admin_export_user_data(
    user_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Admin endpoint to export user data."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    gdpr_service = GDPRService(db)
    audit_service = AuditService(db)
    
    try:
        export_data = gdpr_service.export_user_data(user_id)
        
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="admin_gdpr_export",
            action_description=f"Admin {current_user.email} exported data for user {user_id}",
            resource_type="user_data",
            resource_id=user_id,
            success="success",
        )
        
        return export_data
    except Exception as e:
        await audit_service.log_action(
            user_id=current_user.id,
            action_type="admin_gdpr_export",
            action_description=f"Admin failed to export data for user {user_id}",
            resource_type="user_data",
            resource_id=user_id,
            success="failure",
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))
