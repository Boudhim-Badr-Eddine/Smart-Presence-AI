from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.utils.deps import get_db, get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.session import Session as SessionModel
from app.models.attendance import AttendanceRecord
from datetime import datetime, timedelta
from app.utils.cache import cached_response, response_cache
from typing import Dict, List

router = APIRouter(tags=["analytics"])


@router.get("/analytics")
def get_analytics(
    range: str = Query("month", pattern="^(week|month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated analytics for admin dashboard."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can view analytics")

    cache_key = f"analytics:{range}"

    def fetch_analytics():
        # Determine cutoff date
        cutoff_map = {
            "week": datetime.now() - timedelta(days=7),
            "month": datetime.now() - timedelta(days=30),
            "quarter": datetime.now() - timedelta(days=90),
            "year": datetime.now() - timedelta(days=365),
        }
        cutoff = cutoff_map.get(range, datetime.now() - timedelta(days=30))

        total_students = db.query(Student).filter(Student.academic_status == "active").count()
        total_sessions = db.query(SessionModel).filter(SessionModel.session_date >= cutoff.date()).count()

        # Average attendance rate
        students = db.query(Student).all()
        avg_attendance = sum(s.attendance_rate for s in students) / max(len(students), 1)

        # Attendance trend (monthly or weekly granularity)
        attendance_trend = _compute_attendance_trend(db, cutoff, range)

        # Class statistics
        class_stats = _compute_class_statistics(db)

        # Top absences
        top_absences = _compute_top_absences(db, limit=10)

        return {
            "total_students": total_students,
            "total_sessions": total_sessions,
            "average_attendance_rate": round(avg_attendance, 2),
            "attendance_trend": attendance_trend,
            "class_statistics": class_stats,
            "top_absences": top_absences,
        }

    return cached_response(cache_key, fetch_analytics, ttl=300)


def _compute_attendance_trend(db: Session, cutoff: datetime, period: str) -> List[Dict]:
    """Compute attendance trend over time; monthly or weekly aggregates."""
    records = (
        db.query(
            func.date_trunc("month", AttendanceRecord.marked_at).label("period"),
            func.avg(AttendanceRecord.percentage).label("avg_rate"),
        )
        .filter(AttendanceRecord.marked_at >= cutoff)
        .group_by("period")
        .order_by("period")
        .all()
    )
    result = []
    for r in records:
        period_str = r.period.strftime("%b %Y") if r.period else "Unknown"
        result.append({"month": period_str, "rate": float(r.avg_rate or 0)})
    return result


def _compute_class_statistics(db: Session) -> List[Dict]:
    """Compute attendance statistics per class."""
    classes = (
        db.query(Student.class_name, func.count(Student.id), func.avg(Student.attendance_rate))
        .group_by(Student.class_name)
        .all()
    )
    result = []
    for class_name, count, avg_rate in classes:
        result.append(
            {
                "class_name": class_name,
                "student_count": count,
                "attendance_rate": round(float(avg_rate or 0), 2),
            }
        )
    return result


def _compute_top_absences(db: Session, limit: int = 10) -> List[Dict]:
    """Return top N students with highest total absence hours."""
    students = (
        db.query(Student)
        .filter(Student.total_absence_hours > 0)
        .order_by(Student.total_absence_hours.desc())
        .limit(limit)
        .all()
    )
    result = []
    for s in students:
        result.append({"student_name": f"{s.first_name} {s.last_name}", "absences": s.total_absence_hours})
    return result
