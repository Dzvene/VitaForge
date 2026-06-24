"""Async SQLAlchemy engine and session factory."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# SQLite (used by the test harness) runs on a NullPool and rejects the
# queue-pool sizing kwargs, so only pass them for real server databases.
_engine_kwargs: dict = {"echo": settings.APP_DEBUG}
if not settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs |= {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an AsyncSession."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
