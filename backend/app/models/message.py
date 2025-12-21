from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class MessageThread(Base):
    __tablename__ = "message_threads"

    __table_args__ = (
        Index("ix_message_threads_users", "user1_id", "user2_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, nullable=False, index=True)
    user2_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class Message(Base):
    __tablename__ = "messages"

    __table_args__ = (
        Index("ix_messages_thread_created", "thread_id", "created_at"),
        Index("ix_messages_recipient_read", "recipient_id", "read"),
    )

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, nullable=False, index=True)
    sender_id = Column(Integer, nullable=False, index=True)
    recipient_id = Column(Integer, nullable=False, index=True)
    content = Column(Text, nullable=False)
    read = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime, server_default=func.now())
