"""Request/response schemas for the public preview slice.

Self-contained (the slice is a tach leaf): it re-declares the small input/output
shapes it needs rather than importing other slices' schemas, so it never grows a
cross-slice edge. Output shapes mirror the authenticated equivalents
(`nutrition.TargetOut`, `weight.WeightSeries`, `calibration.EstimateResult`) so
the frontend can reuse the same TypeScript types.
"""

from datetime import date
from typing import Literal

from pydantic import Field

from app.shared.base_schema import APIModel

Sex = Literal["male", "female"]
ActivityLevel = Literal["sedentary", "light", "moderate", "high", "very_high"]
GoalKind = Literal["lose", "maintain", "gain"]


class ProfileInputs(APIModel):
    """The same fields onboarding collects — no identity, no persistence."""

    sex: Sex
    age: int = Field(ge=14, le=120)
    height_cm: float = Field(ge=120, le=250)
    current_weight_kg: float = Field(ge=30, le=400)
    activity_level: ActivityLevel
    goal: GoalKind = "maintain"
    target_rate_kg_per_week: float = Field(default=0.0, ge=0.0, le=2.0)
    protein_g_per_kg: float | None = Field(default=None, ge=0.5, le=4.0)
    protein_g_abs: float | None = Field(default=None, ge=20, le=400)
    fat_g_per_kg: float | None = Field(default=None, ge=0.3, le=3.0)


class NutritionPreviewIn(APIModel):
    profile: ProfileInputs
    # If the guest has already "calibrated" locally, pass the real maintenance
    # figure to switch from the hold-at-maintenance baseline to the goal target.
    maintenance_kcal: float | None = Field(default=None, ge=500, le=8000)


class TargetOut(APIModel):
    target_calories: float
    protein_g: float
    fat_g: float
    carb_g: float
    maintenance_kcal: float
    maintenance_source: Literal["formula", "calibrated"]
    calibrated: bool
    rate_clamped: bool


class WeightPointIn(APIModel):
    logged_on: date
    weight_kg: float = Field(gt=0, le=500)


class WeightTrendIn(APIModel):
    points: list[WeightPointIn] = []


class WeightPointOut(APIModel):
    logged_on: date
    weight_kg: float
    trend_kg: float


class WeightSeriesOut(APIModel):
    points: list[WeightPointOut]
    latest_trend_kg: float | None


class DailyIntakeIn(APIModel):
    day: date
    kcal: float = Field(ge=0, le=30000)


class CalibrationPreviewIn(APIModel):
    weights: list[WeightPointIn] = []
    intake: list[DailyIntakeIn] = []


class EstimateResult(APIModel):
    ok: bool
    reason: str | None = None
    real_tdee: float | None = None
    avg_daily_intake: float | None = None
    trend_change_kg: float | None = None
    days: int | None = None
