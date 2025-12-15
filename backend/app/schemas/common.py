from datetime import datetime
from pydantic import BaseModel, EmailStr


class Timestamped(BaseModel):
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    role: str

    class Config:
        from_attributes = True
