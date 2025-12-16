from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ChatbotMessageCreate(BaseModel):
    conversation_id: int
    content: str


class ChatbotMessageOut(BaseModel):
    id: int
    conversation_id: int
    message_type: str
    content: str
    intent_detected: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatbotConversationStart(BaseModel):
    user_id: int
    user_type: str


class ChatbotConversationOut(BaseModel):
    id: int
    user_id: int
    user_type: str
    is_active: bool
    message_count: int
    started_at: datetime

    class Config:
        from_attributes = True


class ChatbotAskIn(BaseModel):
    """Input model for quick ask endpoint when sent as JSON body."""
    question: str
