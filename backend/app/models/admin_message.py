from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.sql import func

from app.db.base import Base


class AdminMessage(Base):
    __tablename__ = "admin_messages"

    __table_args__ = (
        Index("ix_admin_messages_type_created", "message_type", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(String)
    message_type = Column(String(50), nullable=False)  # service_note | official_message
    status = Column(String(20), default="sent")
    created_at = Column(DateTime, server_default=func.now())


class AdminMessageAttachment(Base):
    __tablename__ = "admin_message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("admin_messages.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    mime_type = Column(String(100))
    size_bytes = Column(Integer)
    uploaded_at = Column(DateTime, server_default=func.now())


class AdminMessageTrainer(Base):
    __tablename__ = "admin_message_trainers"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("admin_messages.id", ondelete="CASCADE"), nullable=False)
    trainer_id = Column(Integer, nullable=False)


class AdminMessageClass(Base):
    __tablename__ = "admin_message_classes"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("admin_messages.id", ondelete="CASCADE"), nullable=False)
    class_name = Column(String(100), nullable=False)
