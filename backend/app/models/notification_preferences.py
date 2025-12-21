from sqlalchemy import Boolean, Column, DateTime, Index, Integer
from sqlalchemy.sql import func

from app.db.base import Base


class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"

    __table_args__ = (
        Index("ux_notification_preferences_user_id", "user_id", unique=True),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)

    system = Column(Boolean, default=True, nullable=False)
    justification = Column(Boolean, default=True, nullable=False)
    schedule = Column(Boolean, default=True, nullable=False)
    message = Column(Boolean, default=True, nullable=False)

    email = Column(Boolean, default=True, nullable=False)
    push = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
