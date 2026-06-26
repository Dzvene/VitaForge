"""Recipe schemas."""

from datetime import date
from typing import Literal

from pydantic import Field

from app.modules.diary.schemas import Nutrients
from app.shared.base_schema import APIModel

Meal = Literal["breakfast", "lunch", "dinner", "snack"]


class RecipeComponentIn(APIModel):
    food_id: int
    grams: float = Field(gt=0, le=5000)


class RecipeCreate(APIModel):
    name: str = Field(min_length=1, max_length=255)
    components: list[RecipeComponentIn] = Field(default_factory=list)


class RecipeComponentOut(APIModel):
    food_id: int
    food_name: str
    grams: float
    nutrients: Nutrients


class RecipeOut(APIModel):
    id: int
    name: str
    totals: Nutrients
    components: list[RecipeComponentOut]


class RecipeLogIn(APIModel):
    entry_date: date
    meal: Meal
