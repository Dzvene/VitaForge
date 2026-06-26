"""Native push delivery — APNs (iOS) and FCM (Android).

Both channels are gated behind credentials, exactly like the web-push VAPID
sender and the email backend: with no APNs key / FCM service account configured,
the senders return ``"disabled"`` and nothing else is affected. Senders are
async (httpx). APNs requires HTTP/2; FCM HTTP v1 needs a short-lived OAuth token
minted from the service account (no google-auth dependency — we sign the JWT
with python-jose and exchange it).
"""

import base64
import contextlib
import json
import logging
import time
from functools import lru_cache
from typing import Literal

import httpx

from app.core.config import settings

_log = logging.getLogger(__name__)

SendResult = Literal["ok", "gone", "error", "disabled"]

_APNS_PROD = "https://api.push.apple.com"
_APNS_SANDBOX = "https://api.sandbox.push.apple.com"
_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 (public endpoint)

# Small in-process caches for the provider auth tokens (both valid ~1h).
_apns_jwt: dict = {"token": None, "exp": 0.0}
_fcm_oauth: dict = {"token": None, "exp": 0.0}


# ---------------- APNs ----------------

def _apns_pem() -> bytes | None:
    if not settings.APNS_PRIVATE_KEY_B64:
        return None
    try:
        return base64.b64decode(settings.APNS_PRIVATE_KEY_B64)
    except Exception:
        _log.error("APNS_PRIVATE_KEY_B64 is not valid base64 — iOS push disabled")
        return None


def _apns_token(now: float) -> str | None:
    if _apns_jwt["token"] and now < _apns_jwt["exp"]:
        return _apns_jwt["token"]
    pem = _apns_pem()
    if pem is None or not (settings.APNS_KEY_ID and settings.APNS_TEAM_ID):
        return None
    try:
        from jose import jwt

        token = jwt.encode(
            {"iss": settings.APNS_TEAM_ID, "iat": int(now)},
            pem.decode(),
            algorithm="ES256",
            headers={"kid": settings.APNS_KEY_ID},
        )
    except Exception:
        _log.exception("failed to mint APNs JWT")
        return None
    _apns_jwt["token"] = token
    _apns_jwt["exp"] = now + 3000  # refresh well within the 60-minute limit
    return token


async def _send_apns(token: str, payload: dict) -> SendResult:
    now = time.time()
    jwt_token = _apns_token(now)
    if jwt_token is None:
        return "disabled"
    base = _APNS_SANDBOX if settings.APNS_USE_SANDBOX else _APNS_PROD
    body = {
        "aps": {"alert": {"title": payload["title"], "body": payload["body"]}, "sound": "default"},
        "url": payload.get("url", "/"),
    }
    headers = {
        "authorization": f"bearer {jwt_token}",
        "apns-topic": settings.APNS_BUNDLE_ID,
        "apns-push-type": "alert",
    }
    try:
        async with httpx.AsyncClient(http2=True, timeout=10) as client:
            resp = await client.post(f"{base}/3/device/{token}", json=body, headers=headers)
    except Exception:
        _log.exception("APNs request failed")
        return "error"

    if resp.status_code == 200:
        return "ok"
    reason = ""
    with contextlib.suppress(Exception):
        reason = resp.json().get("reason", "")
    if resp.status_code == 410 or reason in ("Unregistered", "BadDeviceToken"):
        return "gone"
    _log.warning("APNs error %s: %s", resp.status_code, reason)
    return "error"


# ---------------- FCM ----------------

@lru_cache(maxsize=1)
def _fcm_sa() -> dict | None:
    if not settings.FCM_SERVICE_ACCOUNT_B64:
        return None
    try:
        return json.loads(base64.b64decode(settings.FCM_SERVICE_ACCOUNT_B64))
    except Exception:
        _log.error("FCM_SERVICE_ACCOUNT_B64 is not valid base64 JSON — Android push disabled")
        return None


async def _fcm_access_token(now: float) -> str | None:
    if _fcm_oauth["token"] and now < _fcm_oauth["exp"]:
        return _fcm_oauth["token"]
    sa = _fcm_sa()
    if sa is None:
        return None
    try:
        from jose import jwt

        assertion = jwt.encode(
            {
                "iss": sa["client_email"],
                "scope": "https://www.googleapis.com/auth/firebase.messaging",
                "aud": _OAUTH_TOKEN_URL,
                "iat": int(now),
                "exp": int(now) + 3600,
            },
            sa["private_key"],
            algorithm="RS256",
        )
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                _OAUTH_TOKEN_URL,
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
            )
    except Exception:
        _log.exception("FCM OAuth token mint failed")
        return None
    if resp.status_code != 200:
        _log.warning("FCM OAuth token mint returned %s", resp.status_code)
        return None
    token = resp.json().get("access_token")
    _fcm_oauth["token"] = token
    _fcm_oauth["exp"] = now + 3000
    return token


async def _send_fcm(token: str, payload: dict) -> SendResult:
    sa = _fcm_sa()
    if sa is None:
        return "disabled"
    project_id = sa.get("project_id")
    if not project_id:
        return "disabled"
    access = await _fcm_access_token(time.time())
    if access is None:
        return "error"
    body = {
        "message": {
            "token": token,
            "notification": {"title": payload["title"], "body": payload["body"]},
            "data": {"url": payload.get("url", "/")},
        }
    }
    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=body, headers={"Authorization": f"Bearer {access}"})
    except Exception:
        _log.exception("FCM request failed")
        return "error"

    if resp.status_code == 200:
        return "ok"
    status = ""
    with contextlib.suppress(Exception):
        status = resp.json().get("error", {}).get("status", "")
    if resp.status_code in (404, 410) or status in ("UNREGISTERED", "NOT_FOUND"):
        return "gone"
    _log.warning("FCM error %s: %s", resp.status_code, status)
    return "error"


# ---------------- dispatch ----------------

async def send_to_device(platform: str, token: str, payload: dict) -> SendResult:
    """Deliver one notification to a native device token. `payload` is the
    notifications.build() dict (title/body/url)."""
    if platform == "ios":
        return await _send_apns(token, payload)
    if platform == "android":
        return await _send_fcm(token, payload)
    return "error"
