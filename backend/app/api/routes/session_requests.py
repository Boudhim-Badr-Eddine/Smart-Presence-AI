"""API routes for session requests (trainers requesting admins to create sessions)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.event_bus import event_bus
from app.models.session_request import SessionRequest
from app.models.user import User
from app.schemas.session_request import (
    SessionRequestCreate,
    SessionRequestListOut,
    SessionRequestOut,
    SessionRequestUpdate,
)
from app.services.notification import NotificationService
from app.schemas.notification import NotificationCreate
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["session-requests"])


@router.post("", response_model=SessionRequestOut, status_code=status.HTTP_201_CREATED)
async def create_session_request(
    payload: SessionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new session request (trainers only).
    Trainers use this to request admins to create sessions for them.
    """
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create session requests",
        )

    # Create the session request
    session_request = SessionRequest(
        trainer_id=current_user.id,
        trainer_name=current_user.username or current_user.email,
        trainer_email=current_user.email,
        title=payload.title,
        class_name=payload.class_name,
        session_date=payload.session_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        session_type=payload.session_type,
        notes=payload.notes,
        status="pending",
    )
    db.add(session_request)
    db.commit()
    db.refresh(session_request)

    # Notify all admins in real-time
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        notification = NotificationCreate(
            user_id=admin.id,
            user_type="admin",
            title="Nouvelle demande de session",
            message=f"{current_user.username} demande une session: {payload.title} ({payload.class_name}) le {payload.session_date}",
            notification_type="session_request",
            priority="high",
            delivery_method="in_app",
            related_entity_type="session_request",
            related_entity_id=session_request.id,
            action_url=f"/admin/session-requests/{session_request.id}",
            action_label="Voir la demande",
        )
        NotificationService.create_notification(db, notification)

    # Publish real-time event for WebSocket broadcast
    await event_bus.publish(
        "session_request.created",
        {
            "request_id": session_request.id,
            "trainer_id": current_user.id,
            "trainer_name": current_user.username,
            "title": payload.title,
            "class_name": payload.class_name,
            "date": payload.session_date,
        },
    )

    return session_request


@router.get("/my-requests", response_model=SessionRequestListOut)
def get_my_session_requests(
    limit: int = Query(20, ge=1, le=100),
    status_filter: str = Query("all"),  # all, pending, approved, rejected
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get session requests created by the current trainer."""
    if current_user.role != "trainer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can view their requests",
        )

    query = db.query(SessionRequest).filter(SessionRequest.trainer_id == current_user.id)

    if status_filter != "all":
        query = query.filter(SessionRequest.status == status_filter)

    total = query.count()
    requests = query.order_by(SessionRequest.created_at.desc()).limit(limit).all()
    
    unread_count = (
        db.query(SessionRequest)
        .filter(SessionRequest.trainer_id == current_user.id, SessionRequest.status == "pending")
        .count()
    )

    return SessionRequestListOut(requests=requests, total=total, unread_count=unread_count)


@router.get("/all", response_model=SessionRequestListOut)
def get_all_session_requests(
    limit: int = Query(50, ge=1, le=200),
    status_filter: str = Query("all"),  # all, pending, approved, rejected
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all session requests (admins only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view all requests",
        )

    query = db.query(SessionRequest)

    if status_filter != "all":
        query = query.filter(SessionRequest.status == status_filter)

    total = query.count()
    requests = query.order_by(SessionRequest.created_at.desc()).limit(limit).all()
    
    unread_count = db.query(SessionRequest).filter(SessionRequest.status == "pending").count()

    return SessionRequestListOut(requests=requests, total=total, unread_count=unread_count)


@router.get("/{request_id}", response_model=SessionRequestOut)
def get_session_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific session request."""
    request = db.query(SessionRequest).filter(SessionRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Session request not found")

    # Trainers can only view their own requests, admins can view all
    if current_user.role == "trainer" and request.trainer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other trainer's requests",
        )
    
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return request


@router.put("/{request_id}/status", response_model=SessionRequestOut)
async def update_session_request_status(
    request_id: int,
    payload: SessionRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update session request status (admins only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can approve/reject session requests",
        )

    request = db.query(SessionRequest).filter(SessionRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Session request not found")

    if payload.status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be 'approved' or 'rejected'",
        )

    # Update request
    request.status = payload.status
    request.admin_response = payload.admin_response
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.now()
    db.commit()
    db.refresh(request)

    # Notify the trainer
    notification = NotificationCreate(
        user_id=request.trainer_id,
        user_type="trainer",
        title=f"Demande de session {payload.status}",
        message=f"Votre demande de session '{request.title}' a été {payload.status}. {payload.admin_response or ''}",
        notification_type="session_request_response",
        priority="high",
        delivery_method="in_app",
        related_entity_type="session_request",
        related_entity_id=request.id,
    )
    NotificationService.create_notification(db, notification)

    # Publish real-time event
    await event_bus.publish(
        "session_request.updated",
        {
            "request_id": request.id,
            "trainer_id": request.trainer_id,
            "status": payload.status,
            "reviewed_by": current_user.id,
        },
    )

    return request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a session request (trainer can delete their own, admin can delete any)."""
    request = db.query(SessionRequest).filter(SessionRequest.id == request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Session request not found")

    # Trainers can only delete their own pending requests
    if current_user.role == "trainer":
        if request.trainer_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete other trainer's requests",
            )
        if request.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete non-pending requests",
            )

    db.delete(request)
    db.commit()
    return None
