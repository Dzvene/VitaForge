"""Calibration logic (spec §4.4 baseline, §4.5 adaptive recalc).

Reads observed intake (diary) and weight trend (weight), back-calculates a real
maintenance TDEE via the pure engine, and pushes it into the nutrition target.
Degrades softly: on dirty/insufficient data it returns a reason instead of an
estimate, and the window effectively extends (spec §4.4).
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_topics import CALIBRATION_COMPLETED
from app.core.events import publish
from app.core.nutrition_math import real_tdee, trend_series
from app.modules.calibration.models import CalibrationStatus
from app.modules.calibration.schemas import CalibrationStatusOut, EstimateResult
from app.modules.diary.service import DiaryService
from app.modules.nutrition.service import NutritionService
from app.modules.profile.service import ProfileService
from app.modules.weight.service import WeightService


class CalibrationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.profiles = ProfileService(db)
        self.diary = DiaryService(db)
        self.weight = WeightService(db)
        self.nutrition = NutritionService(db)

    async def _row(self, user_id: int) -> CalibrationStatus | None:
        return (
            await self.db.execute(
                select(CalibrationStatus).where(CalibrationStatus.user_id == user_id)
            )
        ).scalar_one_or_none()

    async def ensure_started(self, user_id: int, on: date | None = None) -> CalibrationStatus:
        """Open the baseline phase (called at onboarding). Idempotent."""
        row = await self._row(user_id)
        if row is None:
            row = CalibrationStatus(user_id=user_id, started_on=on or date.today())
            self.db.add(row)
            await self.db.commit()
            await self.db.refresh(row)
        return row

    async def _clean_days(self, user_id: int, start: date, end: date) -> set[date]:
        """Days in [start, end] that have BOTH a food log and a weigh-in."""
        intake = await self.diary.daily_calories(user_id, start, end)
        weigh_days = {
            w.logged_on for w in await self.weight.raw_logs(user_id, since=start, until=end)
        }
        return set(intake.keys()) & weigh_days

    async def status(self, user_id: int) -> CalibrationStatusOut:
        row = await self.ensure_started(user_id)
        params = await self.profiles.effective_params(user_id)
        today = date.today()
        clean = await self._clean_days(user_id, row.started_on, today)
        n = len(clean)
        window = params.calibration_window_days
        ready = row.phase == "calibrating" and n >= window
        return CalibrationStatusOut(
            phase=row.phase,
            started_on=row.started_on,
            window_days=window,
            clean_days_collected=n,
            days_remaining=max(0, window - n),
            ready_to_estimate=ready,
            last_real_tdee=row.last_real_tdee,
        )

    async def _estimate_over(self, user_id: int, start: date, end: date) -> EstimateResult:
        """Core estimate over an explicit window. No persistence."""
        params = await self.profiles.effective_params(user_id)
        intake = await self.diary.daily_calories(user_id, start, end)
        weigh_logs = await self.weight.raw_logs(user_id, since=start, until=end)

        span_days = (end - start).days + 1
        missing_logs = span_days - len(intake)
        missing_weighs = span_days - len(weigh_logs)
        if len(weigh_logs) < 2 or not intake:
            return EstimateResult(ok=False, reason="Not enough weigh-ins or food logs yet")
        if missing_logs > params.max_missing_log_days:
            return EstimateResult(
                ok=False, reason="Too many days without a food log — keep logging"
            )
        if missing_weighs > params.max_missing_weigh_days:
            return EstimateResult(
                ok=False, reason="Too many days without a weigh-in — weigh daily"
            )

        trends = trend_series([w.weight_kg for w in weigh_logs], params.trend_alpha)
        trend_change = trends[-1] - trends[0]
        days = (weigh_logs[-1].logged_on - weigh_logs[0].logged_on).days or 1
        avg_intake = sum(intake.values()) / len(intake)
        real = real_tdee(avg_intake, trend_change, days, params)
        return EstimateResult(
            ok=True,
            real_tdee=round(real, 1),
            avg_daily_intake=round(avg_intake, 1),
            trend_change_kg=round(trend_change, 3),
            days=days,
        )

    async def estimate(self, user_id: int) -> EstimateResult:
        """Finish the baseline phase: compute real TDEE, write it, switch to goal."""
        row = await self.ensure_started(user_id)
        result = await self._estimate_over(user_id, row.started_on, date.today())
        if not result.ok:
            return result
        target = await self.nutrition.set_maintenance(
            user_id, result.real_tdee, source="calibrated"
        )
        row.phase = "completed"
        row.completed_at = datetime.now(UTC)
        row.last_real_tdee = result.real_tdee
        await self.db.commit()
        publish(CALIBRATION_COMPLETED, user_id=user_id, real_tdee=result.real_tdee)
        return result.model_copy(update={"target_calories": target.target_calories})

    async def recalc(self, user_id: int) -> EstimateResult:
        """Manual weekly adaptive recalc on a sliding window (§4.5, v1 manual)."""
        params = await self.profiles.effective_params(user_id)
        end = date.today()
        start = end - timedelta(days=params.adaptive_window_days - 1)
        result = await self._estimate_over(user_id, start, end)
        if not result.ok:
            return result
        target = await self.nutrition.set_maintenance(
            user_id, result.real_tdee, source="calibrated"
        )
        row = await self.ensure_started(user_id)
        row.last_real_tdee = result.real_tdee
        await self.db.commit()
        return result.model_copy(update={"target_calories": target.target_calories})

    async def skip(self, user_id: int) -> EstimateResult:
        """User chose 'I know my norm' (§4.4). Apply goal on the formula basis."""
        row = await self.ensure_started(user_id)
        target_row, _ = await self.nutrition.get_or_recompute(user_id)
        target = await self.nutrition.set_maintenance(
            user_id, target_row.maintenance_kcal, source="formula", apply_goal=True
        )
        row.phase = "completed"
        row.completed_at = datetime.now(UTC)
        await self.db.commit()
        return EstimateResult(
            ok=True,
            reason="Calibration skipped — target built on the formula estimate",
            real_tdee=None,
            target_calories=target.target_calories,
        )
