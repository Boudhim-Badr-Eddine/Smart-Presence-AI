from typing import List, Optional

from pydantic import BaseModel, Field


class AdminMessageCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    message_type: str = Field(..., pattern=r"^(service_note|official_message)$")
    body: Optional[str] = None
    trainer_ids: List[int] = []
    class_names: List[str] = []


class AdminMessageOut(BaseModel):
    id: int
    title: str
    message_type: str
    body: Optional[str] = None
    trainer_ids: List[int]
    class_names: List[str]
    attachments: List[str]

    class Config:
        from_attributes = True
