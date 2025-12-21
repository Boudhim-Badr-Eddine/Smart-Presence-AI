from sqlalchemy import JSON, Boolean, Column, DateTime, Index, Integer, Numeric, String, Time, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_session_student"),
        Index("ix_attendance_session_student", "session_id", "student_id"),
        Index("ix_attendance_status_marked", "status", "marked_at"),
        Index("ix_attendance_marked_at", "marked_at"),
        Index("ix_attendance_student", "student_id"),
        Index("ix_attendance_session", "session_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    student_id = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    marked_via = Column(String(20), default="manual")
    facial_confidence = Column(Numeric(5, 4))
    verification_photo_path = Column(String(255))
    marked_at = Column(DateTime, server_default=func.now())
    actual_arrival_time = Column(Time)
    late_minutes = Column(Integer, default=0)
    percentage = Column(Numeric(5, 2), default=0.00)
    justification = Column(String)
    device_id = Column(String(100))
    ip_address = Column(String(45))
    location_data = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    is_deleted = Column(Boolean, default=False, server_default="false")


# Backward-compatible alias
Attendance = AttendanceRecord
