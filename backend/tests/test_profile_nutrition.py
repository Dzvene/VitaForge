"""Profile upsert + the Norm (nutrition target) it drives."""

from tests.conftest import PROFILE_BODY


async def test_get_profile_before_setup_404(client, admin):
    r = await client.get("/profile", headers=admin["headers"])
    assert r.status_code == 404


async def test_upsert_then_get_profile(client, admin):
    up = await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    assert up.status_code == 200
    body = up.json()
    assert body["goal"] == "lose"
    assert body["current_weight_kg"] == 80

    got = await client.get("/profile", headers=admin["headers"])
    assert got.status_code == 200
    assert got.json()["id"] == body["id"]


async def test_upsert_is_idempotent_update(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    changed = {**PROFILE_BODY, "current_weight_kg": 75, "goal": "maintain"}
    r = await client.put("/profile", json=changed, headers=admin["headers"])
    assert r.json()["current_weight_kg"] == 75
    assert r.json()["goal"] == "maintain"
    # Still exactly one profile (an update, not an insert): the id is stable.
    got = await client.get("/profile", headers=admin["headers"])
    assert got.json()["id"] == r.json()["id"]


async def test_profile_validation_rejects_out_of_range(client, admin):
    bad = {**PROFILE_BODY, "age": 5}
    r = await client.put("/profile", json=bad, headers=admin["headers"])
    assert r.status_code == 422


async def test_target_during_baseline_equals_maintenance(client, admin):
    """Before calibration the target holds at maintenance regardless of a lose goal (§4.4)."""
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    r = await client.get("/nutrition/target", headers=admin["headers"])
    assert r.status_code == 200
    t = r.json()
    assert t["calibrated"] is False
    assert t["maintenance_source"] == "formula"
    # Target == maintenance while still calibrating.
    assert round(t["target_calories"]) == round(t["maintenance_kcal"])
    assert t["protein_g"] > 0 and t["fat_g"] > 0 and t["carb_g"] >= 0


async def test_target_requires_profile(client, admin):
    # No profile yet → recompute raises 404.
    r = await client.get("/nutrition/target", headers=admin["headers"])
    assert r.status_code == 404


async def test_recompute_tracks_weight_change(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    first = (await client.get("/nutrition/target", headers=admin["headers"])).json()
    await client.put(
        "/profile", json={**PROFILE_BODY, "current_weight_kg": 70}, headers=admin["headers"]
    )
    second = (await client.post("/nutrition/recompute", headers=admin["headers"])).json()
    # Lighter body → lower maintenance.
    assert second["maintenance_kcal"] < first["maintenance_kcal"]


async def test_protein_override_applied(client, admin):
    body = {**PROFILE_BODY, "protein_g_abs": 200}
    await client.put("/profile", json=body, headers=admin["headers"])
    t = (await client.get("/nutrition/target", headers=admin["headers"])).json()
    assert round(t["protein_g"]) == 200


async def test_target_requires_auth(client):
    assert (await client.get("/nutrition/target")).status_code == 401
