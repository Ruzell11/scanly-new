from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Server Configuration
    DEBUG: bool = True
    PORT: int = 8000

    # Database Configuration
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "resume_screener"
    DB_USER: str = "root"
    DB_PASSWORD: str = "root"
    DB_CHARSET: str = "utf8mb4"

    # Security
    SECRET_KEY: str = "secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Gemini Configuration
    OPENAI_API_KEY: str

    # Frontend
    FRONTEND_LINK: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"  # Added for forgot password

    # Email Configuration - FIXED VARIABLE NAMES
    SMTP_SERVER: str = "smtp.sendgrid.net"  # Changed from SMTP_HOST
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: Optional[str] = None
    FROM_NAME: str = "Scanly"
    
    # Password Reset Settings
    TEMP_PASSWORD_EXPIRY_HOURS: int = 24
    TEMP_PASSWORD_LENGTH: int = 12

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset={self.DB_CHARSET}"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()