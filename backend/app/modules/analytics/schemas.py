"""Analytics / trends schemas."""

from datetime import date

from app.shared.base_schema import APIModel


class MacroAverages(APIModel):
    kcal: float
    protein_g: float
    fat_g: float
    carb_g: float


class PeriodSummary(APIModel):
    range: str  # "week" | "month"
    start: date
    end: date
    days_total: int
    days_logged: int
    logging_adherence_pct: float  # days_logged / days_total
    avg: MacroAverages | None  # mean over logged days; None when nothing logged
    on_target_days: int  # logged days within tolerance of the kcal target
    on_target_pct: float | None  # of logged days
    avg_kcal_delta: float | None  # avg kcal minus target kcal (signed)
    weight_change_kg: float | None  # trend change across the window
    weekly_rate_kg: float | None  # normalized to kg / week


class IntakePoint(APIModel):
    day: date
    logged: bool
    kcal: float | None = None
    protein_g: float | None = None


class PaceOut(APIModel):
    goal: str  # lose | gain | maintain
    target_rate_kg_per_week: float  # signed (negative = losing)
    actual_rate_kg_per_week: float | None  # signed, from the month trend
    on_pace_pct: float | None  # actual / target, when a target rate is set


class GoalOut(APIModel):
    # no_target | no_data | reached | on_track | off_track | stalled
    status: str
    target_weight_kg: float | None
    start_weight_kg: float | None  # earliest weight trend point (journey start)
    current_weight_kg: float | None  # latest weight trend point
    remaining_kg: float | None  # absolute amount still to go toward the target
    progress_pct: float | None  # 0–100, journey start → target
    eta_weeks: float | None
    eta_date: date | None


class TrendsOut(APIModel):
    target_kcal: float
    target_protein_g: float
    target_fat_g: float
    target_carb_g: float
    week: PeriodSummary
    month: PeriodSummary
    daily: list[IntakePoint]  # last 30 days, oldest → newest (for the chart)
    pace: PaceOut | None
    goal: GoalOut
