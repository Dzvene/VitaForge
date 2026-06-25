"""Account self-service: GDPR data export + irreversible deletion."""

from tests.conftest import PROFILE_BODY


async def test_export_returns_all_owned_data(client, admin):
    # Give the user some data across slices.
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    await client.post("/weight", json={"logged_on": "2026-06-20", "weight_kg": 80.0}, headers=admin["headers"])

    r = await client.get("/account/export", headers=admin["headers"])
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["id"] == admin["user"]["id"]
    # password hash is never exported
    assert "password_hash" not in data["user"]
    # the expected sections are present
    for key in (
        "profile",
        "nutrition_target",
        "calibration_status",
        "weight_logs",
        "diary_entries",
        "favorites",
        "custom_foods",
        "coaching_state",
    ):
        assert key in data
    assert data["profile"] is not None
    assert any(w["weight_kg"] == 80.0 for w in data["weight_logs"])


async def test_export_requires_auth(client):
    r = await client.get("/account/export")
    assert r.status_code == 401


async def test_delete_wrong_password_rejected(client, admin):
    r = await client.post(
        "/account/delete", json={"password": "not-the-password"}, headers=admin["headers"]
    )
    assert r.status_code == 401
    # account still usable
    me = await client.get("/auth/me", headers=admin["headers"])
    assert me.status_code == 200


async def test_delete_account_erases_and_cascades(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    await client.post("/weight", json={"logged_on": "2026-06-20", "weight_kg": 80.0}, headers=admin["headers"])

    r = await client.post(
        "/account/delete", json={"password": "Sup3rSecret!"}, headers=admin["headers"]
    )
    assert r.status_code == 204

    # The token's user no longer exists → unauthorized.
    me = await client.get("/auth/me", headers=admin["headers"])
    assert me.status_code == 401

    # Re-registering the same email works (row is truly gone) and is the new owner.
    again = await client.post(
        "/auth/register", json={"email": "owner@vitaforge.app", "password": "Sup3rSecret!"}
    )
    assert again.status_code == 201
