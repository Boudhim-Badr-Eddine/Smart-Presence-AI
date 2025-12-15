from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class NotificationCreate(BaseModel):
    user_id: int
    user_type: str
    title: str
    message: str
    notification_type: str
    priority: Optional[str] = "medium"
    delivery_method: Optional[str] = "in_app"
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None


class NotificationOut(BaseModel):
    id: int
    user_id: int
    user_type: str
    title: str
    message: str
    notification_type: str
    priority: str
    read: bool
    read_at: Optional[datetime]
    delivery_method: str
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListOut(BaseModel):
    notifications: list[NotificationOut]
    unread_count: int
