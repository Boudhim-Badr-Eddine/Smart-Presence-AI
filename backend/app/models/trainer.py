from sqlalchemy import Column, Date, DateTime, Index, Integer, String
from sqlalchemy.sql import func

from app.db.base import Base


class Trainer(Base):
    __tablename__ = "trainers"

    __table_args__ = (
        Index("ix_trainers_status", "status"),
        Index("ix_trainers_specialization", "specialization"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20))
    specialization = Column(String(100))
    years_experience = Column(Integer)
    status = Column(String(20), default="active")
    office_location = Column(String(100))
    hire_date = Column(Date)
    bio = Column(String)
    profile_photo_path = Column(String(255))
    linkedin_url = Column(String(255))
    education = Column(String(200))
    certifications = Column(String(500))
    availability = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
