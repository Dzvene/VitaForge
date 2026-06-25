"""Food schemas."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import Field

from app.shared.base_schema import APIModel

if TYPE_CHECKING:
    from app.modules.foods.models import Food


class PortionIn(APIModel):
    name: str = Field(min_length=1, max_length=64)
    grams: float = Field(gt=0, le=5000)


class PortionOut(PortionIn):
    id: int


class FoodOut(APIModel):
    id: int
    source: str
    barcode: str | None
    name: str
    brand: str | None
    kcal_100g: float
    protein_100g: float
    fat_100g: float
    carb_100g: float
    portions: list[PortionOut] = []

    @classmethod
    def localized(cls, food: "Food", locale: str) -> "FoodOut":
        """Serialize a Food, showing the curated RU/DE name when present so the
        diary reads in the user's language; falls back to the canonical name."""
        out = cls.model_validate(food)
        if locale == "ru" and food.name_ru:
            return out.model_copy(update={"name": food.name_ru})
        if locale == "de" and food.name_de:
            return out.model_copy(update={"name": food.name_de})
        return out


class FoodCreate(APIModel):
    name: str = Field(min_length=1, max_length=512)
    brand: str | None = Field(default=None, max_length=255)
    barcode: str | None = Field(default=None, max_length=32)
    kcal_100g: float = Field(ge=0, le=900)
    protein_100g: float = Field(default=0.0, ge=0, le=100)
    fat_100g: float = Field(default=0.0, ge=0, le=100)
    carb_100g: float = Field(default=0.0, ge=0, le=100)
    portions: list[PortionIn] = []
