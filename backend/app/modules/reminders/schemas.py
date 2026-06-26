"""Reminder API schemas."""

import re

from pydantic import BaseModel, Field, field_validator

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_LOCALES = {"en", "ru", "de"}


class PrefsIn(BaseModel):
    enabled: bool = False
    timezone: str = Field(default="UTC", max_length=64)
    locale: str = "en"
    weigh_in_enabled: bool = True
    weigh_in_time: str = "08:00"
    log_meals_enabled: bool = True
    log_meals_time: str = "20:00"

    @field_validator("weigh_in_time", "log_meals_time")
    @classmethod
    def _valid_time(cls, v: str) -> str:
        if not _TIME_RE.match(v):
            raise ValueError("time must be HH:MM (24h)")
        return v

    @field_validator("locale")
    @classmethod
    def _valid_locale(cls, v: str) -> str:
        return v if v in _LOCALES else "en"


class PrefsOut(PrefsIn):
    pass


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionIn(BaseModel):
    """Shape of a `PushSubscription.toJSON()` from the browser."""

    endpoint: str
    keys: SubscriptionKeys


class DeviceRegisterIn(BaseModel):
    """A native app registering its push token (APNs/FCM)."""

    platform: str  # "ios" | "android"
    token: str = Field(min_length=1, max_length=4096)

    @field_validator("platform")
    @classmethod
    def _valid_platform(cls, v: str) -> str:
        if v not in {"ios", "android"}:
            raise ValueError("platform must be 'ios' or 'android'")
        return v


class ConfigOut(BaseModel):
    # Browser-facing VAPID application server key (base64url), empty if push is
    # not configured on the server.
    vapid_public_key: str
    push_enabled: bool
    # True when at least one native channel (APNs/FCM) is configured server-side.
    native_push_enabled: bool = False
    prefs: PrefsOut
    # How many active browser push subscriptions this account has registered.
    subscriptions: int
    # How many native device tokens (iOS/Android apps) are registered.
    devices: int = 0
