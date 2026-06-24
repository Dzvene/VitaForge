"""App-config schemas."""

from typing import Any

from app.shared.base_schema import APIModel


class ParamsView(APIModel):
    """What the admin UI shows: the effective values + the raw app-level overrides."""

    effective: dict[str, Any]   # full resolved Params (defaults + app overrides)
    overrides: dict[str, Any]   # only the app-level overrides currently set


class ParamsUpdate(APIModel):
    overrides: dict[str, Any]   # whitelisted keys; unknown keys ignored
