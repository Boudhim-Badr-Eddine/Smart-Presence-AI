from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr


class StudentBase(BaseModel):
    student_code: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    cin_number: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    parent_relationship: Optional[str] = None
    class_name: str
    group_name: Optional[str] = None
    enrollment_date: Optional[date] = None
    expected_graduation: Optional[date] = None
    academic_status: Optional[str] = "active"


class StudentCreate(StudentBase):
    user_id: int


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    cin_number: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    parent_relationship: Optional[str] = None
    class_name: Optional[str] = None
    group_name: Optional[str] = None
    enrollment_date: Optional[date] = None
    expected_graduation: Optional[date] = None
    academic_status: Optional[str] = None
    profile_photo_path: Optional[str] = None


class StudentOut(StudentBase):
    id: int
    user_id: int
    total_absence_hours: int
    total_late_minutes: int
    attendance_rate: Decimal
    alert_sent: bool
    last_alert_date: Optional[date]
    alert_level: str
    profile_photo_path: Optional[str]
    facial_data_encoded: bool
    
    # N8N integration fields
    pourcentage: Optional[int] = None  # AI attendance score (0-100)
    justification: Optional[str] = None  # AI explanation
    alertsent: Optional[bool] = False  # WhatsApp alert sent flag
    idStr: Optional[str] = None  # String ID for N8N compatibility
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentListResponse(BaseModel):
    students: list[StudentOut]
    total: int
    page: int
    page_size: int
