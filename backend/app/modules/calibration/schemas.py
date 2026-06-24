"""Calibration schemas."""

from datetime import date

from app.shared.base_schema import APIModel


class CalibrationStatusOut(APIModel):
    phase: str                       # calibrating | completed
    started_on: date
    window_days: int                 # configured minimum window (§6)
    clean_days_collected: int        # days with BOTH a food log and a weigh-in
    days_remaining: int              # until the window can first be evaluated
    ready_to_estimate: bool
    last_real_tdee: float | None


class EstimateResult(APIModel):
    """Outcome of running (or attempting) a real-TDEE estimate."""

    ok: bool
    reason: str | None = None        # why it could not estimate yet, if not ok
    real_tdee: float | None = None
    avg_daily_intake: float | None = None
    trend_change_kg: float | None = None
    days: int | None = None
    target_calories: float | None = None
