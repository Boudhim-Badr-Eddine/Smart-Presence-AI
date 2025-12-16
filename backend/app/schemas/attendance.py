from datetime import datetime, time
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class AttendanceCreate(BaseModel):
    session_id: int
    student_id: int
    status: str
    marked_via: Optional[str] = "manual"
    facial_confidence: Optional[Decimal] = None
    verification_photo_path: Optional[str] = None
    actual_arrival_time: Optional[time] = None
    late_minutes: Optional[int] = 0
    percentage: Optional[Decimal] = Decimal("0.00")
    justification: Optional[str] = None
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    location_data: Optional[dict] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    marked_via: Optional[str] = None
    facial_confidence: Optional[Decimal] = None
    late_minutes: Optional[int] = None
    percentage: Optional[Decimal] = None
    justification: Optional[str] = None


class AttendanceOut(BaseModel):
    id: int
    session_id: int
    student_id: int
    status: str
    marked_via: Optional[str]
    facial_confidence: Optional[Decimal]
    verification_photo_path: Optional[str]
    marked_at: datetime
    actual_arrival_time: Optional[time]
    late_minutes: Optional[int]
    percentage: Optional[Decimal]
    justification: Optional[str]

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    student_id: int
    total_sessions: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_rate: float
    period_days: int

    class Config:
        from_attributes = True
