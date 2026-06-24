"""Food schemas."""

from pydantic import Field

from app.shared.base_schema import APIModel


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


class FoodCreate(APIModel):
    name: str = Field(min_length=1, max_length=512)
    brand: str | None = Field(default=None, max_length=255)
    barcode: str | None = Field(default=None, max_length=32)
    kcal_100g: float = Field(ge=0, le=900)
    protein_100g: float = Field(default=0.0, ge=0, le=100)
    fat_100g: float = Field(default=0.0, ge=0, le=100)
    carb_100g: float = Field(default=0.0, ge=0, le=100)
    portions: list[PortionIn] = []
