from sqlalchemy import Column, Date, DateTime, Integer, String, Time, Boolean, Index
from sqlalchemy.sql import func
from app.db.base import Base


class Session(Base):
    __tablename__ = "sessions"

    __table_args__ = (
        Index("ix_sessions_date_class", "session_date", "classroom_id"),
        Index("ix_sessions_trainer_status", "trainer_id", "status"),
        Index("ix_sessions_type_attendance", "session_type", "attendance_marked"),
    )

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, nullable=False)
    trainer_id = Column(Integer, nullable=False)
    classroom_id = Column(Integer, nullable=False)
    session_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer)
    title = Column(String(200))  # Alias for topic for frontend compatibility
    topic = Column(String(200))
    class_name = Column(String(100))  # Class/group identifier
    session_type = Column(String(50), default="theory")
    status = Column(String(20), default="scheduled")
    attendance_marked = Column(Boolean, default=False)
    notes = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
