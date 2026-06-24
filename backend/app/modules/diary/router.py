"""Diary endpoints."""

from datetime import date

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.modules.diary.schemas import DaySummary, DiaryAddIn, DiaryEntryOut
from app.modules.diary.service import DiaryService
from app.modules.foods.schemas import FoodOut

router = APIRouter(prefix="/diary", tags=["diary"])


@router.post("", response_model=DiaryEntryOut, status_code=status.HTTP_201_CREATED)
async def add_entry(payload: DiaryAddIn, user: CurrentUser, db: DbSession) -> DiaryEntryOut:
    await DiaryService(db).add(user.id, payload)
    # Return the freshly-summarised day's matching entry would be heavier; the
    # day summary endpoint is the canonical read. Re-fetch the day for the row.
    summary = await DiaryService(db).day_summary(user.id, payload.entry_date)
    return summary.entries[-1]


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(entry_id: int, user: CurrentUser, db: DbSession) -> None:
    await DiaryService(db).delete(user.id, entry_id)


@router.get("/recent-foods", response_model=list[FoodOut])
async def recent_foods(user: CurrentUser, db: DbSession) -> list[FoodOut]:
    foods = await DiaryService(db).recent_foods(user.id)
    return [FoodOut.model_validate(f) for f in foods]


@router.post("/copy", status_code=status.HTTP_200_OK)
async def copy_day(src: date, dst: date, user: CurrentUser, db: DbSession) -> dict:
    n = await DiaryService(db).copy_day(user.id, src, dst)
    return {"copied": n}


@router.get("/{day}", response_model=DaySummary)
async def day_summary(day: date, user: CurrentUser, db: DbSession) -> DaySummary:
    return await DiaryService(db).day_summary(user.id, day)
