from datetime import datetime, time
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class AttendanceCreate(BaseModel):
    """Schema for creating new attendance record."""
    
    session_id: int = Field(..., gt=0, description="Session ID")
    student_id: int = Field(..., gt=0, description="Student ID")
    status: Literal["present", "absent", "late", "excused"] = Field(
        ..., description="Attendance status"
    )
    marked_via: Optional[str] = Field("manual", max_length=20, description="Check-in method")
    facial_confidence: Optional[Decimal] = Field(
        None, ge=0, le=1, description="Facial recognition confidence (0-1)"
    )
    verification_photo_path: Optional[str] = Field(None, max_length=255)
    actual_arrival_time: Optional[time] = None
    late_minutes: Optional[int] = Field(0, ge=0, description="Minutes late")
    percentage: Optional[Decimal] = Field(
        Decimal("0.00"), ge=0, le=100, description="Attendance percentage"
    )
    justification: Optional[str] = Field(None, max_length=500)
    device_id: Optional[str] = Field(None, max_length=100)
    ip_address: Optional[str] = Field(None, max_length=45)
    location_data: Optional[dict] = None
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Ensure status is valid."""
        valid = ["present", "absent", "late", "excused"]
        if v not in valid:
            raise ValueError(f"Status must be one of {valid}")
        return v


class AttendanceUpdate(BaseModel):
    """Schema for updating existing attendance record."""
    
    status: Optional[Literal["present", "absent", "late", "excused"]] = None
    marked_via: Optional[str] = Field(None, max_length=20)
    facial_confidence: Optional[Decimal] = Field(None, ge=0, le=1)
    late_minutes: Optional[int] = Field(None, ge=0)
    percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    justification: Optional[str] = Field(None, max_length=500)


class AttendanceOut(BaseModel):
    """Schema for attendance record response."""
    
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
    """Schema for student attendance summary statistics."""
    
    student_id: int = Field(..., gt=0)
    total_sessions: int = Field(..., ge=0)
    present: int = Field(..., ge=0)
    absent: int = Field(..., ge=0)
    late: int = Field(..., ge=0)
    excused: int = Field(..., ge=0)
    attendance_rate: float = Field(..., ge=0, le=100, description="Percentage")
    period_days: int = Field(..., gt=0)

    class Config:
        from_attributes = True
