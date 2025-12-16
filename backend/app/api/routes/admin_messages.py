from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.admin_message import AdminMessageCreate, AdminMessageOut
from app.services.admin_message import AdminMessageService
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["admin-messages"])


@router.post("/messages", response_model=AdminMessageOut, status_code=status.HTTP_201_CREATED)
async def create_admin_message(
    title: str = Form(...),
    message_type: str = Form(..., pattern=r"^(service_note|official_message)$"),
    body: Optional[str] = Form(None),
    trainer_ids: Optional[str] = Form(None),  # comma-separated
    class_names: Optional[str] = Form(None),  # comma-separated
    files: List[UploadFile] | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an admin message with optional attachments and targets.

    Accepts multipart/form-data with:
    - title, message_type (service_note|official_message), body (optional)
    - trainer_ids: comma-separated list of trainer IDs
    - class_names: comma-separated list of class names
    - files: one or many UploadFile
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can send messages")

    try:
        trainer_id_list = (
            [int(x) for x in (trainer_ids or "").split(",") if x.strip()]
            if trainer_ids is not None
            else []
        )
        class_name_list = (
            [x.strip() for x in (class_names or "").split(",") if x.strip()]
            if class_names is not None
            else []
        )

        msg = AdminMessageService.create_message(
            db=db,
            admin_user_id=current_user.id,
            title=title,
            message_type=message_type,
            body=body,
            trainer_ids=trainer_id_list,
            class_names=class_name_list,
            files=files or [],
        )

        attachments = []
        for f in files or []:
            attachments.append(f.filename or "attachment")

        return AdminMessageOut(
            id=msg.id,
            title=msg.title,
            message_type=msg.message_type,
            body=msg.body,
            trainer_ids=trainer_id_list,
            class_names=class_name_list,
            attachments=attachments,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes")
def list_distinct_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return distinct class names from sessions for building targeting pickers."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list classes")

    from app.models.session import Session as CourseSession

    rows = db.query(CourseSession.class_name).distinct().all()
    classes = sorted({r[0] for r in rows if r and r[0]})
    return {"classes": classes}
