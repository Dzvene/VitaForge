"""Integration test harness.

The whole app (request path AND the in-process event subscribers, which open
their own ``AsyncSessionLocal``) must talk to a throwaway database, never the
real one. We achieve that by pointing ``DATABASE_URL`` at a temp SQLite file
*before* importing anything under ``app`` — ``app.core.config`` reads the env at
import time and the engine is built from it, so both the request sessions and
the subscriber sessions bind to the test DB.

Schema is rebuilt before every test for isolation. A generous SQLite
``busy_timeout`` absorbs the brief write locks from the fire-and-forget
subscriber tasks (nutrition recompute / calibration open) so they never flake a
following request.
"""

import os
import tempfile

# ---- bind to a throwaway DB BEFORE importing the app ----
_TMP_DB = os.path.join(tempfile.gettempdir(), "vitaforge_test.sqlite3")
os.environ["APP_ENV"] = "test"
os.environ["APP_DEBUG"] = "false"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ["JWT_SECRET"] = "test-jwt-secret"
os.environ["SECRET_KEY"] = "test-secret-key"
# Pin push off regardless of a local .env (which may carry a real VAPID key) so
# the reminders tests see a deterministic "push not configured" baseline.
os.environ["VAPID_PRIVATE_KEY_B64"] = ""

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import event  # noqa: E402

from app.core import events as _events  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import engine  # noqa: E402
from app.main import app  # noqa: E402  (imports every model + subscriber)
from app.shared.base_model import Base  # noqa: E402

API = settings.API_V1_PREFIX

# The cross-slice subscribers (nutrition recompute / calibration open) are
# fire-and-forget async tasks dispatched onto the running loop. Under pytest the
# per-test loop closes before they settle, leaking "loop is closed" noise and
# contending for SQLite's single connection. They are an eager optimisation —
# every endpoint also recomputes lazily — so we silence them for the HTTP tests
# and exercise the handler logic directly in test_subscribers.py instead.
_events._subscribers.clear()


@event.listens_for(engine.sync_engine, "connect")
def _sqlite_pragmas(dbapi_conn, _record):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA busy_timeout=30000")
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


@pytest_asyncio.fixture(autouse=True)
async def _fresh_schema():
    # In-memory auth rate-limit counters are process-global; clear them so they
    # don't bleed across tests (every test logs in via fixtures).
    from app.core import email, ratelimit

    ratelimit.reset()
    email.reset_outbox()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=f"http://test{API}") as c:
        yield c


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def make_user(client):
    """Factory: register + login a user, returning {user, headers, tokens}.

    The first user created in a test is the owner/admin (spec §2); later ones
    are plain users. Tests that need both call this twice.
    """

    async def _make(email: str, password: str = "Sup3rSecret!", full_name: str | None = None):
        reg = await client.post(
            "/auth/register",
            json={"email": email, "password": password, "full_name": full_name},
        )
        assert reg.status_code == 201, reg.text
        user = reg.json()
        login = await client.post("/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200, login.text
        tokens = login.json()
        return {
            "user": user,
            "tokens": tokens,
            "headers": _auth(tokens["access_token"]),
        }

    return _make


@pytest_asyncio.fixture
async def admin(make_user):
    """The first user — owner/admin."""
    return await make_user("owner@vitaforge.app")


@pytest_asyncio.fixture
async def user(admin, make_user):
    """A plain (non-admin) user — created after the admin exists."""
    return await make_user("member@vitaforge.app")


# A complete, valid onboarding profile body for reuse.
PROFILE_BODY = {
    "sex": "male",
    "age": 30,
    "height_cm": 180,
    "current_weight_kg": 80,
    "activity_level": "moderate",
    "goal": "lose",
    "target_rate_kg_per_week": 0.5,
}
