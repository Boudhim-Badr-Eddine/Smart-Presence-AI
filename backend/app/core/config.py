from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration settings"""
    app_name: str = "Smart Presence AI"
    debug: bool = False
    database_url: str = "postgresql+psycopg://smart_presence:smart_presence@localhost:5432/smart_presence"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24
    facial_confidence_threshold: float = 0.85
    
    # CORS settings
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_period: int = 60  # seconds
    
    # File upload settings
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    allowed_extensions: list[str] = [".jpg", ".jpeg", ".png", ".pdf"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
