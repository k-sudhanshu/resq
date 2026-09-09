from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    environment: Literal["local", "production"] = "local"

    # SQLite locally (zero install); Postgres in production. Access code is
    # dialect-portable, so only this string changes between the two.
    database_url: str = "sqlite+aiosqlite:///./resq.db"

    @field_validator("database_url", mode="before")
    @classmethod
    def sanitize_database_url(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        # Ensure asyncpg driver for postgresql
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]
        # asyncpg requires ssl= instead of sslmode=
        v = v.replace("sslmode=", "ssl=")
        v = v.replace("&channel_binding=require", "")
        v = v.replace("?channel_binding=require", "?")
        return v.rstrip("?")

    ai_provider: Literal["mock", "gemini"] = "mock"
    gemini_api_key: str = ""
    # "latest" alias tracks the current Flash model, so a retired model id
    # cannot silently 404 every AI call into the fallback path.
    gemini_model: str = "gemini-flash-latest"
    ai_timeout_seconds: float = 8.0

    # Optional second AI provider. When a key is present, Gemini failures are
    # retried on Groq before giving up and serving verified fallback content.
    groq_api_key: str = ""
    # Groq production model: text-only, ~500 tokens/sec, json_object support.
    groq_model: str = "openai/gpt-oss-120b"

    daily_ai_budget: int = 200

    allowed_origins: str = "http://localhost:3000"
    internal_secret: str = "local-dev-internal-secret"

    session_ttl_hours: int = 24
    sessions_per_ip_per_hour: int = 10
    analyses_per_session_per_minute: int = 5

    max_image_bytes: int = 3 * 1024 * 1024
    max_image_dimension: int = 1024
    max_description_chars: int = 2000

    log_level: str = "INFO"

    @property
    def allowed_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
