from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.event_bus import event_bus
from app.models.attendance import AttendanceRecord
from app.models.user import User
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceOut,
    AttendanceSummary,
    AttendanceUpdate,
)
from app.services.attendance import AttendanceService
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["attendance"])


@router.post("", response_model=AttendanceOut)
async def mark_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark attendance for a student."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can mark attendance"
        )

    record = AttendanceService.mark_attendance(db, payload.session_id, payload.student_id, payload)
    if not record:
        raise HTTPException(status_code=400, detail="Failed to mark attendance")

    await event_bus.publish(
        "attendance.marked",
        {
            "attendance_id": record.id,
            "session_id": record.session_id,
            "student_id": record.student_id,
            "status": record.status,
            "marked_at": record.marked_at.isoformat() if record.marked_at else None,
        },
    )
    
    # ⭐ TRIGGER REAL-TIME UPDATES FOR STUDENT STATS
    await event_bus.publish(
        "student_stats_updated",
        {
            "student_id": record.student_id,
            "session_id": record.session_id,
        },
    )
    await event_bus.publish(
        "student_attendance_updated",
        {
            "student_id": record.student_id,
            "attendance_id": record.id,
        },
    )

    return record


@router.get("/student/{student_id}/summary", response_model=AttendanceSummary)
def get_student_attendance_summary(
    student_id: int,
    days: int = 30,
):
    """Get attendance summary for a student."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        summary = AttendanceService.get_student_attendance_summary(db, student_id, days)
        if not summary:
            raise HTTPException(status_code=404, detail="No attendance records found")
        return summary
    finally:
        db.close()


@router.get("/session/{session_id}/all")
def get_session_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all attendance records for a session."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/trainer can view session attendance",
        )

    records = AttendanceService.get_session_attendance(db, session_id)
    return {"session_id": session_id, "records": records, "count": len(records)}


@router.get("/class/{class_name}/stats")
def get_class_attendance_stats(
    class_name: str,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance statistics for a class."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can view class stats"
        )

    stats = AttendanceService.get_class_attendance_stats(db, class_name, days)
    if not stats:
        raise HTTPException(status_code=404, detail="No class or attendance data found")
    return stats


@router.post("/{attendance_id}/justify")
def justify_absence(
    attendance_id: int,
    justification: str,
    documents_path: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add justification to an absence."""
    record = AttendanceService.justify_absence(db, attendance_id, justification, documents_path)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {"status": "success", "message": "Justification added", "record_id": record.id}


@router.put("/{attendance_id:int}", response_model=AttendanceOut)
async def update_attendance(
    attendance_id: int,
    payload: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update attendance record (admin/trainer only)."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can update attendance"
        )

    record = AttendanceService.update_attendance(db, attendance_id, payload)
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    await event_bus.publish(
        "attendance.updated",
        {
            "attendance_id": record.id,
            "session_id": record.session_id,
            "student_id": record.student_id,
            "status": record.status,
            "marked_at": record.marked_at.isoformat() if record.marked_at else None,
        },
    )
    
    # ⭐ TRIGGER REAL-TIME UPDATES FOR STUDENT STATS
    await event_bus.publish(
        "student_stats_updated",
        {
            "student_id": record.student_id,
            "session_id": record.session_id,
        },
    )
    await event_bus.publish(
        "student_attendance_updated",
        {
            "student_id": record.student_id,
            "attendance_id": record.id,
        },
    )

    return record


@router.get("/{attendance_id:int}", response_model=AttendanceOut)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance record."""
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return record


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    session_id: int | None = None,
    student_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List attendance records with optional filters."""
    q = db.query(AttendanceRecord)
    if session_id:
        q = q.filter(AttendanceRecord.session_id == session_id)
    if student_id:
        q = q.filter(AttendanceRecord.student_id == student_id)
    return q.all()
