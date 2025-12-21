from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.sql import func

from app.db.base import Base


class Controle(Base):
    """Controle/Test model for tracking exams and tests."""
    
    __tablename__ = "controles"

    __table_args__ = (
        Index("ix_controles_class_date", "class_name", "date"),
        Index("ix_controles_module", "module"),
        Index("ix_controles_notified", "notified", "date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(100), nullable=False)
    date = Column(Date, nullable=False)
    class_name = Column(String(50), nullable=False)
    notified = Column(Boolean, default=False)
    
    # Additional useful fields
    title = Column(String(200))
    description = Column(String(500))
    duration_minutes = Column(Integer)
    trainer_id = Column(Integer, ForeignKey("trainers.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False, server_default="false")
