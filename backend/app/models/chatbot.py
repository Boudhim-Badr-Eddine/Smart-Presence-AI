from sqlalchemy import JSON, Boolean, Column, DateTime, Index, Integer, String
from sqlalchemy.sql import func

from app.db.base import Base


class ChatbotConversation(Base):
    __tablename__ = "chatbot_conversations"

    __table_args__ = (
        Index("ix_chatbot_conversation_user", "user_id", "user_type"),
        Index("ix_chatbot_conversation_activity", "is_active", "last_activity"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    user_type = Column(String(20), nullable=False)
    session_id = Column(String(100), unique=True)
    context_data = Column(JSON)
    conversation_history = Column(JSON)
    started_at = Column(DateTime, server_default=func.now())
    last_activity = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)
    message_count = Column(Integer, default=0)
    user_satisfaction_score = Column(Integer)
    feedback_text = Column(String)
    created_at = Column(DateTime, server_default=func.now())


class ChatbotMessage(Base):
    __tablename__ = "chatbot_messages"

    __table_args__ = (Index("ix_chatbot_message_conversation", "conversation_id"),)

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, nullable=False)
    message_type = Column(String(20), nullable=False)
    content = Column(String, nullable=False)
    intent_detected = Column(String(100))
    confidence_score = Column(String)
    entities_extracted = Column(JSON)
    response_time_ms = Column(Integer)
    tokens_used = Column(Integer)
    model_used = Column(String(50))
    helpful_score = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
