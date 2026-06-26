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


# ---- CSV export ------------------------------------------------------------

_FOOD = {"name": "Oats", "kcal_100g": 380, "protein_100g": 13, "fat_100g": 7, "carb_100g": 67}


async def test_export_diary_csv(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = (await client.post("/foods", json=_FOOD, headers=admin["headers"])).json()
    await client.post(
        "/diary",
        json={"entry_date": "2026-06-20", "meal": "lunch", "food_id": food["id"], "grams": 100},
        headers=admin["headers"],
    )

    r = await client.get("/account/export.csv?dataset=diary", headers=admin["headers"])
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers.get("content-disposition", "")
    lines = r.text.strip().splitlines()
    assert lines[0] == "entry_date,meal,food,grams,kcal,protein_g,fat_g,carb_g"
    # 100 g of a 380 kcal/100g food → 380 kcal on the data row.
    assert "2026-06-20,lunch,Oats,100.0,380.0,13.0,7.0,67.0" in lines[1]


async def test_export_weight_csv(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    await client.post(
        "/weight", json={"logged_on": "2026-06-21", "weight_kg": 79.5}, headers=admin["headers"]
    )
    r = await client.get("/account/export.csv?dataset=weight", headers=admin["headers"])
    assert r.status_code == 200
    lines = r.text.strip().splitlines()
    assert lines[0] == "logged_on,weight_kg"
    assert lines[1] == "2026-06-21,79.5"


async def test_export_csv_defaults_to_diary(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    r = await client.get("/account/export.csv", headers=admin["headers"])
    assert r.status_code == 200
    assert r.text.splitlines()[0].startswith("entry_date,")


async def test_export_csv_requires_auth(client):
    assert (await client.get("/account/export.csv")).status_code == 401
