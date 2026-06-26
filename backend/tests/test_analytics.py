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
