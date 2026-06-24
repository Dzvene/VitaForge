"""Public preview endpoints — no auth, no persistence (guest mode)."""

from fastapi import APIRouter

from app.modules.public import service
from app.modules.public.schemas import (
    CalibrationPreviewIn,
    EstimateResult,
    NutritionPreviewIn,
    TargetOut,
    WeightSeriesOut,
    WeightTrendIn,
)

router = APIRouter(prefix="/public", tags=["public"])


@router.post("/nutrition/preview", response_model=TargetOut)
async def nutrition_preview(payload: NutritionPreviewIn) -> TargetOut:
    return service.preview_target(payload)


@router.post("/weight/trend", response_model=WeightSeriesOut)
async def weight_trend(payload: WeightTrendIn) -> WeightSeriesOut:
    return service.preview_weight_trend(payload)


@router.post("/calibration/preview", response_model=EstimateResult)
async def calibration_preview(payload: CalibrationPreviewIn) -> EstimateResult:
    return service.preview_estimate(payload)
