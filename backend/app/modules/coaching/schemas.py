"""Coaching schemas."""

from app.shared.base_schema import APIModel


class HintOut(APIModel):
    key: str
    title: str
    body: str


class WarningOut(APIModel):
    type: str
    title: str
    message: str
    # False once it has de-escalated (experience/accepts) or been muted — UI may
    # keep it in help only (§5.2).
    auto_show: bool = True


class GuidanceItem(APIModel):
    kind: str       # protein_low | fat_high | carb_room | on_track | overage
    message: str


class DayGuidanceOut(APIModel):
    """In-day macro navigation (§5.3) + no-blame overage note (§5.4)."""

    items: list[GuidanceItem]
