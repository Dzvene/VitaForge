"""Nutrition (Norm/Target) endpoints."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.nutrition.schemas import TargetOut
from app.modules.nutrition.service import NutritionService

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


def _out(row, clamped: bool) -> TargetOut:
    return TargetOut(
        target_calories=row.target_calories,
        protein_g=row.protein_g,
        fat_g=row.fat_g,
        carb_g=row.carb_g,
        maintenance_kcal=row.maintenance_kcal,
        maintenance_source=row.maintenance_source,
        calibrated=row.calibrated,
        rate_clamped=clamped,
    )


@router.get("/target", response_model=TargetOut)
async def get_target(user: CurrentUser, db: DbSession) -> TargetOut:
    row, clamped = await NutritionService(db).get_or_recompute(user.id)
    return _out(row, clamped)


@router.post("/recompute", response_model=TargetOut)
async def recompute(user: CurrentUser, db: DbSession) -> TargetOut:
    """Recompute the norm from the current profile (e.g. after editing weight/goal)."""
    row, clamped = await NutritionService(db).recompute(user.id)
    return _out(row, clamped)
