"""Calibration endpoints."""

from fastapi import APIRouter

from app.core.deps import CurrentUser, DbSession
from app.modules.calibration.schemas import CalibrationStatusOut, EstimateResult
from app.modules.calibration.service import CalibrationService

router = APIRouter(prefix="/calibration", tags=["calibration"])


@router.get("/status", response_model=CalibrationStatusOut)
async def status(user: CurrentUser, db: DbSession) -> CalibrationStatusOut:
    return await CalibrationService(db).status(user.id)


@router.post("/estimate", response_model=EstimateResult)
async def estimate(user: CurrentUser, db: DbSession) -> EstimateResult:
    """Finish the baseline phase and switch the target onto real maintenance (§4.4)."""
    return await CalibrationService(db).estimate(user.id)


@router.post("/recalc", response_model=EstimateResult)
async def recalc(user: CurrentUser, db: DbSession) -> EstimateResult:
    """Manual weekly adaptive recalc (§4.5, v1)."""
    return await CalibrationService(db).recalc(user.id)


@router.post("/skip", response_model=EstimateResult)
async def skip(user: CurrentUser, db: DbSession) -> EstimateResult:
    """'I know my norm' — build the target on the formula estimate (§4.4)."""
    return await CalibrationService(db).skip(user.id)
