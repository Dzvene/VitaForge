"""Trends / insights endpoint — weekly & monthly rollups."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.analytics.schemas import TrendsOut
from app.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/trends", response_model=TrendsOut)
async def trends(user: CurrentUser, db: DbSession) -> TrendsOut:
    """Weekly & monthly averages (kcal/macros), logging adherence, on-target
    days, weight rate, pace vs plan, and a 30-day intake series for the chart."""
    return await AnalyticsService(db).trends(user.id)
