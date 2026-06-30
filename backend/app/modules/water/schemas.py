from datetime import date

from app.shared.base_schema import APIModel


class WaterLogIn(APIModel):
    logged_on: date
    ml: int


class WaterLogOut(APIModel):
    id: int
    logged_on: date
    ml: int


class WaterDaySummary(APIModel):
    logged_on: date
    total_ml: int
    goal_ml: int
    logs: list[WaterLogOut]
