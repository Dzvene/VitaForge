"""Diary schemas."""

from datetime import date
from typing import Literal

from pydantic import Field, model_validator

from app.shared.base_schema import APIModel

Meal = Literal["breakfast", "lunch", "dinner", "snack"]


class DiaryAddIn(APIModel):
    entry_date: date
    meal: Meal
    food_id: int
    # Provide either grams OR (portion_id + portion_count).
    grams: float | None = Field(default=None, gt=0, le=5000)
    portion_id: int | None = None
    portion_count: float | None = Field(default=None, gt=0, le=100)

    @model_validator(mode="after")
    def _one_quantity(self) -> "DiaryAddIn":
        has_grams = self.grams is not None
        has_portion = self.portion_id is not None and self.portion_count is not None
        if has_grams == has_portion:
            raise ValueError("provide either grams or (portion_id + portion_count)")
        return self


class Nutrients(APIModel):
    kcal: float
    protein_g: float
    fat_g: float
    carb_g: float


class DiaryEntryOut(APIModel):
    id: int
    entry_date: date
    meal: Meal
    food_id: int
    food_name: str
    grams: float
    nutrients: Nutrients


class RemainingOut(APIModel):
    """Target minus eaten, per the daily ring + 3 macro bars (§4.6)."""

    calories: float
    protein_g: float
    fat_g: float
    carb_g: float


class DaySummary(APIModel):
    entry_date: date
    eaten: Nutrients
    target: RemainingOut
    remaining: RemainingOut
    entries: list[DiaryEntryOut]
