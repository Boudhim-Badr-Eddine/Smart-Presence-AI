from sqlalchemy import Column, Date, DateTime, Integer, Numeric, String, Boolean, Index
from sqlalchemy.sql import func
from app.db.base import Base


class Student(Base):
    __tablename__ = "students"

    __table_args__ = (
        Index("ix_students_class_status", "class", "academic_status"),
        Index("ix_students_facial_flag", "facial_data_encoded"),
        Index("ix_students_alert_level", "alert_level", "alert_sent"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    student_code = Column(String(20), unique=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    date_of_birth = Column(Date)
    cin_number = Column(String(20))
    parent_name = Column(String(100))
    parent_email = Column(String(100))
    parent_phone = Column(String(20))
    parent_relationship = Column(String(50))
    class_name = Column("class", String(50), nullable=False)
    group_name = Column(String(50))
    enrollment_date = Column(Date)
    expected_graduation = Column(Date)
    academic_status = Column(String(20), default="active")
    total_absence_hours = Column(Integer, default=0)
    total_late_minutes = Column(Integer, default=0)
    attendance_rate = Column(Numeric(5, 2), default=100.00)
    alert_sent = Column(Boolean, default=False)
    last_alert_date = Column(Date)
    alert_level = Column(String(20), default="none")
    profile_photo_path = Column(String(255))
    facial_data_encoded = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
