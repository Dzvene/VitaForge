"""Pure nutrition calculations — NO IO, NO DB (spec §4).

This module is the heart of the product. Every function is pure: same inputs →
same outputs, no side effects, fully unit-testable. All thresholds come in via
`Params` (app/core/params.py); nothing is hardcoded here.

Lives in `app.core` (utility) so any slice can import it without a cross-slice
dependency and without forming a cycle.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.core.params import Params


class Sex(str, Enum):
    male = "male"
    female = "female"


class Goal(str, Enum):
    lose = "lose"        # minus
    maintain = "maintain"  # zero
    gain = "gain"        # plus


# ---------------------------------------------------------------------------
# §4.1 Starting estimate — Mifflin-St Jeor BMR → TDEE
# ---------------------------------------------------------------------------


def mifflin_st_jeor_bmr(sex: Sex, weight_kg: float, height_cm: float, age: int) -> float:
    """Basal metabolic rate (kcal/day). A STARTING guess only (§4.1)."""
    base = 10.0 * weight_kg + 6.25 * height_cm - 5.0 * age
    return base + 5.0 if sex == Sex.male else base - 161.0


def activity_factor(level: str, params: Params) -> float:
    try:
        return params.activity_factors[level]
    except KeyError as exc:
        raise ValueError(f"unknown activity level: {level!r}") from exc


def formula_tdee(
    sex: Sex, weight_kg: float, height_cm: float, age: int, activity_level: str, params: Params
) -> float:
    """Formula maintenance estimate (§4.1). Used ONLY to seed calibration —
    never to build a deficit directly."""
    bmr = mifflin_st_jeor_bmr(sex, weight_kg, height_cm, age)
    return bmr * activity_factor(activity_level, params)


# ---------------------------------------------------------------------------
# §4.2 Macro targets — protein priority, fat floor, carbs fill the rest
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Macros:
    protein_g: float
    fat_g: float
    carb_g: float

    def kcal(self, params: Params) -> float:
        return (
            self.protein_g * params.kcal_per_g_protein
            + self.fat_g * params.kcal_per_g_fat
            + self.carb_g * params.kcal_per_g_carb
        )


def macro_targets(
    calories: float,
    weight_kg: float,
    params: Params,
    *,
    protein_g_per_kg: float | None = None,
    protein_g_abs: float | None = None,
    fat_g_per_kg: float | None = None,
) -> Macros:
    """Distribute `calories` into protein/fat/carb grams (§4.2).

    Protein first (g/kg or an absolute override), fat to its floor, carbs take
    whatever calories remain. Carbs are clamped at 0 so an unrealistically high
    protein+fat target never yields negative carbs.
    """
    if protein_g_abs is not None:
        protein_g = protein_g_abs
    else:
        per_kg = protein_g_per_kg if protein_g_per_kg is not None else params.protein_g_per_kg_default
        protein_g = per_kg * weight_kg

    fat_per_kg = fat_g_per_kg if fat_g_per_kg is not None else params.fat_g_per_kg_default
    fat_per_kg = max(fat_per_kg, params.fat_g_per_kg_min)
    fat_g = fat_per_kg * weight_kg

    used = protein_g * params.kcal_per_g_protein + fat_g * params.kcal_per_g_fat
    carb_kcal = max(0.0, calories - used)
    carb_g = carb_kcal / params.kcal_per_g_carb
    return Macros(protein_g=round(protein_g, 1), fat_g=round(fat_g, 1), carb_g=round(carb_g, 1))


# ---------------------------------------------------------------------------
# §4.3 Weight trend — exponential moving average
# ---------------------------------------------------------------------------


def ema_step(prev_trend: float, today_weight: float, alpha: float) -> float:
    """trend_today = trend_yesterday + α * (weight_today − trend_yesterday)."""
    return prev_trend + alpha * (today_weight - prev_trend)


def trend_series(weights: list[float], alpha: float) -> list[float]:
    """Smoothed trend over an ordered series of raw weights (§4.3).

    First trend = first measurement. `weights` must be in chronological order.
    """
    if not weights:
        return []
    out = [weights[0]]
    for w in weights[1:]:
        out.append(ema_step(out[-1], w, alpha))
    return out


# ---------------------------------------------------------------------------
# §4.4 / §4.5 Real TDEE from observed intake + trend change
# ---------------------------------------------------------------------------


def real_tdee(avg_daily_intake_kcal: float, trend_change_kg: float, days: int, params: Params) -> float:
    """Maintenance back-calculated from facts (§4.4).

    real_TDEE = avg_daily_intake − (trend_change_kg * K / days)

    Trend went UP → ate above maintenance → real TDEE is BELOW intake, and
    vice-versa. `days` must be > 0.
    """
    if days <= 0:
        raise ValueError("days must be > 0")
    daily_imbalance = (trend_change_kg * params.energy_per_kg) / days
    return avg_daily_intake_kcal - daily_imbalance


# ---------------------------------------------------------------------------
# §4.4 / §6 / §9 Target calories for a goal — with the safety clamp
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class TargetResult:
    calories: float
    # Requested vs applied weekly rate (kg). They differ when the safety rail
    # clamped an over-aggressive rate (§9). `clamped` drives the §5.2 warning.
    requested_rate_kg_per_week: float
    applied_rate_kg_per_week: float
    clamped: bool


def target_calories(
    maintenance_tdee: float,
    goal: Goal,
    weight_kg: float,
    params: Params,
    *,
    rate_kg_per_week: float = 0.0,
) -> TargetResult:
    """Build the daily calorie target from a *real* maintenance figure (§4.4).

    `rate_kg_per_week` is the desired magnitude of weekly weight change (always
    positive; direction comes from `goal`). For a loss it is hard-clamped to
    `max_weekly_loss_pct` of body weight (§9) — extreme deficits are not
    allowed, they are cut. For a gain the surplus is held inside the
    [gain_surplus_min, gain_surplus_max] band.
    """
    if goal == Goal.maintain:
        return TargetResult(round(maintenance_tdee), 0.0, 0.0, False)

    rate = abs(rate_kg_per_week)

    if goal == Goal.lose:
        max_rate = params.max_weekly_loss_pct * weight_kg
        applied = min(rate, max_rate)
        clamped = rate > max_rate
        daily_delta = (applied * params.energy_per_kg) / 7.0
        return TargetResult(
            calories=round(maintenance_tdee - daily_delta),
            requested_rate_kg_per_week=rate,
            applied_rate_kg_per_week=applied,
            clamped=clamped,
        )

    # gain
    daily_delta = (rate * params.energy_per_kg) / 7.0
    clamped = False
    if daily_delta < params.gain_surplus_min:
        daily_delta = params.gain_surplus_min
        clamped = rate > 0  # only flag if the user actually asked for less
    elif daily_delta > params.gain_surplus_max:
        daily_delta = params.gain_surplus_max
        clamped = True
    applied = (daily_delta * 7.0) / params.energy_per_kg
    return TargetResult(
        calories=round(maintenance_tdee + daily_delta),
        requested_rate_kg_per_week=rate,
        applied_rate_kg_per_week=applied,
        clamped=clamped,
    )
