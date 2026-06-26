"""Diary logging + daily summary (spec §4.6, §8)."""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_topics import DIARY_CHANGED
from app.core.events import publish
from app.modules.diary.models import DiaryEntry
from app.modules.diary.schemas import (
    DaySummary,
    DiaryAddIn,
    DiaryEntryOut,
    Nutrients,
    RemainingOut,
)
from app.modules.foods.models import Food
from app.modules.foods.service import FoodService
from app.modules.nutrition.service import NutritionService
from app.shared.exceptions import NotFoundError, ValidationError


def _nutrients_for(food: Food, grams: float) -> Nutrients:
    factor = grams / 100.0
    return Nutrients(
        kcal=round(food.kcal_100g * factor, 1),
        protein_g=round(food.protein_100g * factor, 1),
        fat_g=round(food.fat_100g * factor, 1),
        carb_g=round(food.carb_100g * factor, 1),
    )


class DiaryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.foods = FoodService(db)
        self.nutrition = NutritionService(db)

    async def _resolve_grams(self, food: Food, payload: DiaryAddIn) -> float:
        if payload.grams is not None:
            return payload.grams
        portion = next((p for p in food.portions if p.id == payload.portion_id), None)
        if portion is None:
            raise ValidationError("Unknown portion for this food")
        return portion.grams * payload.portion_count

    async def add(self, user_id: int, payload: DiaryAddIn) -> DiaryEntry:
        food = await self.foods.get(user_id, payload.food_id)
        grams = await self._resolve_grams(food, payload)
        entry = DiaryEntry(
            user_id=user_id,
            entry_date=payload.entry_date,
            meal=payload.meal,
            food_id=food.id,
            grams=grams,
            portion_id=payload.portion_id,
            portion_count=payload.portion_count,
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        publish(DIARY_CHANGED, user_id=user_id, entry_date=payload.entry_date)
        return entry

    async def add_batch(self, user_id: int, items: list[DiaryAddIn]) -> int:
        """Add several entries at once (e.g. logging a recipe) — one commit, one
        DIARY_CHANGED per affected day instead of per entry."""
        if not items:
            return 0
        dates: set[date] = set()
        for payload in items:
            food = await self.foods.get(user_id, payload.food_id)
            grams = await self._resolve_grams(food, payload)
            self.db.add(
                DiaryEntry(
                    user_id=user_id,
                    entry_date=payload.entry_date,
                    meal=payload.meal,
                    food_id=food.id,
                    grams=grams,
                    portion_id=payload.portion_id,
                    portion_count=payload.portion_count,
                )
            )
            dates.add(payload.entry_date)
        await self.db.commit()
        for d in dates:
            publish(DIARY_CHANGED, user_id=user_id, entry_date=d)
        return len(items)

    async def update(self, user_id: int, entry_id: int, grams: float) -> DiaryEntry:
        """Correct an entry's amount. Switches it to manual grams (drops any named
        portion link) so the new figure is exactly what the user typed."""
        entry = (
            await self.db.execute(
                select(DiaryEntry).where(
                    DiaryEntry.id == entry_id, DiaryEntry.user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if entry is None:
            raise NotFoundError("Diary entry not found")
        entry.grams = grams
        entry.portion_id = None
        entry.portion_count = None
        await self.db.commit()
        await self.db.refresh(entry)
        publish(DIARY_CHANGED, user_id=user_id, entry_date=entry.entry_date)
        return entry

    async def delete(self, user_id: int, entry_id: int) -> None:
        entry = (
            await self.db.execute(
                select(DiaryEntry).where(
                    DiaryEntry.id == entry_id, DiaryEntry.user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if entry is None:
            raise NotFoundError("Diary entry not found")
        entry_date = entry.entry_date
        await self.db.delete(entry)
        await self.db.commit()
        publish(DIARY_CHANGED, user_id=user_id, entry_date=entry_date)

    async def _entries_for(self, user_id: int, day: date) -> list[tuple[DiaryEntry, Food]]:
        stmt = (
            select(DiaryEntry, Food)
            .join(Food, Food.id == DiaryEntry.food_id)
            .where(DiaryEntry.user_id == user_id, DiaryEntry.entry_date == day)
            .order_by(DiaryEntry.created_at)
        )
        return list((await self.db.execute(stmt)).all())

    async def day_summary(self, user_id: int, day: date) -> DaySummary:
        rows = await self._entries_for(user_id, day)
        entries_out: list[DiaryEntryOut] = []
        tot_kcal = tot_p = tot_f = tot_c = 0.0
        for entry, food in rows:
            n = _nutrients_for(food, entry.grams)
            tot_kcal += n.kcal
            tot_p += n.protein_g
            tot_f += n.fat_g
            tot_c += n.carb_g
            entries_out.append(
                DiaryEntryOut(
                    id=entry.id,
                    entry_date=entry.entry_date,
                    meal=entry.meal,
                    food_id=food.id,
                    food_name=food.name,
                    grams=entry.grams,
                    nutrients=n,
                )
            )

        target_row, _ = await self.nutrition.get_or_recompute(user_id)
        eaten = Nutrients(
            kcal=round(tot_kcal, 1),
            protein_g=round(tot_p, 1),
            fat_g=round(tot_f, 1),
            carb_g=round(tot_c, 1),
        )
        target = RemainingOut(
            calories=target_row.target_calories,
            protein_g=target_row.protein_g,
            fat_g=target_row.fat_g,
            carb_g=target_row.carb_g,
        )
        remaining = RemainingOut(
            calories=round(target.calories - eaten.kcal, 1),
            protein_g=round(target.protein_g - eaten.protein_g, 1),
            fat_g=round(target.fat_g - eaten.fat_g, 1),
            carb_g=round(target.carb_g - eaten.carb_g, 1),
        )
        return DaySummary(
            entry_date=day, eaten=eaten, target=target, remaining=remaining, entries=entries_out
        )

    async def copy_day(self, user_id: int, src: date, dst: date) -> int:
        """Copy every entry from `src` to `dst` (quick-log: copy yesterday, §8.4)."""
        rows = await self._entries_for(user_id, src)
        for entry, _food in rows:
            self.db.add(
                DiaryEntry(
                    user_id=user_id,
                    entry_date=dst,
                    meal=entry.meal,
                    food_id=entry.food_id,
                    grams=entry.grams,
                    portion_id=entry.portion_id,
                    portion_count=entry.portion_count,
                )
            )
        await self.db.commit()
        publish(DIARY_CHANGED, user_id=user_id, entry_date=dst)
        return len(rows)

    async def daily_calories(
        self, user_id: int, start: date, end: date
    ) -> dict[date, float]:
        """Total kcal logged per day over [start, end] (used by calibration).

        Only days that actually have entries appear in the result — calibration
        uses that to detect logging gaps (§4.4 "degrades softly")."""
        stmt = (
            select(DiaryEntry, Food)
            .join(Food, Food.id == DiaryEntry.food_id)
            .where(
                DiaryEntry.user_id == user_id,
                DiaryEntry.entry_date >= start,
                DiaryEntry.entry_date <= end,
            )
        )
        totals: dict[date, float] = {}
        for entry, food in (await self.db.execute(stmt)).all():
            totals[entry.entry_date] = totals.get(entry.entry_date, 0.0) + _nutrients_for(
                food, entry.grams
            ).kcal
        return totals

    async def daily_totals(
        self, user_id: int, start: date, end: date
    ) -> dict[date, Nutrients]:
        """Full per-day nutrient totals over [start, end] (used by analytics).

        Only days with at least one entry appear — callers treat absent days as
        "not logged" rather than zero, so averages stay honest."""
        stmt = (
            select(DiaryEntry, Food)
            .join(Food, Food.id == DiaryEntry.food_id)
            .where(
                DiaryEntry.user_id == user_id,
                DiaryEntry.entry_date >= start,
                DiaryEntry.entry_date <= end,
            )
        )
        totals: dict[date, Nutrients] = {}
        for entry, food in (await self.db.execute(stmt)).all():
            n = _nutrients_for(food, entry.grams)
            cur = totals.get(entry.entry_date)
            if cur is None:
                totals[entry.entry_date] = Nutrients(
                    kcal=n.kcal, protein_g=n.protein_g, fat_g=n.fat_g, carb_g=n.carb_g
                )
            else:
                totals[entry.entry_date] = Nutrients(
                    kcal=round(cur.kcal + n.kcal, 1),
                    protein_g=round(cur.protein_g + n.protein_g, 1),
                    fat_g=round(cur.fat_g + n.fat_g, 1),
                    carb_g=round(cur.carb_g + n.carb_g, 1),
                )
        return totals

    async def recent_foods(self, user_id: int, days: int = 14, limit: int = 20) -> list[Food]:
        """Distinct recently-logged foods, newest first (quick-log, §8.4)."""
        since = date.today() - timedelta(days=days)
        stmt = (
            select(Food)
            .join(DiaryEntry, DiaryEntry.food_id == Food.id)
            .where(DiaryEntry.user_id == user_id, DiaryEntry.entry_date >= since)
            .order_by(DiaryEntry.created_at.desc())
        )
        seen: set[int] = set()
        out: list[Food] = []
        for food in (await self.db.execute(stmt)).scalars().all():
            if food.id in seen:
                continue
            seen.add(food.id)
            out.append(food)
            if len(out) >= limit:
                break
        return out
