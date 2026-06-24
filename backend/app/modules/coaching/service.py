"""Coaching evaluation (spec §5).

Read-mostly advisory layer. Evaluates data-driven warnings with experience-based
de-escalation (§5.2), produces in-day macro guidance (§5.3), and the no-blame
overage note (§5.4). Stateless rules + a small per-warning acceptance store.
"""

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.params import Params
from app.modules.coaching.catalog import HINTS, WARNINGS, WarningType
from app.modules.coaching.models import CoachingWarningState
from app.modules.coaching.schemas import (
    DayGuidanceOut,
    GuidanceItem,
    HintOut,
    WarningOut,
)
from app.modules.diary.service import DiaryService
from app.modules.identity.models import User
from app.modules.nutrition.service import NutritionService
from app.modules.profile.service import ProfileService
from app.modules.weight.service import WeightService


class CoachingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.profiles = ProfileService(db)
        self.nutrition = NutritionService(db)
        self.diary = DiaryService(db)
        self.weight = WeightService(db)

    # ---- hints (§5.1) ----
    def hints(self) -> list[HintOut]:
        return [HintOut(key=h.key, title=h.title, body=h.body) for h in HINTS]

    # ---- warning state ----
    async def _state(self, user_id: int, wtype: str) -> CoachingWarningState | None:
        return (
            await self.db.execute(
                select(CoachingWarningState).where(
                    CoachingWarningState.user_id == user_id,
                    CoachingWarningState.warning_type == wtype,
                )
            )
        ).scalar_one_or_none()

    async def _upsert_state(self, user_id: int, wtype: str) -> CoachingWarningState:
        state = await self._state(user_id, wtype)
        if state is None:
            # Set the defaults explicitly: column `default=` is only applied at
            # INSERT/flush, but accept() reads accepted_count straight after
            # creating the row (before any flush), so it must already be 0.
            state = CoachingWarningState(
                user_id=user_id, warning_type=wtype, accepted_count=0, dismissed=False
            )
            self.db.add(state)
        return state

    def _auto_show(self, state: CoachingWarningState | None, exp_days: int, params: Params) -> bool:
        """Whether a triggered warning still pops automatically (§5.2)."""
        if state is not None and state.dismissed:
            return False
        if exp_days >= params.experience_days_threshold:
            return False
        # Veteran on this warning type — keep it in help only.
        return not (state is not None and state.accepted_count >= params.warning_accept_threshold)

    async def accept(self, user_id: int, wtype: str) -> None:
        if wtype not in WARNINGS:
            return
        state = await self._upsert_state(user_id, wtype)
        state.accepted_count += 1
        await self.db.commit()

    async def dismiss(self, user_id: int, wtype: str) -> None:
        if wtype not in WARNINGS:
            return
        state = await self._upsert_state(user_id, wtype)
        state.dismissed = True
        await self.db.commit()

    # ---- data-driven warnings (§5.2) ----
    async def current_warnings(self, user: User) -> list[WarningOut]:
        profile = await self.profiles.get(user.id)
        if profile is None:
            return []
        params = await self.profiles.effective_params(user.id)
        target_row, _ = await self.nutrition.get_or_recompute(user.id)
        exp_days = max(0, (date.today() - user.created_at.date()).days)

        triggered: list[str] = []
        weight_kg = profile.current_weight_kg

        # Aggressive loss rate (below the §9 hard clamp, above the warn line).
        if profile.goal == "lose":
            if profile.target_rate_kg_per_week > params.warn_weekly_loss_pct * weight_kg:
                triggered.append(WarningType.AGGRESSIVE_RATE)
            # Protein below the floor ratio of the recommended minimum.
            protein_per_kg = target_row.protein_g / weight_kg if weight_kg else 0
            if protein_per_kg < params.warn_protein_floor_ratio * params.protein_g_per_kg_min:
                triggered.append(WarningType.LOW_PROTEIN)

        # Logging / weighing regularity over the trailing week.
        today = date.today()
        week_start = today - timedelta(days=6)
        intake = await self.diary.daily_calories(user.id, week_start, today)
        weigh_logs = await self.weight.raw_logs(user.id, since=week_start, until=today)
        span = 7
        if span - len(intake) >= params.warn_missing_log_days:
            triggered.append(WarningType.MISSED_LOGGING)
        if span - len(weigh_logs) >= params.warn_missing_weigh_days:
            triggered.append(WarningType.IRREGULAR_WEIGHING)

        # Systematic under-eating relative to target.
        if intake and target_row.target_calories > 0:
            avg = sum(intake.values()) / len(intake)
            if avg < params.warn_chronic_undereating_ratio * target_row.target_calories:
                triggered.append(WarningType.CHRONIC_UNDEREATING)

        out: list[WarningOut] = []
        for wtype in triggered:
            copy = WARNINGS[wtype]
            state = await self._state(user.id, wtype)
            out.append(
                WarningOut(
                    type=wtype,
                    title=copy.title,
                    message=copy.message,
                    auto_show=self._auto_show(state, exp_days, params),
                )
            )
        return out

    # ---- in-day macro guidance (§5.3) + overage (§5.4) ----
    async def day_guidance(self, user_id: int, day: date) -> DayGuidanceOut:
        summary = await self.diary.day_summary(user_id, day)
        params = await self.profiles.effective_params(user_id)
        t, eaten, rem = summary.target, summary.eaten, summary.remaining
        items: list[GuidanceItem] = []

        if t.calories <= 0:
            return DayGuidanceOut(items=items)

        consumed_frac = eaten.kcal / t.calories

        # §5.4 — overage first, supportive, no compensation talk.
        if eaten.kcal > t.calories * params.overage_ratio:
            items.append(
                GuidanceItem(
                    kind="overage",
                    message="Today came in above target — that's fine. No need to cut "
                    "back tomorrow; just return to the usual plan. One day doesn't move "
                    "the weekly trend.",
                )
            )
            return DayGuidanceOut(items=items)

        # §5.3 — dosed nudges, later in the day when the budget is mostly used.
        if consumed_frac >= 0.6:
            if rem.protein_g > 0.2 * t.protein_g:
                items.append(
                    GuidanceItem(
                        kind="protein_low",
                        message=f"About {round(rem.protein_g)} g of protein left — a "
                        "lean source in your next meal would round the day out.",
                    )
                )
            if rem.fat_g < 0.1 * t.fat_g:
                items.append(
                    GuidanceItem(
                        kind="fat_high",
                        message="Fat budget is nearly used up — maybe go lighter on "
                        "fatty sources in what's left.",
                    )
                )
            if rem.carb_g > 0.3 * t.carb_g and rem.calories > 0:
                items.append(
                    GuidanceItem(
                        kind="carb_room",
                        message=f"Still room for ~{round(rem.carb_g)} g of carbs — handy "
                        "around training.",
                    )
                )

        if not items and abs(rem.calories) <= params.balanced_calorie_tolerance * t.calories:
            items.append(
                GuidanceItem(kind="on_track", message="Day's looking balanced — nice work.")
            )
        return DayGuidanceOut(items=items)
