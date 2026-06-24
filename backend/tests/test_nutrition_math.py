"""Tests for the pure calculation engine (spec §4)."""

import math

import pytest

from app.core.nutrition_math import (
    Goal,
    Sex,
    ema_step,
    formula_tdee,
    macro_targets,
    mifflin_st_jeor_bmr,
    real_tdee,
    target_calories,
    trend_series,
)
from app.core.params import DEFAULT_PARAMS as P

# ---- §4.1 BMR / TDEE ----


def test_bmr_male_known_value():
    # 80 kg, 180 cm, 30 y, male: 10*80 + 6.25*180 − 5*30 + 5 = 1780
    assert mifflin_st_jeor_bmr(Sex.male, 80, 180, 30) == pytest.approx(1780)


def test_bmr_female_known_value():
    # 65 kg, 165 cm, 30 y, female: 10*65 + 6.25*165 − 5*30 − 161 = 1370.25
    assert mifflin_st_jeor_bmr(Sex.female, 65, 165, 30) == pytest.approx(1370.25)


def test_tdee_applies_activity_factor():
    bmr = mifflin_st_jeor_bmr(Sex.male, 80, 180, 30)
    assert formula_tdee(Sex.male, 80, 180, 30, "moderate", P) == pytest.approx(bmr * 1.55)


def test_unknown_activity_raises():
    with pytest.raises(ValueError):
        formula_tdee(Sex.male, 80, 180, 30, "athlete", P)


# ---- §4.2 macros ----


def test_macros_protein_priority_and_carb_fill():
    # protein default 1.8 g/kg, fat default 0.9 g/kg at 80 kg
    m = macro_targets(2500, 80, P)
    assert m.protein_g == pytest.approx(144.0)   # 1.8 * 80
    assert m.fat_g == pytest.approx(72.0)        # 0.9 * 80
    # carbs fill remaining kcal
    used = 144 * 4 + 72 * 9
    assert m.carb_g == pytest.approx((2500 - used) / 4, abs=0.2)


def test_macros_absolute_protein_override():
    m = macro_targets(2500, 80, P, protein_g_abs=180)
    assert m.protein_g == pytest.approx(180.0)


def test_macros_fat_never_below_floor():
    m = macro_targets(2500, 80, P, fat_g_per_kg=0.3)  # below 0.8 floor
    assert m.fat_g == pytest.approx(P.fat_g_per_kg_min * 80)


def test_macros_carbs_clamped_nonnegative():
    # absurdly high protein+fat for tiny calories → carbs floored at 0, not negative
    m = macro_targets(200, 80, P, protein_g_abs=300)
    assert m.carb_g == 0.0


# ---- §4.3 trend (EMA) ----


def test_ema_step_formula():
    assert ema_step(80.0, 81.0, 0.1) == pytest.approx(80.1)


def test_trend_series_first_equals_first_weight():
    series = trend_series([80, 81, 79, 80], 0.1)
    assert series[0] == 80
    assert len(series) == 4
    # trend is smoother than raw: stays near 80
    assert all(79.5 < t < 80.5 for t in series)


def test_trend_series_empty():
    assert trend_series([], 0.1) == []


# ---- §4.4 real TDEE ----


def test_real_tdee_weight_up_means_burn_below_intake():
    # ate 2500/day, trend rose 0.5 kg over 14 days → real TDEE below 2500
    rt = real_tdee(2500, trend_change_kg=0.5, days=14, params=P)
    expected = 2500 - (0.5 * 7700) / 14
    assert rt == pytest.approx(expected)
    assert rt < 2500


def test_real_tdee_weight_down_means_burn_above_intake():
    rt = real_tdee(2000, trend_change_kg=-0.4, days=14, params=P)
    assert rt > 2000


def test_real_tdee_zero_days_raises():
    with pytest.raises(ValueError):
        real_tdee(2000, 0.0, 0, P)


# ---- §4.4 / §9 target with safety clamp ----


def test_maintain_returns_tdee():
    r = target_calories(2500, Goal.maintain, 80, P)
    assert r.calories == 2500
    assert r.clamped is False


def test_loss_within_limit_not_clamped():
    # 0.5 kg/week at 80 kg = 0.625% bw, under the 1% cap
    r = target_calories(2500, Goal.lose, 80, P, rate_kg_per_week=0.5)
    assert r.clamped is False
    assert r.calories == round(2500 - (0.5 * 7700) / 7)


def test_loss_above_limit_is_clamped_to_one_percent():
    # request 2 kg/week at 80 kg; cap = 1% * 80 = 0.8 kg/week
    r = target_calories(2500, Goal.lose, 80, P, rate_kg_per_week=2.0)
    assert r.clamped is True
    assert r.applied_rate_kg_per_week == pytest.approx(0.8)
    assert r.calories == round(2500 - (0.8 * 7700) / 7)
    # the clamped target must never be more aggressive than the cap
    assert r.calories > 2500 - (2.0 * 7700) / 7


def test_gain_surplus_held_in_band():
    # tiny requested rate → surplus floored to gain_surplus_min
    r = target_calories(2500, Goal.gain, 80, P, rate_kg_per_week=0.05)
    assert r.calories == round(2500 + P.gain_surplus_min)
    # huge requested rate → surplus capped to gain_surplus_max
    r2 = target_calories(2500, Goal.gain, 80, P, rate_kg_per_week=1.0)
    assert r2.calories == round(2500 + P.gain_surplus_max)
    assert r2.clamped is True


def test_calibrated_target_differs_from_formula_path():
    # The whole point of §4.4: building a deficit off a real maintenance figure
    # should differ from doing it off the formula when they disagree.
    formula = formula_tdee(Sex.male, 80, 180, 30, "moderate", P)
    real = real_tdee(2300, 0.0, 14, P)  # ate 2300 holding weight → real ~2300
    assert not math.isclose(formula, real, rel_tol=0.01)
