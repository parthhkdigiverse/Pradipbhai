from pathlib import Path
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path to single root .env file (/Volumes/Other/PradipBhai/.env)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV_FILE = ROOT_DIR / ".env"

class Settings(BaseSettings):
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173
    
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "alpha_creative_db"
    DATABASE_URL: Optional[str] = None
    
    REDIS_URL: str = "redis://127.0.0.1:6379/0"

    SECRET_KEY: str = "alpha_creative_secret_key_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "*"

    @model_validator(mode="after")
    def assemble_db_connection(self) -> "Settings":
        if not self.DATABASE_URL or "127.0.0.1" in self.DATABASE_URL and self.DB_HOST != "127.0.0.1":
            pwd = f":{self.DB_PASSWORD}" if self.DB_PASSWORD else ""
            self.DATABASE_URL = f"mysql+aiomysql://{self.DB_USER}{pwd}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        return self

    model_config = SettingsConfigDict(
        env_file=str(ROOT_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

