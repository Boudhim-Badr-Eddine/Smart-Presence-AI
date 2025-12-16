from datetime import datetime

from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class TokenPayload(BaseModel):
    sub: str | None = None
    exp: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class FacialLoginRequest(BaseModel):
    email: EmailStr
    image_base64: str
    confidence_threshold: float | None = None


class EnrollFacialRequest(BaseModel):
    user_id: int
    images_base64: list[str]

    def requires_three_images(self) -> bool:
        return len(self.images_base64) >= 3


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    role: str
    last_login: datetime | None

    class Config:
        from_attributes = True
