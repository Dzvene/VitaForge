"""Tunable domain parameters (spec §6).

Single source of truth for every threshold and constant the calculation engine
and coaching layer use. NOTHING in `nutrition_math` or the coaching rules may
hardcode a number — it is passed a `Params` instance.

Defaults are app-level. They can be overridden per-app (env/DB) and per-user
(`merge_params(DEFAULT_PARAMS, user_overrides)`), so an individual user can,
for example, run a shorter calibration window without recompiling.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, replace
from typing import Any


@dataclass(frozen=True, slots=True)
class Params:
    # ----- Energy / trend math (§4, §6) -----
    # Energy cost of 1 kg of body mass change (kcal). Used to convert a weight
    # trend delta into a kcal in/out imbalance.
    energy_per_kg: float = 7700.0
    # EMA smoothing factor for the weight trend (§4.3). Smaller = smoother.
    trend_alpha: float = 0.1

    # ----- Calibration (§4.4 / §4.5) -----
    # Minimum number of clean days before a first real-TDEE estimate (§4.4).
    calibration_window_days: int = 14
    # Sliding window length for the adaptive weekly recalc (§4.5).
    adaptive_window_days: int = 14
    # A day counts toward calibration only if it has both a food log and a
    # weight measurement. These caps decide when the window "degrades" and is
    # extended rather than producing an estimate on dirty data.
    max_missing_log_days: int = 2
    max_missing_weigh_days: int = 2

    # ----- Goal / safety rails (§6, §9) -----
    # Hard cap on weekly loss as a fraction of body weight. Above this the
    # deficit is CLAMPED (not just warned). ~1% bw/week.
    max_weekly_loss_pct: float = 0.01
    # Surplus band for a gain goal (kcal/day).
    gain_surplus_min: float = 250.0
    gain_surplus_max: float = 400.0

    # ----- Macros (§4.2) -----
    protein_g_per_kg_min: float = 1.6
    protein_g_per_kg_max: float = 2.2
    protein_g_per_kg_default: float = 1.8
    fat_g_per_kg_min: float = 0.8
    fat_g_per_kg_default: float = 0.9
    # Atwater factors (kcal per gram).
    kcal_per_g_protein: float = 4.0
    kcal_per_g_fat: float = 9.0
    kcal_per_g_carb: float = 4.0

    # ----- Activity multipliers (§4.1) -----
    activity_factors: dict[str, float] = field(
        default_factory=lambda: {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "high": 1.725,
            "very_high": 1.9,
        }
    )

    # ----- Coaching: warning de-escalation (§5.2 / §6) -----
    # A warning stops auto-popping once the user has this many days of use OR
    # has accepted this many instances of that warning type.
    experience_days_threshold: int = 21
    warning_accept_threshold: int = 3

    # ----- Coaching: warning trigger thresholds (§5.2) -----
    # Weekly loss rate (fraction of bw) above which the "too aggressive" warning
    # fires (still below the §9 hard clamp, which is max_weekly_loss_pct).
    warn_weekly_loss_pct: float = 0.0075
    # Consecutive missed logging / weighing days before nudging.
    warn_missing_log_days: int = 2
    warn_missing_weigh_days: int = 2
    # Protein below this fraction of the recommended floor on a cut → warn.
    warn_protein_floor_ratio: float = 0.8
    # Systematic under-eating: avg intake below this fraction of target over the
    # trailing week → warn.
    warn_chronic_undereating_ratio: float = 0.85
    # Within this fraction of the calorie target counts as "on track" (§5.3).
    balanced_calorie_tolerance: float = 0.05
    # Eating over target by this fraction triggers the no-blame overage flow (§5.4).
    overage_ratio: float = 1.10


DEFAULT_PARAMS = Params()


def merge_params(base: Params, overrides: dict[str, Any] | None) -> Params:
    """Return a copy of `base` with whitelisted keys replaced by `overrides`.

    Unknown keys are ignored so a stale per-user override row cannot crash the
    engine. Used to layer app-level then user-level overrides.
    """
    if not overrides:
        return base
    valid = set(asdict(base))
    clean = {k: v for k, v in overrides.items() if k in valid}
    return replace(base, **clean)
