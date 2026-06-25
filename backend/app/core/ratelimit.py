"""In-memory sliding-window rate limiter for auth endpoints.

The backend runs a single uvicorn worker (see Dockerfile), so a process-local
store is sufficient and avoids a Redis dependency. If the deployment ever scales
to multiple workers this must move to a shared store (Redis) — until then a dict
of per-(scope, ip) timestamps is correct and cheap.

Used as a FastAPI dependency:

    @router.post("/login", dependencies=[Depends(login_rate_limit)])
"""

import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.i18n import tr
from app.shared.exceptions import TooManyRequestsError

# (scope, client_ip) -> monotonic timestamps of recent hits.
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def reset() -> None:
    """Clear all counters (tests call this between cases)."""
    _hits.clear()


def _client_ip(request: Request) -> str:
    # Behind nginx the real IP is in X-Forwarded-For (first hop); fall back to the
    # socket peer, then a constant so a missing client (ASGI tests) still buckets.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """Allow at most ``max_hits`` requests per ``window_seconds`` per client IP."""

    def __init__(self, scope: str, max_hits: int, window_seconds: int):
        self.scope = scope
        self.max_hits = max_hits
        self.window = window_seconds

    async def __call__(self, request: Request) -> None:
        key = (self.scope, _client_ip(request))
        now = time.monotonic()
        hits = _hits[key]
        cutoff = now - self.window
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if len(hits) >= self.max_hits:
            retry_after = max(1, int(hits[0] + self.window - now))
            raise TooManyRequestsError(tr("error.too_many_requests"), retry_after=retry_after)
        hits.append(now)
