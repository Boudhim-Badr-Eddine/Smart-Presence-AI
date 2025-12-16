from datetime import datetime, timedelta
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.session import Session as SessionModel
from app.models.student import Student
from app.models.user import User
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["trainer"])


@router.get("/stats")
def get_trainer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get statistics for the current trainer."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can access this endpoint")

    # Find trainer's sessions
    total_sessions = (
        db.query(SessionModel).filter(SessionModel.trainer_id == current_user.id).count()
    )

    # Count this week's sessions
    start_of_week = datetime.now() - timedelta(days=datetime.now().weekday())
    this_week = (
        db.query(SessionModel)
        .filter(
            SessionModel.trainer_id == current_user.id,
            SessionModel.session_date >= start_of_week.date(),
        )
        .count()
    )

    # Approximate total students (unique from attendance records)
    total_students = (
        db.query(func.count(func.distinct(AttendanceRecord.student_id)))
        .join(SessionModel, SessionModel.id == AttendanceRecord.session_id)
        .filter(SessionModel.trainer_id == current_user.id)
        .scalar()
        or 0
    )

    # Calculate average attendance rate
    attendance_records = (
        db.query(AttendanceRecord)
        .join(SessionModel, SessionModel.id == AttendanceRecord.session_id)
        .filter(SessionModel.trainer_id == current_user.id)
        .all()
    )
    total_records = len(attendance_records)
    present_count = sum(1 for r in attendance_records if r.status == "present")
    attendance_rate = (present_count / total_records * 100) if total_records > 0 else 0

    return {
        "total_sessions": total_sessions,
        "this_week_sessions": this_week,
        "total_students": total_students,
        "attendance_rate": round(attendance_rate, 2),
    }


@router.get("/upcoming-sessions")
def get_upcoming_sessions(
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming sessions for the trainer."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can access this endpoint")

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.trainer_id == current_user.id,
            SessionModel.session_date >= datetime.now().date(),
        )
        .order_by(SessionModel.session_date, SessionModel.start_time)
        .limit(limit)
        .all()
    )

    result = []
    for s in sessions:
        # Count students for this session's classroom (approximation)
        student_count = (
            db.query(Student).filter(Student.class_name == getattr(s, "class_name", "")).count()
        )
        result.append(
            {
                "id": s.id,
                "title": s.topic or "Session",
                "date": s.session_date.isoformat() if s.session_date else "",
                "time": str(s.start_time) if s.start_time else "",
                "class_name": getattr(s, "class_name", ""),
                "student_count": student_count,
            }
        )
    return result


@router.get("/sessions")
def get_trainer_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all sessions for the trainer with pagination."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can access this endpoint")

    offset = (page - 1) * limit
    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.trainer_id == current_user.id)
        .order_by(SessionModel.session_date.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": s.id,
            "title": s.topic or "Session",
            "date": s.session_date.isoformat() if s.session_date else "",
            "start_time": str(s.start_time) if s.start_time else "",
            "end_time": str(s.end_time) if s.end_time else "",
            "status": s.status,
        }
        for s in sessions
    ]


@router.get("/attendance")
def get_trainer_attendance(
    session_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance records for trainer's sessions."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can access this endpoint")

    query = (
        db.query(AttendanceRecord)
        .join(SessionModel, SessionModel.id == AttendanceRecord.session_id)
        .filter(SessionModel.trainer_id == current_user.id)
    )

    if session_id:
        query = query.filter(AttendanceRecord.session_id == session_id)

    records = query.order_by(AttendanceRecord.marked_at.desc()).limit(100).all()
    return [
        {
            "id": r.id,
            "session_id": r.session_id,
            "student_id": r.student_id,
            "status": r.status,
            "marked_at": r.marked_at.isoformat() if r.marked_at else None,
            "justification": r.justification,
        }
        for r in records
    ]


@router.patch("/attendance/{attendance_id}/justification")
def update_attendance_justification(
    attendance_id: int,
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update justification for an attendance record."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can update justifications")

    record = (
        db.query(AttendanceRecord)
        .join(SessionModel, SessionModel.id == AttendanceRecord.session_id)
        .filter(AttendanceRecord.id == attendance_id, SessionModel.trainer_id == current_user.id)
        .first()
    )

    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    record.justification = payload.get("justification", record.justification)
    db.commit()
    return {"status": "success", "id": record.id}


@router.get("/session-notes")
def get_session_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get session notes for trainer's sessions."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can access session notes")

    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.trainer_id == current_user.id, SessionModel.notes.isnot(None))
        .order_by(SessionModel.session_date.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": s.id,
            "session_id": s.id,
            "title": s.topic or "Session",
            "notes": s.notes,
            "date": s.session_date.isoformat() if s.session_date else "",
        }
        for s in sessions
    ]


@router.post("/session-notes")
def create_session_note(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add or update notes for a session."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can create session notes")

    session_id = payload.get("session_id")
    notes = payload.get("notes", "")

    session = (
        db.query(SessionModel)
        .filter(SessionModel.id == session_id, SessionModel.trainer_id == current_user.id)
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.notes = notes
    db.commit()
    return {"status": "success", "session_id": session.id}


@router.get("/notifications")
def get_trainer_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for the trainer."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can access notifications")

    from app.models.notification import Notification

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]


@router.patch("/notifications/{notification_id}")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can update notifications")

    from app.models.notification import Notification

    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.read = True
    db.commit()
    return {"status": "success"}


@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    if current_user.role != "trainer":
        raise HTTPException(status_code=403, detail="Only trainers can delete notifications")

    from app.models.notification import Notification

    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()
    return {"status": "success"}
