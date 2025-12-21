from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SessionRequestCreate(BaseModel):
    """Schema for creating a session request."""
    title: str
    class_name: str
    session_date: str  # YYYY-MM-DD format
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    session_type: Optional[str] = None
    notes: Optional[str] = None


class SessionRequestOut(BaseModel):
    """Schema for session request output."""
    id: int
    trainer_id: int
    trainer_name: str
    trainer_email: str
    title: str
    class_name: str
    session_date: str
    start_time: str
    end_time: str
    session_type: Optional[str]
    notes: Optional[str]
    status: str
    admin_response: Optional[str]
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionRequestUpdate(BaseModel):
    """Schema for updating session request status."""
    status: str  # approved, rejected
    admin_response: Optional[str] = None


class SessionRequestListOut(BaseModel):
    """Schema for paginated session request list."""
    requests: list[SessionRequestOut]
    total: int
    unread_count: int  # Pending requests count
