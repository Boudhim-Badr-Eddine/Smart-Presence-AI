from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.student import Student
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate


class AttendanceService:
    """Service layer for attendance marking and analytics."""

    @staticmethod
    def mark_attendance(
        db: Session, session_id: int, student_id: int, payload: AttendanceCreate
    ) -> AttendanceRecord:
        """Mark attendance for a student in a session.
        
        Args:
            db: Database session
            session_id: Session ID
            student_id: Student ID
            payload: Attendance creation payload
            
        Returns:
            AttendanceRecord: Created or existing attendance record
            
        Note:
            If attendance already exists for this session/student, returns existing record.
        """
        # Check if already marked
        existing = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.session_id == session_id,
                AttendanceRecord.student_id == student_id,
            )
            .first()
        )
        if existing:
            return existing

        record = AttendanceRecord(
            session_id=session_id,
            student_id=student_id,
            status=payload.status,
            marked_via=payload.marked_via or "manual",
            facial_confidence=payload.facial_confidence,
            verification_photo_path=payload.verification_photo_path,
            actual_arrival_time=payload.actual_arrival_time,
            late_minutes=payload.late_minutes or 0,
            percentage=payload.percentage or Decimal("0.00"),
            justification=payload.justification,
            device_id=payload.device_id,
            ip_address=payload.ip_address,
            location_data=payload.location_data,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def update_attendance(
        db: Session, attendance_id: int, payload: AttendanceUpdate
    ) -> AttendanceRecord:
        """Update existing attendance record (trainer/admin only).
        
        Args:
            db: Database session
            attendance_id: Attendance record ID
            payload: Update payload with partial fields
            
        Returns:
            AttendanceRecord | None: Updated record or None if not found
        """
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
        if not record:
            return None

        for field, value in payload.dict(exclude_unset=True).items():
            setattr(record, field, value)

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_student_attendance_summary(db: Session, student_id: int, days: int = 30):
        """Get attendance summary for a student.
        
        Args:
            db: Database session
            student_id: Student ID
            days: Number of days to look back (default: 30)
            
        Returns:
            dict: Summary with total_sessions, present, absent, late, excused counts,
                  attendance_rate (%), and period_days
        """
        cutoff_date = datetime.now() - timedelta(days=days)

        records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.marked_at >= cutoff_date,
            )
            .all()
        )

        total = len(records)
        present = sum(1 for r in records if r.status == "present")
        absent = sum(1 for r in records if r.status == "absent")
        late = sum(1 for r in records if r.status == "late")
        excused = sum(1 for r in records if r.status == "excused")

        attendance_rate = (present / total * 100) if total > 0 else 0

        return {
            "student_id": student_id,
            "total_sessions": total,
            "present": present,
            "absent": absent,
            "late": late,
            "excused": excused,
            "attendance_rate": round(attendance_rate, 2),
            "period_days": days,
        }

    @staticmethod
    def get_session_attendance(db: Session, session_id: int):
        """Get all attendance records for a session."""
        records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
        return records

    @staticmethod
    def get_class_attendance_stats(db: Session, class_name: str, days: int = 30):
        """Get attendance statistics for a class."""
        cutoff_date = datetime.now() - timedelta(days=days)

        records = (
            db.query(AttendanceRecord)
            .join(Student, AttendanceRecord.student_id == Student.id)
            .filter(
                Student.class_name == class_name,
                AttendanceRecord.marked_at >= cutoff_date,
            )
            .all()
        )

        if not records:
            return None

        total = len(records)
        present = sum(1 for r in records if r.status == "present")
        avg_rate = (present / total * 100) if total > 0 else 0

        return {
            "class": class_name,
            "total_records": total,
            "present_count": present,
            "average_attendance_rate": round(avg_rate, 2),
            "period_days": days,
        }

    @staticmethod
    def justify_absence(
        db: Session, attendance_id: int, justification: str, documents_path: str = None
    ):
        """Add justification to an attendance record."""
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == attendance_id).first()
        if not record:
            return None

        record.justification = justification
        if documents_path:
            record.verification_photo_path = documents_path

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_attendance_by_date_range(
        db: Session, student_id: int, start_date: datetime, end_date: datetime
    ):
        """Get attendance records within a date range."""
        records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.marked_at >= start_date,
                AttendanceRecord.marked_at <= end_date,
            )
            .order_by(AttendanceRecord.marked_at.desc())
            .all()
        )
        return records
