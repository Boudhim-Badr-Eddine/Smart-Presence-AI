from sqlalchemy import Column, DateTime, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class StudentFeedback(Base):
    __tablename__ = "student_feedbacks"

    __table_args__ = (
        Index("ix_student_feedbacks_student_created", "student_id", "created_at"),
        Index("ix_student_feedbacks_status", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, server_default="pending")  # pending, reviewed, resolved
    response = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
