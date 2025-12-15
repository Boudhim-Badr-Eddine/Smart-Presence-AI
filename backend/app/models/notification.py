from sqlalchemy import Boolean, Column, DateTime, Integer, String, Index
from sqlalchemy.sql import func
from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "read"),
        Index("ix_notifications_type_priority", "notification_type", "priority"),
        Index("ix_notifications_delivery_status", "delivery_status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    user_type = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(String, nullable=False)
    notification_type = Column(String(50), nullable=False)
    priority = Column(String(20), default="medium")
    read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    delivered = Column(Boolean, default=False)
    delivery_method = Column(String(20), default="in_app")
    delivery_status = Column(String(20), default="pending")
    action_url = Column(String(255))
    action_label = Column(String(100))
    related_entity_type = Column(String(50))
    related_entity_id = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    scheduled_for = Column(DateTime, server_default=func.now())
