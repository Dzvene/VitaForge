"""Trends aggregation over diary + weight (read-only, derived)."""

from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.schemas import (
    IntakePoint,
    MacroAverages,
    PaceOut,
    PeriodSummary,
    TrendsOut,
)
from app.modules.diary.schemas import Nutrients
from app.modules.diary.service import DiaryService
from app.modules.nutrition.service import NutritionService
from app.modules.profile.service import ProfileService
from app.modules.weight.service import WeightService

# A logged day counts as "on target" when its kcal lands within this fraction of
# the kcal target. Display-only threshold — generous on purpose (one day's intake
# is noisy; the point is the pattern, not perfection).
ON_TARGET_TOLERANCE = 0.10
_MONTH_DAYS = 30
_WEEK_DAYS = 7


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.diary = DiaryService(db)
        self.weight = WeightService(db)
        self.nutrition = NutritionService(db)
        self.profiles = ProfileService(db)

    async def trends(self, user_id: int, today: date | None = None) -> TrendsOut:
        today = today or date.today()
        target_row, _ = await self.nutrition.get_or_recompute(user_id)
        params = await self.profiles.effective_params(user_id)
        profile = await self.profiles.get_or_404(user_id)
        series = await self.weight.series(user_id, params)
        weight_points = [(p.logged_on, p.trend_kg) for p in series.points]

        month_start = today - timedelta(days=_MONTH_DAYS - 1)
        totals = await self.diary.daily_totals(user_id, month_start, today)

        daily: list[IntakePoint] = []
        for i in range(_MONTH_DAYS):
            d = month_start + timedelta(days=i)
            n = totals.get(d)
            daily.append(
                IntakePoint(
                    day=d,
                    logged=n is not None,
                    kcal=n.kcal if n else None,
                    protein_g=n.protein_g if n else None,
                )
            )

        week = self._period(
            "week", today - timedelta(days=_WEEK_DAYS - 1), today, totals,
            target_row.target_calories, weight_points,
        )
        month = self._period(
            "month", month_start, today, totals,
            target_row.target_calories, weight_points,
        )
        return TrendsOut(
            target_kcal=target_row.target_calories,
            target_protein_g=target_row.protein_g,
            target_fat_g=target_row.fat_g,
            target_carb_g=target_row.carb_g,
            week=week,
            month=month,
            daily=daily,
            pace=self._pace(profile, month.weekly_rate_kg),
        )

    def _period(
        self,
        rng: str,
        start: date,
        end: date,
        totals: dict[date, Nutrients],
        target_kcal: float,
        weight_points: list[tuple[date, float]],
    ) -> PeriodSummary:
        days_total = (end - start).days + 1
        logged = [n for d, n in totals.items() if start <= d <= end]
        days_logged = len(logged)

        avg: MacroAverages | None = None
        on_target_days = 0
        on_target_pct: float | None = None
        avg_kcal_delta: float | None = None
        if days_logged:
            avg = MacroAverages(
                kcal=round(sum(n.kcal for n in logged) / days_logged, 1),
                protein_g=round(sum(n.protein_g for n in logged) / days_logged, 1),
                fat_g=round(sum(n.fat_g for n in logged) / days_logged, 1),
                carb_g=round(sum(n.carb_g for n in logged) / days_logged, 1),
            )
            tol = target_kcal * ON_TARGET_TOLERANCE
            on_target_days = sum(1 for n in logged if abs(n.kcal - target_kcal) <= tol)
            on_target_pct = round(on_target_days / days_logged * 100, 1)
            avg_kcal_delta = round(avg.kcal - target_kcal, 1)

        weight_change_kg: float | None = None
        weekly_rate_kg: float | None = None
        window_pts = [(d, t) for d, t in weight_points if start <= d <= end]
        if len(window_pts) >= 2:
            first_d, first_t = window_pts[0]
            last_d, last_t = window_pts[-1]
            weight_change_kg = round(last_t - first_t, 2)
            span = (last_d - first_d).days or 1
            weekly_rate_kg = round(weight_change_kg / span * 7, 2)

        return PeriodSummary(
            range=rng,
            start=start,
            end=end,
            days_total=days_total,
            days_logged=days_logged,
            logging_adherence_pct=round(days_logged / days_total * 100, 1),
            avg=avg,
            on_target_days=on_target_days,
            on_target_pct=on_target_pct,
            avg_kcal_delta=avg_kcal_delta,
            weight_change_kg=weight_change_kg,
            weekly_rate_kg=weekly_rate_kg,
        )

    @staticmethod
    def _pace(profile, actual_rate: float | None) -> PaceOut | None:
        # Stored rate is a magnitude; direction comes from the goal.
        direction = {"lose": -1.0, "gain": 1.0}.get(profile.goal, 0.0)
        target_rate = direction * abs(profile.target_rate_kg_per_week)
        on_pace_pct: float | None = None
        if target_rate and actual_rate is not None:
            # Share of the planned pace actually achieved (can be negative if the
            # weight is moving the wrong way).
            on_pace_pct = round(actual_rate / target_rate * 100, 1)
        return PaceOut(
            goal=profile.goal,
            target_rate_kg_per_week=round(target_rate, 2),
            actual_rate_kg_per_week=actual_rate,
            on_pace_pct=on_pace_pct,
        )
