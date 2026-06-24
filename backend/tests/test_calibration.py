"""Calibration slice: baseline status, soft-degrade, skip, and a clean recalc.

The calibration window is shrunk via per-user param overrides (§6) so a clean
real-TDEE estimate is reachable deterministically inside a test.
"""

from datetime import date, timedelta

from tests.conftest import PROFILE_BODY

FOOD = {"name": "Oats", "kcal_100g": 380, "protein_100g": 13, "fat_100g": 7, "carb_100g": 67}


async def _setup(client, headers, overrides=None):
    body = {**PROFILE_BODY}
    if overrides:
        body["param_overrides"] = overrides
    await client.put("/profile", json=body, headers=headers)
    food = (await client.post("/foods", json=FOOD, headers=headers)).json()
    return food


async def test_status_fresh_is_calibrating(client, admin):
    await _setup(client, admin["headers"])
    r = await client.get("/calibration/status", headers=admin["headers"])
    assert r.status_code == 200
    s = r.json()
    assert s["phase"] == "calibrating"
    assert s["clean_days_collected"] == 0
    assert s["ready_to_estimate"] is False
    assert s["days_remaining"] == s["window_days"]


async def test_status_counts_clean_days(client, admin):
    food = await _setup(client, admin["headers"])
    today = date.today()
    await client.post(
        "/weight", json={"logged_on": today.isoformat(), "weight_kg": 80}, headers=admin["headers"]
    )
    await client.post(
        "/diary",
        json={"entry_date": today.isoformat(), "meal": "lunch", "food_id": food["id"],
              "grams": 100},
        headers=admin["headers"],
    )
    s = (await client.get("/calibration/status", headers=admin["headers"])).json()
    # A day with BOTH a weigh-in and a food log counts as one clean day.
    assert s["clean_days_collected"] == 1


async def test_estimate_soft_degrades_without_data(client, admin):
    await _setup(client, admin["headers"])
    r = await client.post("/calibration/estimate", headers=admin["headers"])
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert body["reason"]


async def test_skip_builds_target_on_formula(client, admin):
    await _setup(client, admin["headers"])
    before = (await client.get("/nutrition/target", headers=admin["headers"])).json()
    r = await client.post("/calibration/skip", headers=admin["headers"])
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert r.json()["target_calories"] is not None

    status = (await client.get("/calibration/status", headers=admin["headers"])).json()
    assert status["phase"] == "completed"
    # Goal now applied: a lose goal pulls the target below maintenance.
    after = (await client.get("/nutrition/target", headers=admin["headers"])).json()
    assert after["calibrated"] is True
    assert after["target_calories"] < before["maintenance_kcal"]


async def test_recalc_clean_window_produces_estimate(client, admin):
    # 3-day window, allow no missing days → fully clean data is required.
    food = await _setup(
        client,
        admin["headers"],
        overrides={"adaptive_window_days": 3, "max_missing_weigh_days": 0,
                   "max_missing_log_days": 0},
    )
    today = date.today()
    weights = {0: 80.0, 1: 79.8, 2: 79.6}  # offset-from-start → kg, a gentle downward trend
    start = today - timedelta(days=2)
    for off, kg in weights.items():
        d = (start + timedelta(days=off)).isoformat()
        await client.post(
            "/weight", json={"logged_on": d, "weight_kg": kg}, headers=admin["headers"]
        )
        await client.post(
            "/diary",
            json={"entry_date": d, "meal": "lunch", "food_id": food["id"], "grams": 500},
            headers=admin["headers"],
        )

    r = await client.post("/calibration/recalc", headers=admin["headers"])
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True, body
    assert body["real_tdee"] is not None
    assert body["avg_daily_intake"] is not None
    assert body["target_calories"] is not None
    # Losing weight on this intake → real maintenance is above what was eaten.
    assert body["real_tdee"] > body["avg_daily_intake"]


async def test_calibration_requires_auth(client):
    assert (await client.get("/calibration/status")).status_code == 401
