"""Analytics: weekly/monthly rollups over diary + weight."""

from datetime import date, timedelta

from tests.conftest import PROFILE_BODY

FOOD = {"name": "Oats", "kcal_100g": 380, "protein_100g": 13, "fat_100g": 7, "carb_100g": 67}


async def _setup(client, headers):
    await client.put("/profile", json={**PROFILE_BODY}, headers=headers)
    return (await client.post("/foods", json=FOOD, headers=headers)).json()


async def _log_food(client, headers, food_id, on: date, grams=100):
    await client.post(
        "/diary",
        json={"entry_date": on.isoformat(), "meal": "lunch", "food_id": food_id, "grams": grams},
        headers=headers,
    )


async def _log_weight(client, headers, on: date, kg: float):
    await client.post(
        "/weight", json={"logged_on": on.isoformat(), "weight_kg": kg}, headers=headers
    )


async def test_trends_empty_profile(client, admin):
    await _setup(client, admin["headers"])
    r = await client.get("/analytics/trends", headers=admin["headers"])
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["target_kcal"] > 0
    assert len(t["daily"]) == 30
    assert all(p["logged"] is False for p in t["daily"])
    assert t["week"]["days_logged"] == 0
    assert t["week"]["avg"] is None
    assert t["week"]["logging_adherence_pct"] == 0.0
    assert t["month"]["days_logged"] == 0


async def test_trends_averages_logged_days(client, admin):
    food = await _setup(client, admin["headers"])
    today = date.today()
    for i in range(3):  # today, -1, -2 → all inside the 7-day window
        await _log_food(client, admin["headers"], food["id"], today - timedelta(days=i))

    t = (await client.get("/analytics/trends", headers=admin["headers"])).json()
    week = t["week"]
    assert week["days_logged"] == 3
    assert week["days_total"] == 7
    assert week["logging_adherence_pct"] == round(3 / 7 * 100, 1)
    # 100 g of a 380 kcal/100g food = 380 kcal each day → average 380.
    assert week["avg"]["kcal"] == 380.0
    assert week["avg"]["protein_g"] == 13.0
    # 380 is well under a cut target, so no day is "on target".
    assert week["on_target_days"] == 0
    assert week["avg_kcal_delta"] is not None and week["avg_kcal_delta"] < 0
    # The 3 logged days show up in the daily series too.
    assert sum(1 for p in t["daily"] if p["logged"]) == 3


async def test_trends_weight_rate_and_pace(client, admin):
    await _setup(client, admin["headers"])  # goal=lose, target_rate 0.5/wk
    today = date.today()
    await _log_weight(client, admin["headers"], today - timedelta(days=6), 81.0)
    await _log_weight(client, admin["headers"], today, 80.0)

    t = (await client.get("/analytics/trends", headers=admin["headers"])).json()
    assert t["week"]["weight_change_kg"] is not None
    assert t["week"]["weekly_rate_kg"] is not None
    assert t["week"]["weekly_rate_kg"] < 0  # losing
    pace = t["pace"]
    assert pace["goal"] == "lose"
    assert pace["target_rate_kg_per_week"] == -0.5  # magnitude 0.5, lose → negative
    assert pace["actual_rate_kg_per_week"] is not None
    assert pace["on_pace_pct"] is not None


async def test_trends_requires_auth(client):
    r = await client.get("/analytics/trends")
    assert r.status_code == 401


# ---- goal weight + ETA -----------------------------------------------------


async def _set_target(client, headers, target_kg):
    await client.put("/profile", json={**PROFILE_BODY, "target_weight_kg": target_kg}, headers=headers)


async def test_goal_no_target(client, admin):
    await _setup(client, admin["headers"])
    t = (await client.get("/analytics/trends", headers=admin["headers"])).json()
    assert t["goal"]["status"] == "no_target"
    assert t["goal"]["eta_date"] is None


async def test_goal_no_data_without_weights(client, admin):
    await _set_target(client, admin["headers"], 75)
    g = (await client.get("/analytics/trends", headers=admin["headers"])).json()["goal"]
    assert g["status"] == "no_data"
    assert g["target_weight_kg"] == 75


async def test_goal_on_track_projects_eta(client, admin):
    await _set_target(client, admin["headers"], 75)
    today = date.today()
    await _log_weight(client, admin["headers"], today - timedelta(days=6), 81.0)
    await _log_weight(client, admin["headers"], today, 80.0)
    g = (await client.get("/analytics/trends", headers=admin["headers"])).json()["goal"]
    assert g["status"] == "on_track"
    assert g["remaining_kg"] > 0
    assert g["eta_weeks"] is not None and g["eta_weeks"] > 0
    assert g["eta_date"] is not None
    assert g["current_weight_kg"] is not None


async def test_goal_reached(client, admin):
    await _set_target(client, admin["headers"], 80)
    today = date.today()
    await _log_weight(client, admin["headers"], today - timedelta(days=6), 80.1)
    await _log_weight(client, admin["headers"], today, 80.0)
    g = (await client.get("/analytics/trends", headers=admin["headers"])).json()["goal"]
    assert g["status"] == "reached"
    assert g["progress_pct"] == 100.0


async def test_goal_off_track_when_moving_away(client, admin):
    # Target below current, but weight is going UP → off track, no ETA.
    await _set_target(client, admin["headers"], 75)
    today = date.today()
    await _log_weight(client, admin["headers"], today - timedelta(days=6), 80.0)
    await _log_weight(client, admin["headers"], today, 81.0)
    g = (await client.get("/analytics/trends", headers=admin["headers"])).json()["goal"]
    assert g["status"] == "off_track"
    assert g["eta_weeks"] is None
