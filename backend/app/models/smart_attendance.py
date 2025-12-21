"""Smart Attendance Models (database-backed).

These models are aligned with the current PostgreSQL schema created by init scripts/migrations.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    __table_args__ = (
        Index("ix_attendance_sessions_session_mode", "session_id", "mode"),
    )

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String(20), nullable=False)  # self_checkin, teams_auto, hybrid

    # Activation state
    is_active = Column(Boolean, default=False)
    activated_at = Column(DateTime)
    confirmed_at = Column(DateTime)

    checkin_window_minutes = Column(Integer, default=15)
    location_verification_enabled = Column(Boolean, default=False)
    classroom_lat = Column(Numeric(10, 8))
    classroom_lng = Column(Numeric(11, 8))
    allowed_radius_meters = Column(Integer, default=100)

    teams_meeting_id = Column(String(255))
    teams_meeting_url = Column(Text)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class SelfCheckin(Base):
    __tablename__ = "self_checkins"

    __table_args__ = (
        Index("ix_self_checkins_session_student", "attendance_session_id", "student_id"),
        Index("ix_self_checkins_status", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    attendance_session_id = Column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)

    face_confidence = Column(Numeric(3, 2))
    liveness_passed = Column(Boolean, default=False)
    location_verified = Column(Boolean, default=True)

    checkin_lat = Column(Numeric(10, 8))
    checkin_lng = Column(Numeric(11, 8))
    distance_from_class_meters = Column(Integer)

    verification_photo_path = Column(String(512))
    device_id = Column(String(100))
    ip_address = Column(String(45))

    status = Column(String(20), nullable=False)  # approved, rejected, flagged
    rejection_reason = Column(Text)

    created_at = Column(DateTime, server_default=func.now())


class TeamsParticipation(Base):
    __tablename__ = "teams_participation"

    __table_args__ = (
        Index("ix_teams_participation_session_student", "attendance_session_id", "student_id"),
        Index("ix_teams_participation_meeting_participant", "teams_meeting_id", "teams_participant_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    attendance_session_id = Column(
        Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    teams_meeting_id = Column(String(255), nullable=False)
    teams_participant_id = Column(String(255), nullable=False)
    join_time = Column(DateTime, nullable=False)
    leave_time = Column(DateTime)
    presence_percentage = Column(Numeric(5, 2), default=0)
    engagement_score = Column(Integer, default=0)
    camera_on_minutes = Column(Integer, default=0)
    mic_used_count = Column(Integer, default=0)
    chat_messages_count = Column(Integer, default=0)
    reactions_count = Column(Integer, default=0)
    engagement_details = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class AttendanceAlert(Base):
    __tablename__ = "attendance_alerts"

    __table_args__ = (
        Index("ix_attendance_alerts_student_severity", "student_id", "severity"),
        Index("ix_attendance_alerts_acknowledged", "is_acknowledged"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"))
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    metadata_json = Column("metadata", JSONB)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by_user_id = Column(Integer)
    acknowledged_at = Column(DateTime)
    action_taken = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class FraudDetection(Base):
    __tablename__ = "fraud_detections"

    __table_args__ = (
        Index("ix_fraud_detections_student_severity", "student_id", "severity"),
        Index("ix_fraud_detections_resolved", "is_resolved"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"))
    checkin_id = Column(Integer, ForeignKey("self_checkins.id", ondelete="CASCADE"))
    fraud_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    evidence = Column(JSONB)
    description = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by_user_id = Column(Integer)
    resolution_notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    resolved_at = Column(DateTime)


class SmartAttendanceLog(Base):
    __tablename__ = "smart_attendance_logs"

    __table_args__ = (
        Index("ix_smart_attendance_logs_event_created", "event_type", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    user_id = Column(Integer)
    student_id = Column(Integer)
    session_id = Column(Integer)
    details = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())
