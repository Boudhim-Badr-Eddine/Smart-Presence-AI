from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ReportSummary(BaseModel):
    student_code: str
    name: str
    class_: str
    total_sessions: int
    present: int
    absent: int
    late: int
    excused: int
    attendance_rate: float


class AttendanceReportOut(BaseModel):
    report_date: datetime
    students: List[ReportSummary]


class StudentReportOut(BaseModel):
    student_code: str
    name: str
    class_: str
    email: str
    enrollment_date: Optional[str]
    total_absence_hours: int
    total_late_minutes: int
    attendance_rate: float
    alert_level: str
    attendance_summary: dict
    report_generated: str


class ClassAnalyticsOut(BaseModel):
    class_: str
    total_students: int
    high_risk_students: int
    average_attendance_rate: float
    students: List[dict]
    report_generated: str
