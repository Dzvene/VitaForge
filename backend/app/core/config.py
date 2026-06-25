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
    APP_NAME: str = "VitaForge"
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
    DATABASE_URL: str = "postgresql+asyncpg://vitaforge:vitaforge@localhost:5432/vitaforge"

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

    # ----- Auth rate limiting (in-memory, per client IP) -----
    LOGIN_RATE_LIMIT: int = 10        # max attempts ...
    LOGIN_RATE_WINDOW_SECONDS: int = 60  # ... per this window
    REGISTER_RATE_LIMIT: int = 5
    REGISTER_RATE_WINDOW_SECONDS: int = 300
    # forgot-password / resend-verification: stricter (each one sends an email)
    EMAIL_SEND_RATE_LIMIT: int = 5
    EMAIL_SEND_RATE_WINDOW_SECONDS: int = 900

    # ----- Email (SMTP) -----
    # Provider-agnostic: when SMTP_HOST and SMTP_PASSWORD are both set, mail goes
    # out over SMTP; otherwise it falls back to the console backend (logged +
    # captured in an in-memory outbox for dev/tests). Mirrors Invocore's one.com
    # setup — point these at a vitaforge@ mailbox to go live.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "no-reply@vitaforge.app"
    SMTP_FROM_NAME: str = "VitaForge"
    SMTP_USE_SSL: bool = True  # SSL on connect (465); False = STARTTLS (587)

    @property
    def email_enabled(self) -> bool:
        """True when a real SMTP transport is configured."""
        return bool(self.SMTP_HOST and self.SMTP_PASSWORD)

    # Public base URL of the frontend — used to build links inside emails.
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # ----- Email token TTLs -----
    EMAIL_VERIFICATION_TTL_HOURS: int = 48
    PASSWORD_RESET_TTL_MINUTES: int = 60

    # ----- Food data import -----
    OFF_DUMP_PATH: str = ""   # Open Food Facts JSONL dump
    USDA_DUMP_PATH: str = ""  # USDA FoodData Central CSV/JSON dump


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
