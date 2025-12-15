from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
from typing import Optional


class AbsenceCreate(BaseModel):
    """Schema for creating a new absence record"""
    student_id: int
    session_id: Optional[int] = None
    absence_date: date
    hours_missed: int = 1
    justified: bool = False
    justification_text: Optional[str] = None
    justification_type: Optional[str] = None  # medical, personal, academic, other
    supporting_docs_path: Optional[str] = None
    notification_method: Optional[str] = None


class AbsenceUpdate(BaseModel):
    """Schema for updating an absence record"""
    status: Optional[str] = None
    justified: Optional[bool] = None
    justification_text: Optional[str] = None
    justification_type: Optional[str] = None
    supporting_docs_path: Optional[str] = None
    absence_severity: Optional[str] = None  # low, medium, high
    affects_grade: Optional[bool] = None


class AbsenceReview(BaseModel):
    """Schema for reviewing and approving/rejecting absences"""
    justification_status: str  # approved, rejected
    review_notes: Optional[str] = None
    reviewed_by: int


class AbsenceOut(BaseModel):
    """Schema for absence record output"""
    id: int
    student_id: int
    session_id: Optional[int]
    absence_date: date
    hours_missed: int
    notified: bool
    notification_sent_at: Optional[datetime]
    notification_method: Optional[str]
    justified: bool
    justification_text: Optional[str]
    justification_type: Optional[str]
    supporting_docs_path: Optional[str]
    justification_status: str
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]
    absence_severity: str
    affects_grade: bool
    percentage: Optional[Decimal] = None  # Percentage of session missed
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AbsenceSummary(BaseModel):
    """Schema for absence summary stats"""
    student_id: int
    total_absence_hours: int
    total_absences: int
    justified_absences: int
    unjustified_absences: int
    pending_justifications: int
    approval_rate: Decimal
    alert_level: str  # none, low, medium, high, critical


class AbsenceListOut(BaseModel):
    """Schema for listing absences with filters"""
    id: int
    student_id: int
    absence_date: date
    hours_missed: int
    justified: bool
    justification_status: str
    absence_severity: str
    created_at: datetime


class AbsenceStatistics(BaseModel):
    """Schema for absence statistics and analytics"""
    total_hours: int
    average_hours_per_absence: Decimal
    most_common_type: Optional[str]
    trend_percentage: Optional[Decimal]  # Change percentage from previous period
    peak_absence_day: Optional[str]
    justification_percentage: Decimal
