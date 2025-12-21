from sqlalchemy import Boolean, Column, DateTime, Float, Index, Integer, String
from sqlalchemy.sql import func

from app.db.base import Base


class FacialVerificationLog(Base):
    __tablename__ = "facial_verification_logs"

    __table_args__ = (
        Index("ix_facial_verification_logs_created_at", "created_at"),
        Index("ix_facial_verification_logs_user_id", "user_id"),
        Index("ix_facial_verification_logs_attempted_email", "attempted_email"),
    )

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    user_id = Column(Integer, nullable=True)
    attempted_email = Column(String(255), nullable=True)

    success = Column(Boolean, nullable=False, default=False)
    similarity = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    failure_reason = Column(String(100), nullable=True)

    num_faces = Column(Integer, nullable=True)
    blur_score = Column(Float, nullable=True)
    brightness = Column(Float, nullable=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
