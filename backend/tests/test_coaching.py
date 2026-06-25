"""Coaching slice: hints, data-driven warnings + de-escalation, day guidance."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import update

from app.core.database import AsyncSessionLocal
from app.modules.identity.models import User
from tests.conftest import PROFILE_BODY

FOOD = {"name": "Oats", "kcal_100g": 380, "protein_100g": 13, "fat_100g": 7, "carb_100g": 67}
TODAY = date.today().isoformat()
# An aggressive cut with under-floor protein — fires aggressive_rate + low_protein
# for a brand-new user, independent of any logging history.
AGGRO_BODY = {**PROFILE_BODY, "target_rate_kg_per_week": 0.7, "protein_g_abs": 80}


async def _age_account(email: str, days: int) -> None:
    """Backdate a user's created_at so logging-gap warnings have days to miss."""
    async with AsyncSessionLocal() as s:
        await s.execute(
            update(User)
            .where(User.email == email)
            .values(created_at=datetime.now(UTC) - timedelta(days=days))
        )
        await s.commit()


async def test_hints_are_static_and_populated(client, admin):
    r = await client.get("/coaching/hints", headers=admin["headers"])
    assert r.status_code == 200
    hints = r.json()
    assert len(hints) >= 3
    assert all(h["key"] and h["title"] and h["body"] for h in hints)


async def test_profile_warnings_fire_for_new_user(client, admin):
    # Profile-based warnings (aggressive rate, low protein) are valid from day one.
    await client.put("/profile", json=AGGRO_BODY, headers=admin["headers"])
    r = await client.get("/coaching/warnings", headers=admin["headers"])
    assert r.status_code == 200
    types = {w["type"] for w in r.json()}
    assert "aggressive_rate" in types
    assert "low_protein" in types
    assert all(w["auto_show"] for w in r.json())


async def test_logging_gaps_stay_silent_for_brand_new_account(client, admin):
    # A user who just registered with no logs must NOT be nagged about gaps —
    # they've had no days to miss. The empty-state CTAs guide the first entry.
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    types = {w["type"] for w in (await client.get("/coaching/warnings", headers=admin["headers"])).json()}
    assert "missed_logging" not in types
    assert "irregular_weighing" not in types


async def test_logging_gaps_warn_once_account_has_aged(client, admin):
    # Same empty state, but the account is now a week old → the gaps are real.
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    await _age_account("owner@vitaforge.app", days=10)
    types = {w["type"] for w in (await client.get("/coaching/warnings", headers=admin["headers"])).json()}
    assert "missed_logging" in types
    assert "irregular_weighing" in types


async def test_warning_dismiss_stops_auto_show(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    await _age_account("owner@vitaforge.app", days=10)  # so the gap warning fires
    assert (
        await client.post("/coaching/warnings/missed_logging/dismiss", headers=admin["headers"])
    ).status_code == 204
    warnings = (await client.get("/coaching/warnings", headers=admin["headers"])).json()
    missed = next((w for w in warnings if w["type"] == "missed_logging"), None)
    assert missed is not None
    assert missed["auto_show"] is False


async def test_warning_accept_threshold_deescalates(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    await _age_account("owner@vitaforge.app", days=10)
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
