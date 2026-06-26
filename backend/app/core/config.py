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

    # ----- Web Push (VAPID) -----
    # Reminders are delivered over the Web Push protocol (no email, no SMTP).
    # VAPID_PRIVATE_KEY_B64 is the base64 of a PEM EC P-256 private key; the
    # browser-facing application server key is derived from it at runtime, so
    # there is a single source of truth. Generate both with
    # `python -m scripts.gen_vapid`. When unset, push is disabled and the
    # scheduler stays dormant — the rest of the app is unaffected.
    VAPID_PRIVATE_KEY_B64: str = ""
    VAPID_SUBJECT: str = "mailto:rybalkin.nikolay@gmail.com"

    @property
    def push_enabled(self) -> bool:
        return bool(self.VAPID_PRIVATE_KEY_B64)

    # ----- APNs (Apple Push Notification service — native iOS) -----
    # Token-based auth (.p8 key). APNS_PRIVATE_KEY_B64 is base64 of the .p8 PEM.
    # When unset, native iOS push is disabled (the rest is unaffected).
    APNS_KEY_ID: str = ""
    APNS_TEAM_ID: str = ""
    APNS_BUNDLE_ID: str = "net.matrixcapital.vitaforge"
    APNS_PRIVATE_KEY_B64: str = ""
    APNS_USE_SANDBOX: bool = True  # api.sandbox.push.apple.com vs api.push.apple.com

    @property
    def apns_enabled(self) -> bool:
        return bool(self.APNS_KEY_ID and self.APNS_TEAM_ID and self.APNS_PRIVATE_KEY_B64)

    # ----- FCM (Firebase Cloud Messaging — native Android), HTTP v1 -----
    # FCM_SERVICE_ACCOUNT_B64 is base64 of the service-account JSON. The OAuth
    # token is minted from it at runtime (no google-auth dependency).
    FCM_SERVICE_ACCOUNT_B64: str = ""

    @property
    def fcm_enabled(self) -> bool:
        return bool(self.FCM_SERVICE_ACCOUNT_B64)

    @property
    def native_push_enabled(self) -> bool:
        return self.apns_enabled or self.fcm_enabled

    # Reminder scheduler — an in-process asyncio loop. Off under tests.
    REMINDER_SCHEDULER_ENABLED: bool = True
    REMINDER_TICK_SECONDS: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
