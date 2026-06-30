from datetime import date

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.water.models import WaterLog
from app.modules.water.schemas import WaterDaySummary, WaterLogOut
from app.shared.exceptions import NotFoundError

DEFAULT_GOAL_ML = 2000


class WaterService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def day(self, user_id: int, logged_on: date) -> WaterDaySummary:
        rows = (
            await self.db.scalars(
                select(WaterLog)
                .where(WaterLog.user_id == user_id, WaterLog.logged_on == logged_on)
                .order_by(WaterLog.id)
            )
        ).all()
        total = sum(r.ml for r in rows)
        return WaterDaySummary(
            logged_on=logged_on,
            total_ml=total,
            goal_ml=DEFAULT_GOAL_ML,
            logs=[WaterLogOut(id=r.id, logged_on=r.logged_on, ml=r.ml) for r in rows],
        )

    async def log(self, user_id: int, logged_on: date, ml: int) -> WaterLogOut:
        entry = WaterLog(user_id=user_id, logged_on=logged_on, ml=ml)
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return WaterLogOut(id=entry.id, logged_on=entry.logged_on, ml=entry.ml)

    async def remove(self, user_id: int, log_id: int) -> None:
        row = await self.db.get(WaterLog, log_id)
        if row is None or row.user_id != user_id:
            raise NotFoundError("Water log not found")
        await self.db.delete(row)
        await self.db.commit()
