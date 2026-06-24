"""Public preview slice (guest mode) — no auth, no persistence.

Two surfaces:
1. `/public/*` stateless engine previews (nutrition / weight trend / calibration).
2. The foods read endpoints made guest-accessible (shared catalog only).

The previews must agree with the authenticated slices — onboarding a guest's
numbers should reproduce the same target — so we assert the public nutrition
preview matches `/nutrition/target` for an identical profile.
"""

PROFILE = {
    "sex": "male",
    "age": 30,
    "height_cm": 180,
    "current_weight_kg": 80,
    "activity_level": "moderate",
    "goal": "lose",
    "target_rate_kg_per_week": 0.5,
}


# ---- nutrition preview -------------------------------------------------------

async def test_nutrition_preview_formula_holds_at_maintenance(client):
    """No calibrated figure yet → baseline phase holds at maintenance (§4.4)."""
    r = await client.post("/public/nutrition/preview", json={"profile": PROFILE})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["calibrated"] is False
    assert body["maintenance_source"] == "formula"
    # Baseline: target == maintenance regardless of the lose goal.
    assert body["target_calories"] == round(body["maintenance_kcal"])
    assert body["protein_g"] > 0 and body["fat_g"] > 0


async def test_nutrition_preview_calibrated_applies_goal(client):
    """With a real maintenance figure the lose goal cuts below it, clamp-safe."""
    r = await client.post(
        "/public/nutrition/preview",
        json={"profile": PROFILE, "maintenance_kcal": 2600},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["calibrated"] is True
    assert body["maintenance_source"] == "calibrated"
    assert body["maintenance_kcal"] == 2600
    # A lose goal must land strictly below maintenance.
    assert body["target_calories"] < 2600


async def test_preview_matches_authenticated_target(client, make_user):
    """Guest preview == post-registration target for the same profile."""
    pub = (await client.post("/public/nutrition/preview", json={"profile": PROFILE})).json()

    u = await make_user("guest-parity@vitaforge.app")
    saved = await client.put("/profile", json=PROFILE, headers=u["headers"])
    assert saved.status_code == 200, saved.text
    authed = (await client.get("/nutrition/target", headers=u["headers"])).json()

    assert pub["target_calories"] == authed["target_calories"]
    assert pub["protein_g"] == authed["protein_g"]
    assert pub["fat_g"] == authed["fat_g"]
    assert pub["carb_g"] == authed["carb_g"]


async def test_nutrition_preview_validates_inputs(client):
    bad = {**PROFILE, "age": 5}  # below ge=14
    r = await client.post("/public/nutrition/preview", json={"profile": bad})
    assert r.status_code == 422


async def test_nutrition_preview_needs_no_token(client):
    r = await client.post("/public/nutrition/preview", json={"profile": PROFILE})
    assert r.status_code != 401


# ---- weight trend -----------------------------------------------------------

async def test_weight_trend_emits_ema(client):
    points = [
        {"logged_on": "2026-06-01", "weight_kg": 80.0},
        {"logged_on": "2026-06-02", "weight_kg": 79.6},
        {"logged_on": "2026-06-03", "weight_kg": 80.2},
        {"logged_on": "2026-06-04", "weight_kg": 79.4},
    ]
    r = await client.post("/public/weight/trend", json={"points": points})
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["points"]) == 4
    assert body["latest_trend_kg"] == body["points"][-1]["trend_kg"]
    # First trend point seeds on the first reading.
    assert body["points"][0]["trend_kg"] == 80.0


async def test_weight_trend_sorts_unordered_input(client):
    points = [
        {"logged_on": "2026-06-03", "weight_kg": 80.2},
        {"logged_on": "2026-06-01", "weight_kg": 80.0},
    ]
    r = await client.post("/public/weight/trend", json={"points": points})
    out = r.json()["points"]
    assert [p["logged_on"] for p in out] == ["2026-06-01", "2026-06-03"]


async def test_weight_trend_empty(client):
    r = await client.post("/public/weight/trend", json={"points": []})
    assert r.status_code == 200
    assert r.json() == {"points": [], "latest_trend_kg": None}


# ---- calibration preview ----------------------------------------------------

def _consecutive(start_day, weights, kcal):
    """Build aligned daily weigh-ins + intake from 2026-06-01."""
    from datetime import date, timedelta

    base = date(2026, 6, 1)
    weighs = [
        {"logged_on": (base + timedelta(days=i)).isoformat(), "weight_kg": w}
        for i, w in enumerate(weights)
    ]
    intake = [
        {"day": (base + timedelta(days=i)).isoformat(), "kcal": k}
        for i, k in enumerate(kcal)
    ]
    return weighs, intake


async def test_calibration_preview_estimates_real_tdee(client):
    # 14 days, steady ~2200 kcal, slight downward trend → a real TDEE estimate.
    weights = [80.0 - 0.03 * i for i in range(14)]
    kcal = [2200.0] * 14
    weighs, intake = _consecutive(None, weights, kcal)
    r = await client.post(
        "/public/calibration/preview", json={"weights": weighs, "intake": intake}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["real_tdee"] > 2200  # losing on 2200 → maintenance is higher
    assert body["days"] == 13
    assert body["avg_daily_intake"] == 2200.0


async def test_calibration_preview_insufficient_data(client):
    r = await client.post(
        "/public/calibration/preview",
        json={"weights": [{"logged_on": "2026-06-01", "weight_kg": 80}], "intake": []},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is False
    assert body["reason"]


async def test_calibration_preview_too_many_missing_logs(client):
    # 14 days of weigh-ins but only 2 food logs → soft-degrade refusal.
    weights = [80.0 - 0.03 * i for i in range(14)]
    weighs, _ = _consecutive(None, weights, [])
    intake = [
        {"day": "2026-06-01", "kcal": 2200},
        {"day": "2026-06-14", "kcal": 2200},
    ]
    r = await client.post(
        "/public/calibration/preview", json={"weights": weighs, "intake": intake}
    )
    body = r.json()
    assert body["ok"] is False
    assert "food log" in body["reason"]


# ---- guest-mode foods (shared catalog only) ---------------------------------

SHARED = {"name": "Oats, rolled", "kcal_100g": 379, "protein_100g": 13, "carb_100g": 67}


async def test_guest_search_sees_shared_catalog(client, admin):
    # admin publishes a shared (owner-less) product via the admin route.
    r = await client.post("/admin/foods", json=SHARED, headers=admin["headers"])
    assert r.status_code == 201
    # guest (no token) finds it.
    found = await client.get("/foods/search", params={"q": "oats"})
    assert found.status_code == 200
    assert any("Oats" in f["name"] for f in found.json())


async def test_guest_does_not_see_users_custom_food(client, admin):
    # admin's own custom (owner-scoped) product must be invisible to a guest.
    r = await client.post(
        "/foods", json={"name": "Secret shake", "kcal_100g": 200}, headers=admin["headers"]
    )
    fid = r.json()["id"]
    got = await client.get(f"/foods/{fid}")  # no token
    assert got.status_code == 404


async def test_guest_barcode_shared_only(client, admin):
    payload = {**SHARED, "barcode": "4006381333931"}
    await client.post("/admin/foods", json=payload, headers=admin["headers"])
    r = await client.get(f"/foods/barcode/{payload['barcode']}")  # no token
    assert r.status_code == 200
    assert r.json()["barcode"] == payload["barcode"]
