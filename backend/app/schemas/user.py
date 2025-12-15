from pydantic import BaseModel, EmailStr
from app.schemas.common import Timestamped


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserOut(Timestamped):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True
