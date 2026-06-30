from datetime import date

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.modules.water.schemas import WaterDaySummary, WaterLogIn, WaterLogOut
from app.modules.water.service import WaterService

router = APIRouter(prefix="/water", tags=["water"])


@router.get("/{logged_on}", response_model=WaterDaySummary)
async def get_day(logged_on: date, user: CurrentUser, db: DbSession) -> WaterDaySummary:
    return await WaterService(db).day(user.id, logged_on)


@router.post("", response_model=WaterLogOut, status_code=status.HTTP_201_CREATED)
async def log_water(payload: WaterLogIn, user: CurrentUser, db: DbSession) -> WaterLogOut:
    return await WaterService(db).log(user.id, payload.logged_on, payload.ml)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_log(log_id: int, user: CurrentUser, db: DbSession) -> None:
    await WaterService(db).remove(user.id, log_id)
