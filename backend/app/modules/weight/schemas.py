"""Weight schemas."""

from datetime import date

from pydantic import Field

from app.shared.base_schema import APIModel


class WeightLogIn(APIModel):
    logged_on: date
    weight_kg: float = Field(ge=30, le=400)


class WeightPoint(APIModel):
    logged_on: date
    weight_kg: float       # raw measurement
    trend_kg: float        # smoothed EMA trend (§4.3)


class WeightSeries(APIModel):
    points: list[WeightPoint]
    latest_trend_kg: float | None = None
