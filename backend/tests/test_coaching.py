"""Coaching slice: hints, data-driven warnings + de-escalation, day guidance."""

from datetime import date

from tests.conftest import PROFILE_BODY

FOOD = {"name": "Oats", "kcal_100g": 380, "protein_100g": 13, "fat_100g": 7, "carb_100g": 67}
TODAY = date.today().isoformat()


async def test_hints_are_static_and_populated(client, admin):
    r = await client.get("/coaching/hints", headers=admin["headers"])
    assert r.status_code == 200
    hints = r.json()
    assert len(hints) >= 3
    assert all(h["key"] and h["title"] and h["body"] for h in hints)


async def test_warnings_fire_for_aggressive_low_protein_and_gaps(client, admin):
    # Aggressive loss rate + low protein, and a brand-new user with no logs.
    body = {**PROFILE_BODY, "target_rate_kg_per_week": 0.7, "protein_g_abs": 80}
    await client.put("/profile", json=body, headers=admin["headers"])
    r = await client.get("/coaching/warnings", headers=admin["headers"])
    assert r.status_code == 200
    types = {w["type"] for w in r.json()}
    assert "aggressive_rate" in types
    assert "low_protein" in types
    # No logs this week → logging/weighing nudges.
    assert "missed_logging" in types
    assert "irregular_weighing" in types
    # New user → warnings still auto-show.
    assert all(w["auto_show"] for w in r.json())


async def test_warning_dismiss_stops_auto_show(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    assert (
        await client.post("/coaching/warnings/missed_logging/dismiss", headers=admin["headers"])
    ).status_code == 204
    warnings = (await client.get("/coaching/warnings", headers=admin["headers"])).json()
    missed = next((w for w in warnings if w["type"] == "missed_logging"), None)
    assert missed is not None
    assert missed["auto_show"] is False


async def test_warning_accept_threshold_deescalates(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    # Accept three times (warning_accept_threshold = 3) → no longer auto-shows.
    for _ in range(3):
        await client.post("/coaching/warnings/irregular_weighing/accept", headers=admin["headers"])
    warnings = (await client.get("/coaching/warnings", headers=admin["headers"])).json()
    w = next((w for w in warnings if w["type"] == "irregular_weighing"), None)
    assert w is not None and w["auto_show"] is False


async def test_warnings_empty_without_profile(client, admin):
    r = await client.get("/coaching/warnings", headers=admin["headers"])
    assert r.status_code == 200
    assert r.json() == []


async def test_day_guidance_overage_is_supportive(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = (await client.post("/foods", json=FOOD, headers=admin["headers"])).json()
    # Log well over target (1000 g oats ≈ 3800 kcal > 110 % of any sane target).
    await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "dinner", "food_id": food["id"], "grams": 1000},
        headers=admin["headers"],
    )
    r = await client.get(f"/coaching/day-guidance/{TODAY}", headers=admin["headers"])
    assert r.status_code == 200
    kinds = {i["kind"] for i in r.json()["items"]}
    assert "overage" in kinds


async def test_day_guidance_requires_auth(client):
    assert (await client.get(f"/coaching/day-guidance/{TODAY}")).status_code == 401
