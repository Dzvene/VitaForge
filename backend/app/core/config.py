"""Application settings loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ----- Application -----
    APP_NAME: str = "Baseline"
    APP_ENV: str = "development"
    APP_DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ----- Server -----
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"

    # ----- CORS -----
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8081"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ----- Database -----
    DATABASE_URL: str = "postgresql+asyncpg://baseline:baseline@localhost:5432/baseline"

    @property
    def database_url_sync(self) -> str:
        """Sync URL for Alembic (psycopg2)."""
        return self.DATABASE_URL.replace("+asyncpg", "")

    # ----- Security / JWT -----
    SECRET_KEY: str = "change-me"
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ----- Sentry (error reporting) -----
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = ""
    SENTRY_RELEASE: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

    # ----- Food data import -----
    OFF_DUMP_PATH: str = ""   # Open Food Facts JSONL dump
    USDA_DUMP_PATH: str = ""  # USDA FoodData Central CSV/JSON dump


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
