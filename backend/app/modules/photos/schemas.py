from datetime import date

from app.shared.base_schema import APIModel


class PhotoOut(APIModel):
    id: int
    taken_on: date
    url: str
    weight_kg: float | None
    note: str | None
