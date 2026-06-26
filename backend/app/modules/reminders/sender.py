"""Web Push delivery over VAPID.

A single EC P-256 private key (PEM, base64'd in `VAPID_PRIVATE_KEY_B64`) is the
source of truth: the browser-facing application server key is derived from it, so
the two can never drift. `send_push` is synchronous (pywebpush uses `requests`),
so the scheduler calls it via `asyncio.to_thread`.
"""

import base64
import logging
from functools import lru_cache
from typing import Literal

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from app.core.config import settings

_log = logging.getLogger(__name__)

SendResult = Literal["ok", "gone", "error", "disabled"]


def _pem_bytes() -> bytes | None:
    if not settings.VAPID_PRIVATE_KEY_B64:
        return None
    try:
        return base64.b64decode(settings.VAPID_PRIVATE_KEY_B64)
    except Exception:
        _log.error("VAPID_PRIVATE_KEY_B64 is not valid base64 — push disabled")
        return None


@lru_cache(maxsize=1)
def application_server_key() -> str:
    """Browser-facing VAPID public key (base64url, uncompressed point), or ''."""
    pem = _pem_bytes()
    if pem is None:
        return ""
    try:
        priv = serialization.load_pem_private_key(pem, password=None)
        raw = priv.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()
    except Exception:
        _log.exception("failed to derive VAPID application server key")
        return ""


@lru_cache(maxsize=1)
def _vapid():
    pem = _pem_bytes()
    if pem is None:
        return None
    try:
        from py_vapid import Vapid

        return Vapid.from_pem(pem)
    except Exception:
        _log.exception("failed to load VAPID key")
        return None


def send_push(subscription_info: dict, payload_json: str) -> SendResult:
    """Deliver one encrypted push. Returns a coarse status the caller acts on:

    - ``gone``   → the subscription is dead (404/410); caller should delete it.
    - ``ok``     → accepted by the push service.
    - ``error``  → transient/unknown failure; leave the subscription in place.
    - ``disabled`` → no VAPID key configured.
    """
    vapid = _vapid()
    if vapid is None:
        return "disabled"
    try:
        from pywebpush import webpush

        webpush(
            subscription_info=subscription_info,
            data=payload_json,
            vapid_private_key=vapid,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
            ttl=600,
        )
        return "ok"
    except Exception as exc:  # noqa: BLE001 — pywebpush raises WebPushException
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status in (404, 410):
            return "gone"
        _log.warning("web push send failed (status=%s): %s", status, exc)
        return "error"
