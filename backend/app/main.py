"""VitaForge — FastAPI application entry."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


def _init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT or settings.APP_ENV,
            release=settings.SENTRY_RELEASE or None,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            integrations=[StarletteIntegration(), FastApiIntegration(), SqlalchemyIntegration()],
            send_default_pii=False,
        )
        logger.info("Sentry initialized")
    except Exception:
        logger.exception("Sentry init failed — continuing without it")


_init_sentry()


def _run_migrations() -> None:
    import os

    from alembic import command
    from alembic.config import Config

    alembic_ini = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")
    if not os.path.exists(alembic_ini):
        logger.warning("alembic.ini not found, skipping migrations")
        return
    try:
        command.upgrade(Config(alembic_ini), "head")
        logger.info("alembic migrations applied")
    except Exception as exc:
        logger.warning("alembic upgrade failed: %s", exc)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting %s (env=%s)", settings.APP_NAME, settings.APP_ENV)
    if settings.APP_ENV != "test":
        _run_migrations()
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="Calorie & macro tracker — calibration-first, no ads, no paywall.",
    version="0.1.0",
    lifespan=lifespan,
    debug=settings.APP_DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Locale middleware — sets the i18n ContextVar from the Accept-Language header
# so coaching copy and user-visible errors return in the caller's language.
from app.core.i18n import LocaleMiddleware  # noqa: E402

app.add_middleware(LocaleMiddleware)

# ---- Event subscribers (import before routers so subscribe() runs) ----
from app.modules import calibration as _calibration  # noqa: E402, F401
from app.modules import nutrition as _nutrition  # noqa: E402, F401  # noqa

# ---- Routers ----
from app.modules.account.router import router as account_router  # noqa: E402
from app.modules.analytics.router import router as analytics_router  # noqa: E402
from app.modules.admin.router import admin_router as admin_stats_router  # noqa: E402
from app.modules.app_config.router import admin_router as app_params_admin_router  # noqa: E402
from app.modules.auth.router import router as auth_router  # noqa: E402
from app.modules.calibration import subscribers as _cal_subs  # noqa: E402, F401
from app.modules.calibration.router import router as calibration_router  # noqa: E402
from app.modules.coaching.router import router as coaching_router  # noqa: E402
from app.modules.diary.router import router as diary_router  # noqa: E402
from app.modules.foods.admin_router import admin_router as foods_admin_router  # noqa: E402
from app.modules.foods.router import router as foods_router  # noqa: E402
from app.modules.identity.admin_router import admin_router as users_admin_router  # noqa: E402
from app.modules.legal.admin_router import admin_router as legal_admin_router  # noqa: E402
from app.modules.legal.router import router as legal_router  # noqa: E402
from app.modules.nutrition import subscribers as _nut_subs  # noqa: E402, F401
from app.modules.nutrition.router import router as nutrition_router  # noqa: E402
from app.modules.profile.router import router as profile_router  # noqa: E402
from app.modules.public.router import router as public_router  # noqa: E402
from app.modules.weight.router import router as weight_router  # noqa: E402

api_v1 = settings.API_V1_PREFIX
for r in (
    public_router,
    legal_router,
    auth_router,
    account_router,
    profile_router,
    nutrition_router,
    foods_router,
    diary_router,
    weight_router,
    calibration_router,
    coaching_router,
    analytics_router,
    # admin
    admin_stats_router,
    users_admin_router,
    foods_admin_router,
    app_params_admin_router,
    legal_admin_router,
):
    app.include_router(r, prefix=api_v1)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "service": settings.APP_NAME, "env": settings.APP_ENV}
