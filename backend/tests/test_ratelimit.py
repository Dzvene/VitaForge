"""Auth brute-force rate limiting (in-memory, per client IP)."""

from app.core import ratelimit
from app.core.config import settings


async def test_login_rate_limited_after_burst(client, admin):
    ratelimit.reset()
    # The `admin` fixture already performed one successful login; keep hammering
    # with a wrong password from the same IP until the limiter trips.
    saw_429 = False
    for _ in range(settings.LOGIN_RATE_LIMIT + 5):
        r = await client.post(
            "/auth/login", json={"email": "owner@vitaforge.app", "password": "wrongpass123"}
        )
        if r.status_code == 429:
            saw_429 = True
            assert "Retry-After" in r.headers
            break
        assert r.status_code == 401
    assert saw_429, "login was never rate-limited"


async def test_rate_limit_reset_lets_requests_through(client, admin):
    # After a reset (fresh window) the next login attempt is evaluated normally.
    ratelimit.reset()
    r = await client.post(
        "/auth/login", json={"email": "owner@vitaforge.app", "password": "Sup3rSecret!"}
    )
    assert r.status_code == 200


async def test_register_is_rate_limited(client):
    ratelimit.reset()
    saw_429 = False
    for i in range(settings.REGISTER_RATE_LIMIT + 3):
        r = await client.post(
            "/auth/register", json={"email": f"rl{i}@vitaforge.app", "password": "Sup3rSecret!"}
        )
        if r.status_code == 429:
            saw_429 = True
            break
    assert saw_429, "register was never rate-limited"
