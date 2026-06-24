"""Coaching endpoints."""

from datetime import date

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.modules.coaching.schemas import DayGuidanceOut, HintOut, WarningOut
from app.modules.coaching.service import CoachingService

router = APIRouter(prefix="/coaching", tags=["coaching"])


@router.get("/hints", response_model=list[HintOut])
async def hints(user: CurrentUser, db: DbSession) -> list[HintOut]:
    return CoachingService(db).hints()


@router.get("/warnings", response_model=list[WarningOut])
async def warnings(user: CurrentUser, db: DbSession) -> list[WarningOut]:
    return await CoachingService(db).current_warnings(user)


@router.post("/warnings/{wtype}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_warning(wtype: str, user: CurrentUser, db: DbSession) -> None:
    await CoachingService(db).accept(user.id, wtype)


@router.post("/warnings/{wtype}/dismiss", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_warning(wtype: str, user: CurrentUser, db: DbSession) -> None:
    await CoachingService(db).dismiss(user.id, wtype)


@router.get("/day-guidance/{day}", response_model=DayGuidanceOut)
async def day_guidance(day: date, user: CurrentUser, db: DbSession) -> DayGuidanceOut:
    return await CoachingService(db).day_guidance(user.id, day)
