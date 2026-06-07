from __future__ import annotations

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_ENV: str = "development"
    PORT: int = 8000

    # Database selector: mongodb (default) or postgresql
    DB_PROFILE: str = "mongodb"
    MONGODB_URI: str = ""
    POSTGRESQL_URI: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/todos"

    # Redis — optional
    REDIS_ENABLED: bool = False
    REDIS_URL: str = ""
    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6379

    CACHE_TTL_SECONDS: int = 30

    @field_validator("APP_ENV")
    @classmethod
    def validate_app_env(cls, v: str) -> str:
        allowed = {"development", "test", "production"}
        if v not in allowed:
            raise ValueError(f"APP_ENV must be one of {allowed}, got '{v}'")
        return v

    @field_validator("DB_PROFILE")
    @classmethod
    def validate_db_profile(cls, v: str) -> str:
        allowed = {"mongodb", "postgresql"}
        if v not in allowed:
            raise ValueError(f"DB_PROFILE must be one of {allowed}, got '{v}'")
        return v

    @field_validator("PORT")
    @classmethod
    def validate_port(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError("PORT must be between 1 and 65535")
        return v

    @field_validator("CACHE_TTL_SECONDS")
    @classmethod
    def validate_ttl(cls, v: int) -> int:
        if v < 1:
            raise ValueError("CACHE_TTL_SECONDS must be >= 1")
        return v

    @model_validator(mode="after")
    def validate_database_config(self) -> "Settings":
        if self.DB_PROFILE == "mongodb" and not self.MONGODB_URI:
            raise ValueError("MONGODB_URI is required when DB_PROFILE=mongodb")
        if self.DB_PROFILE == "postgresql" and not self.POSTGRESQL_URI:
            raise ValueError("POSTGRESQL_URI is required when DB_PROFILE=postgresql")
        return self

    @property
    def redis_dsn(self) -> str:
        """Return a Redis DSN, preferring REDIS_URL over HOST+PORT."""
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
