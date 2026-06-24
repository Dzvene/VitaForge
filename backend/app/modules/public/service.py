"""Pure preview computations — the authenticated slices' logic, minus the DB.

Mirrors `NutritionService.recompute` (§4.1/§4.2/§4.4), `WeightService` trend
(§4.3) and `CalibrationService._estimate_over` (§4.4) using only the engine in
`app.core` and the default params. Kept deliberately faithful to those services
so the guest preview and the post-registration result agree.
"""

from __future__ import annotations

from app.core.nutrition_math import (
    Goal,
    Sex,
    formula_tdee,
    macro_targets,
    real_tdee,
    target_calories,
    trend_series,
)
from app.core.params import DEFAULT_PARAMS
from app.modules.public.schemas import (
    CalibrationPreviewIn,
    EstimateResult,
    NutritionPreviewIn,
    TargetOut,
    WeightPointOut,
    WeightSeriesOut,
    WeightTrendIn,
)


def preview_target(payload: NutritionPreviewIn) -> TargetOut:
    """Guest Norm/target. Hold at maintenance until a real figure is supplied."""
    p = payload.profile
    params = DEFAULT_PARAMS
    calibrated = payload.maintenance_kcal is not None
    clamped = False

    if calibrated:
        maintenance = payload.maintenance_kcal
        source = "calibrated"
        result = target_calories(
            maintenance,
            Goal(p.goal),
            p.current_weight_kg,
            params,
            rate_kg_per_week=p.target_rate_kg_per_week,
        )
        target_cal = result.calories
        clamped = result.clamped
    else:
        maintenance = formula_tdee(
            Sex(p.sex),
            p.current_weight_kg,
            p.height_cm,
            p.age,
            p.activity_level,
            params,
        )
        source = "formula"
        # Baseline phase: hold at maintenance regardless of goal (§4.4).
        target_cal = round(maintenance)

    macros = macro_targets(
        target_cal,
        p.current_weight_kg,
        params,
        protein_g_per_kg=p.protein_g_per_kg,
        protein_g_abs=p.protein_g_abs,
        fat_g_per_kg=p.fat_g_per_kg,
    )
    return TargetOut(
        target_calories=target_cal,
        protein_g=macros.protein_g,
        fat_g=macros.fat_g,
        carb_g=macros.carb_g,
        maintenance_kcal=round(maintenance, 1),
        maintenance_source=source,
        calibrated=calibrated,
        rate_clamped=clamped,
    )


def preview_weight_trend(payload: WeightTrendIn) -> WeightSeriesOut:
    """EMA trend over a guest's weigh-ins (§4.3). Chronological order enforced."""
    points = sorted(payload.points, key=lambda w: w.logged_on)
    trends = trend_series([w.weight_kg for w in points], DEFAULT_PARAMS.trend_alpha)
    out = [
        WeightPointOut(logged_on=p.logged_on, weight_kg=p.weight_kg, trend_kg=round(t, 2))
        for p, t in zip(points, trends)
    ]
    return WeightSeriesOut(points=out, latest_trend_kg=out[-1].trend_kg if out else None)


def preview_estimate(payload: CalibrationPreviewIn) -> EstimateResult:
    """Real-TDEE estimate over the guest's window (mirror of _estimate_over)."""
    params = DEFAULT_PARAMS
    weighs = sorted(payload.weights, key=lambda w: w.logged_on)
    intake = {i.day: i.kcal for i in payload.intake}

    if not weighs or not intake:
        return EstimateResult(ok=False, reason="Not enough weigh-ins or food logs yet")

    span_days = (weighs[-1].logged_on - weighs[0].logged_on).days + 1
    missing_logs = span_days - len(intake)
    missing_weighs = span_days - len(weighs)
    if len(weighs) < 2:
        return EstimateResult(ok=False, reason="Not enough weigh-ins or food logs yet")
    if missing_logs > params.max_missing_log_days:
        return EstimateResult(ok=False, reason="Too many days without a food log — keep logging")
    if missing_weighs > params.max_missing_weigh_days:
        return EstimateResult(ok=False, reason="Too many days without a weigh-in — weigh daily")

    trends = trend_series([w.weight_kg for w in weighs], params.trend_alpha)
    trend_change = trends[-1] - trends[0]
    days = (weighs[-1].logged_on - weighs[0].logged_on).days or 1
    avg_intake = sum(intake.values()) / len(intake)
    real = real_tdee(avg_intake, trend_change, days, params)
    return EstimateResult(
        ok=True,
        real_tdee=round(real, 1),
        avg_daily_intake=round(avg_intake, 1),
        trend_change_kg=round(trend_change, 3),
        days=days,
    )
