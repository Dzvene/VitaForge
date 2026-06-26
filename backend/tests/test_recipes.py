"""Recipes: CRUD, totals, isolation, and one-tap logging into the diary."""

from datetime import date

from tests.conftest import PROFILE_BODY

OATS = {"name": "Oats", "kcal_100g": 380, "protein_100g": 13, "fat_100g": 7, "carb_100g": 67}
MILK = {"name": "Milk", "kcal_100g": 60, "protein_100g": 3, "fat_100g": 3, "carb_100g": 5}


async def _foods(client, headers):
    a = (await client.post("/foods", json=OATS, headers=headers)).json()
    b = (await client.post("/foods", json=MILK, headers=headers)).json()
    return a["id"], b["id"]


async def _make_recipe(client, headers, oats, milk):
    body = {
        "name": "Porridge",
        "components": [
            {"food_id": oats, "grams": 80},
            {"food_id": milk, "grams": 200},
        ],
    }
    r = await client.post("/recipes", json=body, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


async def test_create_computes_totals(client, admin):
    oats, milk = await _foods(client, admin["headers"])
    rec = await _make_recipe(client, admin["headers"], oats, milk)
    # 80 g oats = 304 kcal; 200 g milk = 120 kcal → 424.
    assert rec["totals"]["kcal"] == 424.0
    assert len(rec["components"]) == 2
    assert rec["components"][0]["food_name"] == "Oats"


async def test_list_and_get(client, admin):
    oats, milk = await _foods(client, admin["headers"])
    rec = await _make_recipe(client, admin["headers"], oats, milk)
    lst = (await client.get("/recipes", headers=admin["headers"])).json()
    assert len(lst) == 1 and lst[0]["id"] == rec["id"]
    one = (await client.get(f"/recipes/{rec['id']}", headers=admin["headers"])).json()
    assert one["name"] == "Porridge"


async def test_update_replaces_components(client, admin):
    oats, milk = await _foods(client, admin["headers"])
    rec = await _make_recipe(client, admin["headers"], oats, milk)
    upd = await client.put(
        f"/recipes/{rec['id']}",
        json={"name": "Just oats", "components": [{"food_id": oats, "grams": 100}]},
        headers=admin["headers"],
    )
    assert upd.status_code == 200
    body = upd.json()
    assert body["name"] == "Just oats"
    assert len(body["components"]) == 1
    assert body["totals"]["kcal"] == 380.0


async def test_delete(client, admin):
    oats, milk = await _foods(client, admin["headers"])
    rec = await _make_recipe(client, admin["headers"], oats, milk)
    assert (await client.delete(f"/recipes/{rec['id']}", headers=admin["headers"])).status_code == 204
    assert (await client.get(f"/recipes/{rec['id']}", headers=admin["headers"])).status_code == 404


async def test_log_expands_into_diary_entries(client, admin):
    await client.put("/profile", json={**PROFILE_BODY}, headers=admin["headers"])
    oats, milk = await _foods(client, admin["headers"])
    rec = await _make_recipe(client, admin["headers"], oats, milk)
    today = date.today().isoformat()

    r = await client.post(
        f"/recipes/{rec['id']}/log",
        json={"entry_date": today, "meal": "breakfast"},
        headers=admin["headers"],
    )
    assert r.status_code == 200
    assert r.json()["added"] == 2

    # The day now totals the recipe (424 kcal) across two entries.
    day = (await client.get(f"/diary/{today}", headers=admin["headers"])).json()
    assert len(day["entries"]) == 2
    assert round(day["eaten"]["kcal"]) == 424


async def test_create_rejects_unknown_food(client, admin):
    r = await client.post(
        "/recipes",
        json={"name": "Bogus", "components": [{"food_id": 999999, "grams": 100}]},
        headers=admin["headers"],
    )
    assert r.status_code == 422


async def test_recipes_are_per_user(client, admin, user):
    oats, milk = await _foods(client, admin["headers"])
    rec = await _make_recipe(client, admin["headers"], oats, milk)
    # The other user sees none of the admin's recipes and can't fetch one.
    assert (await client.get("/recipes", headers=user["headers"])).json() == []
    assert (await client.get(f"/recipes/{rec['id']}", headers=user["headers"])).status_code == 404


async def test_recipes_require_auth(client):
    assert (await client.get("/recipes")).status_code == 401
