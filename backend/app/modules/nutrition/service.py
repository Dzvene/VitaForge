"""Norm/Target computation (spec §4.1, §4.2, §4.4).

Wraps the pure engine in `app.core.nutrition_math` with persistence. Knows
nothing about diary or calibration — calibration pushes a real maintenance
figure in via `set_maintenance`; everything else is derived from the profile.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.nutrition_math import (
    Goal,
    Sex,
    formula_tdee,
    macro_targets,
    target_calories,
)
from app.modules.nutrition.models import NutritionTarget
from app.modules.profile.service import ProfileService


class NutritionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.profiles = ProfileService(db)

    async def _row(self, user_id: int) -> NutritionTarget | None:
        return (
            await self.db.execute(
                select(NutritionTarget).where(NutritionTarget.user_id == user_id)
            )
        ).scalar_one_or_none()

    async def recompute(self, user_id: int) -> tuple[NutritionTarget, bool]:
        """Recompute and persist the target from the current profile + maintenance.

        Returns (target_row, rate_clamped). Maintenance is the stored calibrated
        value once calibration is done, otherwise the live formula estimate.
        Until calibrated the target equals maintenance (eat at maintenance, §4.4).
        """
        profile = await self.profiles.get_or_404(user_id)
        params = await self.profiles.effective_params(user_id)
        row = await self._row(user_id)

        calibrated = bool(row and row.calibrated)
        if calibrated:
            maintenance = row.maintenance_kcal
            source = "calibrated"
        else:
            maintenance = formula_tdee(
                Sex(profile.sex),
                profile.current_weight_kg,
                profile.height_cm,
                profile.age,
                profile.activity_level,
                params,
            )
            source = "formula"

        clamped = False
        if calibrated:
            result = target_calories(
                maintenance,
                Goal(profile.goal),
                profile.current_weight_kg,
                params,
                rate_kg_per_week=profile.target_rate_kg_per_week,
            )
            target_cal = result.calories
            clamped = result.clamped
        else:
            # Baseline phase: hold at maintenance regardless of goal.
            target_cal = round(maintenance)

        macros = macro_targets(
            target_cal,
            profile.current_weight_kg,
            params,
            protein_g_per_kg=profile.protein_g_per_kg,
            protein_g_abs=profile.protein_g_abs,
            fat_g_per_kg=profile.fat_g_per_kg,
        )

        if row is None:
            row = NutritionTarget(user_id=user_id)
            self.db.add(row)
        row.maintenance_kcal = round(maintenance, 1)
        row.maintenance_source = source
        row.target_calories = target_cal
        row.protein_g = macros.protein_g
        row.fat_g = macros.fat_g
        row.carb_g = macros.carb_g
        await self.db.commit()
        await self.db.refresh(row)
        return row, clamped

    async def get_or_recompute(self, user_id: int) -> tuple[NutritionTarget, bool]:
        row = await self._row(user_id)
        if row is None:
            return await self.recompute(user_id)
        return row, False

    async def set_maintenance(
        self,
        user_id: int,
        maintenance_kcal: float,
        source: str = "calibrated",
        *,
        apply_goal: bool = True,
    ) -> NutritionTarget:
        """Pin a maintenance figure and (by default) start applying the goal.

        Called by the calibration slice when a real TDEE is known (§4.4/§4.5),
        and on a deliberate skip ("I know my norm") with the formula figure but
        `apply_goal=True` so the loss/gain target activates on the formula basis.
        `apply_goal` toggles `calibrated`, the gate recompute() reads to decide
        whether to apply the goal vs hold at maintenance.
        """
        row = await self._row(user_id)
        if row is None:
            row = NutritionTarget(user_id=user_id, maintenance_kcal=maintenance_kcal)
            self.db.add(row)
        row.maintenance_kcal = round(maintenance_kcal, 1)
        row.maintenance_source = source
        row.calibrated = apply_goal
        await self.db.commit()
        target, _ = await self.recompute(user_id)
        return target
