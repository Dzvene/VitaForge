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


class ConfigOut(BaseModel):
    # Browser-facing VAPID application server key (base64url), empty if push is
    # not configured on the server.
    vapid_public_key: str
    push_enabled: bool
    prefs: PrefsOut
    # How many active push subscriptions this account has registered.
    subscriptions: int
