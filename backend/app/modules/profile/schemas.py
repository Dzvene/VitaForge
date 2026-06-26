"""Profile schemas."""

from typing import Any, Literal

from pydantic import Field

from app.shared.base_schema import APIModel

Sex = Literal["male", "female"]
ActivityLevel = Literal["sedentary", "light", "moderate", "high", "very_high"]
GoalKind = Literal["lose", "maintain", "gain"]


class ProfileUpsert(APIModel):
    sex: Sex
    age: int = Field(ge=14, le=120)
    height_cm: float = Field(ge=120, le=250)
    current_weight_kg: float = Field(ge=30, le=400)
    activity_level: ActivityLevel
    goal: GoalKind = "maintain"
    target_rate_kg_per_week: float = Field(default=0.0, ge=0.0, le=2.0)
    target_weight_kg: float | None = Field(default=None, ge=30, le=400)

    protein_g_per_kg: float | None = Field(default=None, ge=0.5, le=4.0)
    protein_g_abs: float | None = Field(default=None, ge=20, le=400)
    fat_g_per_kg: float | None = Field(default=None, ge=0.3, le=3.0)

    param_overrides: dict[str, Any] | None = None


class ProfileOut(APIModel):
    id: int
    user_id: int
    sex: Sex
    age: int
    height_cm: float
    current_weight_kg: float
    activity_level: ActivityLevel
    goal: GoalKind
    target_rate_kg_per_week: float
    target_weight_kg: float | None
    protein_g_per_kg: float | None
    protein_g_abs: float | None
    fat_g_per_kg: float | None
    param_overrides: dict[str, Any] | None
