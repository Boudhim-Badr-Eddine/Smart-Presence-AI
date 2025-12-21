from sqlalchemy import Column, DateTime, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class SessionRequest(Base):
    """Model for trainer session creation requests to admins."""
    
    __tablename__ = "session_requests"

    __table_args__ = (
        Index("ix_session_requests_trainer_id", "trainer_id"),
        Index("ix_session_requests_status", "status"),
        Index("ix_session_requests_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, nullable=False)  # User ID of the trainer
    trainer_name = Column(String(200), nullable=False)
    trainer_email = Column(String(200), nullable=False)
    
    # Requested session details
    title = Column(String(200), nullable=False)
    class_name = Column(String(100), nullable=False)
    session_date = Column(String(50), nullable=False)  # Requested date
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)
    session_type = Column(String(50))
    notes = Column(Text)
    
    # Request status
    status = Column(String(20), default="pending")  # pending, approved, rejected
    admin_response = Column(Text)
    reviewed_by = Column(Integer)  # Admin user ID who reviewed
    reviewed_at = Column(DateTime)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
