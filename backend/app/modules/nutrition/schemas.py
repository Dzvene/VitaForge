"""Nutrition (Norm/Target) schemas."""

from app.shared.base_schema import APIModel


class TargetOut(APIModel):
    target_calories: float
    protein_g: float
    fat_g: float
    carb_g: float
    maintenance_kcal: float
    maintenance_source: str   # formula | calibrated
    calibrated: bool
    # True while the requested loss rate was clamped to the §9 safety rail.
    rate_clamped: bool = False
