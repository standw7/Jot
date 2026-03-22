from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    DATABASE_URL: str = "sqlite:///./jot.db"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    FRONTEND_URL: str = "http://localhost:3000"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://notes.homelab/settings?google=callback"

    # Internal API key for service-to-service auth
    INTERNAL_API_KEY: str = ""

    # Integration URLs
    DOIT_API_URL: str = "http://doit-backend:8000"
    DOIT_INTERNAL_API_KEY: str = ""
    LINKWARDEN_API_URL: str = "http://linkwarden:3000"
    LINKWARDEN_API_KEY: str = ""

    # Upload settings
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
