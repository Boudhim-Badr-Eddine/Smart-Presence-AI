from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class ControleCreate(BaseModel):
    """Schema for creating a controle."""
    
    module: str = Field(..., min_length=1, max_length=100, description="Module name")
    controle_date: date = Field(..., description="Controle date", alias="date")
    class_name: str = Field(..., min_length=1, max_length=50, description="Class name (e.g., FS202)")
    title: Optional[str] = Field(None, max_length=200, description="Controle title")
    description: Optional[str] = Field(None, max_length=500, description="Description")
    duration_minutes: Optional[int] = Field(None, gt=0, description="Duration in minutes")
    trainer_id: Optional[int] = Field(None, description="Trainer ID")
    
    class Config:
        populate_by_name = True


class ControleUpdate(BaseModel):
    """Schema for updating a controle."""
    
    module: Optional[str] = Field(None, min_length=1, max_length=100)
    controle_date: Optional[date] = Field(None, alias="date")
    class_name: Optional[str] = Field(None, min_length=1, max_length=50)
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    duration_minutes: Optional[int] = Field(None, gt=0)
    trainer_id: Optional[int] = None
    notified: Optional[bool] = None
    
    class Config:
        populate_by_name = True


class ControleOut(BaseModel):
    """Schema for controle response."""
    
    id: int
    module: str
    controle_date: date = Field(..., alias="date")
    class_name: str
    notified: bool
    title: Optional[str]
    description: Optional[str]
    duration_minutes: Optional[int]
    trainer_id: Optional[int]

    class Config:
        from_attributes = True
        populate_by_name = True


class ControleNotificationUpdate(BaseModel):
    """Schema for updating notification status."""
    
    notified: bool = Field(..., description="Notification status")
