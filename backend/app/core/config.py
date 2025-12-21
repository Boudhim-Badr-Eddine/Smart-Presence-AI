from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration settings"""

    app_name: str = "Smart Presence AI"
    debug: bool = False
    database_url: str = (
        "postgresql+psycopg://smart_presence:smart_presence@localhost:5432/smart_presence"
    )
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me"
    encryption_key: str | None = None
    access_token_expire_minutes: int = 60 * 24
    facial_confidence_threshold: float = 0.62

    # CORS settings
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_period: int = 60  # seconds

    # File upload settings
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: list[str] = [".jpg", ".jpeg", ".png", ".pdf"]

    # Storage
    s3_bucket: str | None = None
    s3_region: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None

    # Webhooks / integrations
    webhook_secret: str | None = None

    # Gemini API Configuration
    gemini_api_key: str = "AIzaSyDqXW1mIeNEVfXqmITTW74UcnraHkAoh8U"
    gemini_model: str = "gemini-2.0-flash"
    gemini_temperature: float = 0.7
    gemini_max_tokens: int = 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Backward-compatible alias used by some modules
settings = get_settings()
