"""Weight logging + trend computation."""

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_topics import WEIGHT_LOGGED
from app.core.events import publish
from app.core.nutrition_math import trend_series
from app.core.params import Params
from app.modules.weight.models import WeightLog
from app.modules.weight.schemas import WeightLogIn, WeightPoint, WeightSeries
from app.shared.exceptions import NotFoundError


class WeightService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(self, user_id: int, payload: WeightLogIn) -> WeightLog:
        """Upsert one measurement per day (re-logging the same day overwrites)."""
        existing = (
            await self.db.execute(
                select(WeightLog).where(
                    WeightLog.user_id == user_id, WeightLog.logged_on == payload.logged_on
                )
            )
        ).scalar_one_or_none()
        if existing is None:
            existing = WeightLog(
                user_id=user_id, logged_on=payload.logged_on, weight_kg=payload.weight_kg
            )
            self.db.add(existing)
        else:
            existing.weight_kg = payload.weight_kg
        await self.db.commit()
        await self.db.refresh(existing)
        publish(WEIGHT_LOGGED, user_id=user_id, logged_on=payload.logged_on)
        return existing

    async def delete(self, user_id: int, log_id: int) -> None:
        """Remove a single weigh-in (e.g. a typo). The trend + calibration
        recompute off the remaining points."""
        log = (
            await self.db.execute(
                select(WeightLog).where(WeightLog.id == log_id, WeightLog.user_id == user_id)
            )
        ).scalar_one_or_none()
        if log is None:
            raise NotFoundError("Weight entry not found")
        logged_on = log.logged_on
        await self.db.delete(log)
        await self.db.commit()
        publish(WEIGHT_LOGGED, user_id=user_id, logged_on=logged_on)

    async def raw_logs(
        self, user_id: int, since: date | None = None, until: date | None = None
    ) -> list[WeightLog]:
        q = select(WeightLog).where(WeightLog.user_id == user_id)
        if since is not None:
            q = q.where(WeightLog.logged_on >= since)
        if until is not None:
            q = q.where(WeightLog.logged_on <= until)
        return list((await self.db.execute(q.order_by(WeightLog.logged_on))).scalars().all())

    async def series(self, user_id: int, params: Params) -> WeightSeries:
        logs = await self.raw_logs(user_id)
        trends = trend_series([log.weight_kg for log in logs], params.trend_alpha)
        points = [
            WeightPoint(
                id=log.id, logged_on=log.logged_on, weight_kg=log.weight_kg, trend_kg=round(t, 2)
            )
            for log, t in zip(logs, trends, strict=True)
        ]
        return WeightSeries(points=points, latest_trend_kg=points[-1].trend_kg if points else None)
