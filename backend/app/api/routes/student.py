from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.session import Session as SessionModel
from app.models.student import Student
from app.models.user import User
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["student"])


@router.get("/stats")
def get_student_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get statistics for the current student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get attendance records
    total_sessions = (
        db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).count()
    )
    present_count = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.status == "present")
        .count()
    )
    absent_count = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.status == "absent")
        .count()
    )

    return {
        "attendance_rate": student.attendance_rate or 0,
        "total_sessions": total_sessions,
        "present_count": present_count,
        "absent_count": absent_count,
        "alert_level": student.alert_level or "none",
    }


@router.get("/attendance")
def get_student_attendance(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance records for the current student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id)
        .order_by(AttendanceRecord.marked_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": r.id,
            "session_id": r.session_id,
            "status": r.status,
            "marked_at": r.marked_at.isoformat() if r.marked_at else None,
            "late_minutes": r.late_minutes or 0,
            "justification": r.justification,
        }
        for r in records
    ]


@router.get("/upcoming-sessions")
def get_upcoming_sessions(
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming sessions for the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get sessions matching student's class
    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.session_date >= datetime.now().date(),
        )
        .order_by(SessionModel.session_date, SessionModel.start_time)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": s.id,
            "title": s.topic or "Session",
            "date": s.session_date.isoformat() if s.session_date else "",
            "time": str(s.start_time) if s.start_time else "",
            "room": getattr(s, "classroom_id", ""),
        }
        for s in sessions
    ]


@router.get("/schedule")
def get_student_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get weekly schedule for the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []

    # Get this week's sessions
    start_of_week = datetime.now() - timedelta(days=datetime.now().weekday())
    end_of_week = start_of_week + timedelta(days=7)

    sessions = (
        db.query(SessionModel)
        .filter(
            SessionModel.session_date >= start_of_week.date(),
            SessionModel.session_date < end_of_week.date(),
        )
        .order_by(SessionModel.session_date, SessionModel.start_time)
        .all()
    )

    return [
        {
            "id": s.id,
            "title": s.topic or "Session",
            "date": s.session_date.isoformat() if s.session_date else "",
            "start_time": str(s.start_time) if s.start_time else "",
            "end_time": str(s.end_time) if s.end_time else "",
            "day": s.session_date.strftime("%A") if s.session_date else "",
        }
        for s in sessions
    ]


@router.get("/justifications")
def get_student_justifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get justifications submitted by the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []

    records = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.student_id == student.id, AttendanceRecord.justification.isnot(None)
        )
        .order_by(AttendanceRecord.marked_at.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "session_id": r.session_id,
            "date": r.marked_at.isoformat() if r.marked_at else None,
            "justification": r.justification,
            "status": r.status,
        }
        for r in records
    ]


@router.post("/justifications")
def submit_justification(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a justification for an absence."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit justifications")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    attendance_id = payload.get("absence_id") or payload.get("attendance_id")
    justification = payload.get("justification", "")

    if not attendance_id:
        raise HTTPException(status_code=400, detail="Missing attendance_id or absence_id")

    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.id == attendance_id, AttendanceRecord.student_id == student.id)
        .first()
    )

    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    record.justification = justification
    db.commit()
    return {"status": "success", "id": record.id}


@router.get("/absences")
def get_student_absences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all absences for the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access absences")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []

    absences = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.status == "absent")
        .order_by(AttendanceRecord.marked_at.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "session_id": r.session_id,
            "date": r.marked_at.isoformat() if r.marked_at else None,
            "justification": r.justification,
            "hasJustification": bool(r.justification),
        }
        for r in absences
    ]


@router.get("/feedback")
def get_student_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get feedback submitted by the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access feedback")

    # Placeholder - implement feedback model if needed
    return []


@router.post("/feedback")
def submit_feedback(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit feedback."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit feedback")

    # Placeholder - implement feedback model
    return {"status": "success", "message": "Feedback submitted"}


@router.get("/feedbacks")
def get_feedbacks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all feedbacks from the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access feedbacks")

    return []


@router.post("/feedbacks")
def create_feedback(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new feedback."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can create feedbacks")

    return {"status": "success", "id": 1}


@router.get("/calendar")
def get_student_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get calendar events for the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access calendar")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []

    # Get all upcoming sessions as calendar events
    sessions = (
        db.query(SessionModel)
        .filter(SessionModel.session_date >= datetime.now().date())
        .order_by(SessionModel.session_date)
        .limit(100)
        .all()
    )

    return [
        {
            "id": s.id,
            "title": s.topic or "Session",
            "date": s.session_date.isoformat() if s.session_date else "",
            "start_time": str(s.start_time) if s.start_time else "",
            "end_time": str(s.end_time) if s.end_time else "",
            "type": s.session_type or "theory",
        }
        for s in sessions
    ]


@router.get("/profile")
def get_student_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get student profile information."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access profile")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return {
        "id": student.id,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "email": student.email,
        "phone": student.phone,
        "student_code": student.student_code,
        "class_name": student.class_name,
        "attendance_rate": student.attendance_rate,
        "profile_photo_path": student.profile_photo_path,
    }


@router.put("/profile")
def update_student_profile(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update student profile."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update profile")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if "phone" in payload:
        student.phone = payload["phone"]
    if "email" in payload:
        student.email = payload["email"]

    db.commit()
    return {"status": "success"}


@router.post("/profile/password")
def change_password(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change student password."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can change password")

    from app.services.auth import get_password_hash

    new_password = payload.get("new_password")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password required")

    current_user.password_hash = get_password_hash(new_password)
    db.commit()
    return {"status": "success"}


@router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload student avatar."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload avatar")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Save file
    storage_dir = Path("/app/storage/avatars")
    storage_dir.mkdir(parents=True, exist_ok=True)
    file_path = storage_dir / f"{student.id}_{file.filename}"

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    student.profile_photo_path = str(file_path)
    db.commit()
    return {"status": "success", "path": str(file_path)}


@router.get("/notifications")
def get_student_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access notifications")

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


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update notifications")

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
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can delete notifications")

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


@router.put("/notification-preferences")
def update_notification_preferences(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update notification preferences for the student."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update preferences")

    # Placeholder - implement preferences model if needed
    return {"status": "success"}
