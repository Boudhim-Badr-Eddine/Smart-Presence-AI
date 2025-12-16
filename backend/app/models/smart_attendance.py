"""Smart Attendance Models - Focused on self check-in & Teams integration."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base


class AttendanceSession(Base):
    """Configuration for smart attendance per session."""
    
    __tablename__ = "attendance_sessions"
    
    __table_args__ = (
        Index("ix_attendance_sessions_session_mode", "session_id", "mode"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    mode = Column(String(20), nullable=False)  # self_checkin, teams_auto, hybrid
    
    # Self check-in settings
    checkin_enabled = Column(Boolean, default=True)
    checkin_window_minutes = Column(Integer, default=15)  # Can check in 15 min before/after start
    require_liveness = Column(Boolean, default=True)
    require_location = Column(Boolean, default=False)
    location_radius_meters = Column(Integer, default=100)
    location_lat = Column(Numeric(10, 8))
    location_lng = Column(Numeric(11, 8))
    
    # Teams integration settings
    teams_meeting_id = Column(String(255))
    teams_meeting_url = Column(String(512))
    teams_engagement_scoring = Column(Boolean, default=True)
    min_presence_percent = Column(Integer, default=80)  # Must be present 80% of session
    
    # Status tracking
    status = Column(String(20), default="pending")  # pending, active, completed, cancelled
    activated_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SelfCheckin(Base):
    """Student self check-in attempts with AI verification."""
    
    __tablename__ = "self_checkins"
    
    __table_args__ = (
        Index("ix_self_checkins_session_student", "attendance_session_id", "student_id"),
        Index("ix_self_checkins_status", "status"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    
    # Verification results
    face_confidence = Column(Numeric(3, 2))  # 0.00 to 1.00
    liveness_passed = Column(Boolean, default=False)
    location_verified = Column(Boolean, default=True)  # Default true if location check disabled
    
    # Location data (if enabled)
    checkin_lat = Column(Numeric(10, 8))
    checkin_lng = Column(Numeric(11, 8))
    distance_from_class_meters = Column(Integer)
    
    # Status
    status = Column(String(20), nullable=False)  # pending, approved, rejected, flagged
    rejection_reason = Column(String(255))
    
    # Timestamps
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # Link to final attendance record (commented out to avoid FK issues)
    # attendance_record_id = Column(Integer, ForeignKey("attendance_records.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TeamsParticipation(Base):
    """Microsoft Teams participation logs for remote sessions."""
    
    __tablename__ = "teams_participation"
    
    __table_args__ = (
        Index("ix_teams_participation_session_student", "attendance_session_id", "student_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    attendance_session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    
    # Join/leave timestamps from Teams API
    joined_at = Column(DateTime(timezone=True))
    left_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    presence_percentage = Column(Integer)  # % of total session duration
    
    # Optional engagement metrics
    camera_on_minutes = Column(Integer, default=0)
    mic_used_count = Column(Integer, default=0)  # Number of times mic was activated
    chat_messages_count = Column(Integer, default=0)
    reactions_count = Column(Integer, default=0)
    
    # Computed engagement score (0-100)
    engagement_score = Column(Integer)
    
    # Optional facial verification for bonus points
    face_verified = Column(Boolean, default=False)
    face_verification_confidence = Column(Numeric(3, 2))
    face_verification_at = Column(DateTime(timezone=True))
    
    # Attendance status
    status = Column(String(20), default="pending")  # pending, present, absent (if < min_presence_percent)
    
    # Link to final attendance record (commented out to avoid FK issues)
    # attendance_record_id = Column(Integer, ForeignKey("attendance_records.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AttendanceAlert(Base):
    """Smart alerts for attendance patterns and anomalies."""
    
    __tablename__ = "attendance_alerts"
    
    __table_args__ = (
        Index("ix_attendance_alerts_student_type", "student_id", "alert_type"),
        Index("ix_attendance_alerts_acknowledged", "acknowledged"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"))
    
    # Alert types:
    # - sudden_absence: Student with 95%+ attendance suddenly absent
    # - consecutive_absences: 3+ absences in a row
    # - low_confidence: Facial match < 60%
    # - location_violation: Check-in from wrong location
    # - duplicate_checkin: Multiple check-ins for same session
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSONB)  # Additional context
    
    # Who should be notified
    notify_trainer = Column(Boolean, default=True)
    notify_admin = Column(Boolean, default=False)
    notify_student = Column(Boolean, default=False)
    
    # Acknowledgment tracking
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime(timezone=True))
    action_taken = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FraudDetection(Base):
    """Fraud detection for check-ins (proxy, screenshot, location spoofing)."""
    
    __tablename__ = "fraud_detections"
    
    __table_args__ = (
        Index("ix_fraud_detections_reviewed", "reviewed", "severity"),
        Index("ix_fraud_detections_student", "student_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"))
    checkin_id = Column(Integer, ForeignKey("self_checkins.id"))
    
    # Fraud types:
    # - proxy_attendance: Different person's face detected
    # - screenshot_fraud: Static image detected (no liveness)
    # - location_spoof: GPS coordinates don't match classroom
    # - duplicate_attempt: Multiple check-ins within short time
    fraud_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    details = Column(JSONB)  # Evidence (confidence scores, location data, etc.)
    
    # Auto-action taken
    auto_action = Column(String(50))  # rejected_checkin, flagged_for_review, blocked_student
    
    # Review workflow
    reviewed = Column(Boolean, default=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    reviewed_at = Column(DateTime(timezone=True))
    resolution = Column(String(50))  # confirmed_fraud, false_positive, warning_issued
    resolution_notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SmartAttendanceLog(Base):
    """Audit trail for smart attendance system actions."""
    
    __tablename__ = "smart_attendance_logs"
    
    __table_args__ = (
        Index("ix_smart_logs_session", "session_id"),
        Index("ix_smart_logs_timestamp", "created_at"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"))
    attendance_session_id = Column(Integer, ForeignKey("attendance_sessions.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    
    # Action types:
    # - checkin_approved, checkin_rejected, teams_sync, alert_triggered, fraud_detected
    action_type = Column(String(50), nullable=False)
    
    # What triggered it: student_app, teams_api, liveness_check, location_check, auto_threshold
    triggered_by = Column(String(50))
    
    details = Column(JSONB)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
