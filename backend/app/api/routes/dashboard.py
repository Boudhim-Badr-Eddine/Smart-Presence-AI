"""Unified admin dashboard endpoints."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.core.audit_middleware import AuditService
from app.core.logging_config import logger
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.session import Session as ClassSession
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/admin/dashboard", tags=["admin", "dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get unified dashboard statistics.
    
    Returns:
        - Total students count
        - Active sessions count
        - Today's attendance rate
        - Active alerts count
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Total students
    total_students = db.query(func.count(Student.id)).scalar() or 0
    
    # Active sessions (today)
    today = datetime.utcnow().date()
    active_sessions = (
        db.query(func.count(ClassSession.id))
        .filter(func.date(ClassSession.date) == today)
        .scalar()
    ) or 0
    
    # Today's attendance rate
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    total_attendance_today = (
        db.query(func.count(Attendance.id))
        .filter(Attendance.marked_at >= today_start, Attendance.marked_at <= today_end)
        .scalar()
    ) or 0
    
    present_today = (
        db.query(func.count(Attendance.id))
        .filter(
            Attendance.marked_at >= today_start,
            Attendance.marked_at <= today_end,
            Attendance.status == "present",
        )
        .scalar()
    ) or 0
    
    attendance_rate = (present_today / total_attendance_today * 100) if total_attendance_today > 0 else 0
    
    # Active alerts (absences with status pending or escalated)
    # Note: This assumes you have an absence alerts table or similar
    # For now, we'll count recent absences as "alerts"
    active_alerts = (
        db.query(func.count(Attendance.id))
        .filter(
            Attendance.status == "absent",
            Attendance.marked_at >= today_start,
        )
        .scalar()
    ) or 0
    
    logger.info(f"Dashboard stats retrieved by admin {current_user.id}")
    
    return {
        "students": total_students,
        "sessions": active_sessions,
        "attendance_rate": round(attendance_rate, 1),
        "alerts": active_alerts,
    }


@router.get("/alerts")
async def get_active_alerts(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get active alerts (recent absences and anomalies).
    
    Returns list of alerts with:
        - Alert type
        - Student info
        - Session info
        - Timestamp
        - Severity
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get recent absences as alerts
    today_start = datetime.utcnow() - timedelta(days=1)
    
    recent_absences = (
        db.query(Attendance)
        .filter(
            Attendance.status == "absent",
            Attendance.marked_at >= today_start,
        )
        .order_by(desc(Attendance.marked_at))
        .limit(limit)
        .all()
    )
    
    alerts = []
    for absence in recent_absences:
        student = db.query(Student).filter(Student.id == absence.student_id).first()
        session = db.query(ClassSession).filter(ClassSession.id == absence.session_id).first()
        
        alerts.append({
            "id": absence.id,
            "type": "absence",
            "student": {
                "id": student.id if student else None,
                "email": student.email if student else "Unknown",
            },
            "session": {
                "id": session.id if session else None,
                "title": getattr(session, "title", f"Session {session.id}") if session else "Unknown",
            },
            "timestamp": absence.marked_at.isoformat() if absence.marked_at else None,
            "severity": "medium",
        })
    
    logger.info(f"Retrieved {len(alerts)} active alerts for admin {current_user.id}")
    
    return alerts


@router.get("/activities/recent")
async def get_recent_activities(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get recent activities from audit logs.
    
    Returns list of activities with:
        - Action type
        - User info
        - Resource details
        - Timestamp
        - Status
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get recent audit logs
    audit_service = AuditService(db)
    recent_logs = (
        db.query(audit_service.AuditLog)
        .order_by(desc(audit_service.AuditLog.timestamp))
        .limit(limit)
        .all()
    )
    
    activities = []
    for log in recent_logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        
        activities.append({
            "id": log.id,
            "action": log.action,
            "user": {
                "id": user.id if user else None,
                "email": user.email if user else "System",
            },
            "resource": {
                "type": log.resource_type,
                "id": log.resource_id,
            },
            "timestamp": log.timestamp.isoformat(),
            "success": log.success,
        })
    
    logger.info(f"Retrieved {len(activities)} recent activities for admin {current_user.id}")
    
    return activities


@router.get("/analytics/attendance-trend")
async def get_attendance_trend(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get attendance trend for last N days.
    
    Returns daily attendance rates.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    trend_data = []
    
    for i in range(days):
        day = datetime.utcnow().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        total = (
            db.query(func.count(Attendance.id))
            .filter(Attendance.marked_at >= day_start, Attendance.marked_at <= day_end)
            .scalar()
        ) or 0
        
        present = (
            db.query(func.count(Attendance.id))
            .filter(
                Attendance.marked_at >= day_start,
                Attendance.marked_at <= day_end,
                Attendance.status == "present",
            )
            .scalar()
        ) or 0
        
        rate = (present / total * 100) if total > 0 else 0
        
        trend_data.append({
            "date": day.isoformat(),
            "rate": round(rate, 1),
            "total": total,
            "present": present,
        })
    
    # Reverse to show oldest to newest
    trend_data.reverse()
    
    logger.info(f"Retrieved {days}-day attendance trend for admin {current_user.id}")
    
    return trend_data


@router.get("/analytics/top-absentees")
async def get_top_absentees(
    limit: int = 10,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get students with highest absence rates.
    
    Returns list sorted by absence count.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    since = datetime.utcnow() - timedelta(days=days)
    
    # Query to get absence counts per student
    absence_counts = (
        db.query(
            Attendance.student_id,
            func.count(Attendance.id).label("absence_count"),
        )
        .filter(
            Attendance.status == "absent",
            Attendance.marked_at >= since,
        )
        .group_by(Attendance.student_id)
        .order_by(desc("absence_count"))
        .limit(limit)
        .all()
    )
    
    top_absentees = []
    for student_id, count in absence_counts:
        student = db.query(Student).filter(Student.id == student_id).first()
        
        # Calculate total attendance for this student
        total = (
            db.query(func.count(Attendance.id))
            .filter(
                Attendance.student_id == student_id,
                Attendance.marked_at >= since,
            )
            .scalar()
        ) or 0
        
        rate = (count / total * 100) if total > 0 else 0
        
        top_absentees.append({
            "student": {
                "id": student.id if student else None,
                "email": student.email if student else "Unknown",
            },
            "absence_count": count,
            "total_sessions": total,
            "absence_rate": round(rate, 1),
        })
    
    logger.info(f"Retrieved top {limit} absentees for admin {current_user.id}")
    
    return top_absentees
