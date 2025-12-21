"""Integration endpoints for calendar, LMS, and HR systems."""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.session import Session as ClassSession
from app.models.user import User
from app.services.integrations import (
    CalendarIntegrationService,
    HRIntegrationService,
    LMSIntegrationService,
)

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ==================== Calendar Integrations ====================

@router.get("/calendar/ical")
async def export_sessions_ical(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export sessions to iCalendar format.
    
    Query params:
    - start_date: ISO format (optional)
    - end_date: ISO format (optional)
    """
    query = db.query(ClassSession)
    
    # Filter by date range if provided
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.filter(ClassSession.date >= start)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.filter(ClassSession.date <= end)
    
    # For students, filter by their enrolled sessions
    # For trainers/admins, show all sessions
    if current_user.role == "student":
        # TODO: Filter by student enrollment
        pass
    
    sessions = query.all()
    
    service = CalendarIntegrationService(db)
    ical_data = service.export_to_ical(sessions)
    
    return Response(
        content=ical_data,
        media_type="text/calendar",
        headers={
            "Content-Disposition": "attachment; filename=sessions.ics"
        },
    )


@router.post("/calendar/google/sync")
async def sync_to_google_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync sessions to Google Calendar."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google Calendar sync not implemented yet",
    )


@router.post("/calendar/outlook/sync")
async def sync_to_outlook(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync sessions to Outlook/Microsoft 365."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Outlook/Microsoft 365 sync not implemented yet",
    )


# ==================== LMS Integrations ====================

@router.get("/lms/moodle/export")
async def export_to_moodle(
    session_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export attendance to Moodle CSV format.
    
    Requires trainer or admin role.
    """
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = db.query(Attendance)
    
    if session_id:
        query = query.filter(Attendance.session_id == session_id)
    
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.filter(Attendance.marked_at >= start)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.filter(Attendance.marked_at <= end)
    
    records = query.all()
    
    service = LMSIntegrationService(db)
    csv_content = service.export_to_moodle_csv(records)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=attendance_moodle.csv"
        },
    )


@router.post("/lms/canvas/sync")
async def sync_to_canvas(
    course_id: str,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync attendance to Canvas LMS."""
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Canvas LMS sync not implemented yet",
    )


@router.post("/lms/blackboard/sync")
async def sync_to_blackboard(
    course_id: str,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync attendance to Blackboard."""
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Blackboard sync not implemented yet",
    )


# ==================== HR Integrations ====================

@router.get("/hr/attendance-summary/{student_id}")
async def get_hr_attendance_summary(
    student_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get attendance summary for HR export.
    
    Requires admin role or same user.
    """
    if current_user.role != "admin" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Default to last 30 days if dates not provided
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.fromisoformat(start_date)
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.fromisoformat(end_date)
    
    service = HRIntegrationService(db)
    summary = service.export_attendance_summary(student_id, start, end)
    
    return summary


@router.post("/hr/workday/sync")
async def sync_to_workday(
    employee_id: str,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync attendance to Workday."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Workday sync not implemented yet",
    )


@router.post("/hr/bamboohr/sync")
async def sync_to_bamboohr(
    employee_id: str,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync attendance to BambooHR."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="BambooHR sync not implemented yet",
    )
