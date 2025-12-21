"""Smart Attendance Schemas - Pydantic models for self check-in and Teams integration."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# ============================================================================
# Attendance Session Schemas
# ============================================================================

class AttendanceSessionCreate(BaseModel):
    session_id: int
    mode: str = Field(..., pattern=r"^(self_checkin|teams_auto|hybrid)$")
    checkin_window_minutes: int = Field(default=15, ge=5, le=60)
    location_verification_enabled: bool = False
    classroom_lat: Optional[float] = None
    classroom_lng: Optional[float] = None
    allowed_radius_meters: int = Field(default=100, ge=10, le=1000)
    teams_meeting_id: Optional[str] = None
    teams_meeting_url: Optional[str] = None


class AttendanceSessionOut(BaseModel):
    id: int
    session_id: int
    mode: str
    checkin_window_minutes: int
    location_verification_enabled: bool
    classroom_lat: Optional[float]
    classroom_lng: Optional[float]
    allowed_radius_meters: int
    teams_meeting_id: Optional[str]
    teams_meeting_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class AttendanceSessionUpdate(BaseModel):
    mode: Optional[str] = Field(None, pattern=r"^(self_checkin|teams_auto|hybrid)$")
    checkin_window_minutes: Optional[int] = Field(None, ge=5, le=60)
    location_verification_enabled: Optional[bool] = None
    classroom_lat: Optional[float] = None
    classroom_lng: Optional[float] = None
    allowed_radius_meters: Optional[int] = Field(None, ge=10, le=1000)
    teams_meeting_id: Optional[str] = None
    teams_meeting_url: Optional[str] = None


# ============================================================================
# Self Check-in Schemas
# ============================================================================

class SelfCheckinCreate(BaseModel):
    attendance_session_id: int
    student_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    device_id: Optional[str] = None


class SelfCheckinOut(BaseModel):
    id: int
    attendance_session_id: int
    student_id: int
    face_confidence: Optional[float]
    liveness_passed: bool
    location_verified: bool
    checkin_lat: Optional[float]
    checkin_lng: Optional[float]
    distance_from_class_meters: Optional[int]
    verification_photo_path: Optional[str]
    device_id: Optional[str]
    ip_address: Optional[str]
    status: str  # approved, rejected, flagged
    rejection_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Teams Participation Schemas
# ============================================================================

class TeamsParticipationCreate(BaseModel):
    attendance_session_id: int
    student_id: int
    teams_meeting_id: str
    teams_participant_id: str
    join_time: datetime
    leave_time: Optional[datetime] = None


class TeamsParticipationOut(BaseModel):
    id: int
    attendance_session_id: int
    student_id: int
    teams_meeting_id: str
    teams_participant_id: str
    join_time: datetime
    leave_time: Optional[datetime]
    presence_percentage: float
    engagement_score: int
    camera_on_minutes: int
    mic_used_count: int
    chat_messages_count: int
    reactions_count: int
    engagement_details: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================================================
# Attendance Alert Schemas
# ============================================================================

class AttendanceAlertOut(BaseModel):
    id: int
    student_id: int
    session_id: Optional[int]
    alert_type: str
    severity: str  # low, medium, high
    message: str
    metadata: Optional[Dict[str, Any]] = Field(alias="metadata_json")
    is_acknowledged: bool
    acknowledged_by_user_id: Optional[int]
    acknowledged_at: Optional[datetime]
    action_taken: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# ============================================================================
# Fraud Detection Schemas
# ============================================================================

class FraudDetectionOut(BaseModel):
    id: int
    student_id: int
    session_id: Optional[int]
    checkin_id: Optional[int]
    fraud_type: str
    severity: str  # low, medium, high, critical
    evidence: Optional[Dict[str, Any]]
    description: str
    is_resolved: bool
    resolved_by_user_id: Optional[int]
    resolution_notes: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================================================
# Live Attendance Snapshot
# ============================================================================

class LiveAttendanceSnapshot(BaseModel):
    session_id: int
    mode: str
    total_students_expected: int
    total_checked_in: int
    pending_verification: int
    fraud_flags_count: int
    recent_checkins: List[SelfCheckinOut]
    recent_teams_joins: List[TeamsParticipationOut]

