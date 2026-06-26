"""Diary slice: logging by grams/portion, day summary, delete, copy, recent."""

from datetime import date, timedelta

from tests.conftest import PROFILE_BODY

CHICKEN = {"name": "Chicken breast", "kcal_100g": 120, "protein_100g": 23, "fat_100g": 2.6,
           "carb_100g": 0}
TODAY = date.today().isoformat()


async def _food(client, headers, payload=None):
    r = await client.post("/foods", json=payload or CHICKEN, headers=headers)
    return r.json()


async def test_log_by_grams_and_summary(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    add = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 200},
        headers=admin["headers"],
    )
    assert add.status_code == 201, add.text
    entry = add.json()
    # 200 g of a 120 kcal/100g food = 240 kcal, 46 g protein.
    assert entry["nutrients"]["kcal"] == 240
    assert entry["nutrients"]["protein_g"] == 46

    summary = await client.get(f"/diary/{TODAY}", headers=admin["headers"])
    s = summary.json()
    assert s["eaten"]["kcal"] == 240
    assert s["remaining"]["calories"] == round(s["target"]["calories"] - 240, 1)
    assert len(s["entries"]) == 1


async def test_log_by_portion(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(
        client, admin["headers"], {**CHICKEN, "portions": [{"name": "fillet", "grams": 150}]}
    )
    portion_id = food["portions"][0]["id"]
    add = await client.post(
        "/diary",
        json={
            "entry_date": TODAY,
            "meal": "dinner",
            "food_id": food["id"],
            "portion_id": portion_id,
            "portion_count": 2,
        },
        headers=admin["headers"],
    )
    assert add.status_code == 201
    # 2 × 150 g = 300 g → 360 kcal.
    assert add.json()["grams"] == 300
    assert add.json()["nutrients"]["kcal"] == 360


async def test_log_requires_exactly_one_quantity(client, admin):
    food = await _food(client, admin["headers"])
    # Both grams and portion → rejected by the model validator.
    both = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 100,
              "portion_id": 1, "portion_count": 1},
        headers=admin["headers"],
    )
    assert both.status_code == 422
    # Neither → rejected.
    neither = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"]},
        headers=admin["headers"],
    )
    assert neither.status_code == 422


async def test_delete_entry(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    add = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 100},
        headers=admin["headers"],
    )
    eid = add.json()["id"]
    assert (await client.delete(f"/diary/{eid}", headers=admin["headers"])).status_code == 204
    s = await client.get(f"/diary/{TODAY}", headers=admin["headers"])
    assert s.json()["entries"] == []


async def test_delete_other_users_entry_404(client, admin, user):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    add = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 100},
        headers=admin["headers"],
    )
    eid = add.json()["id"]
    r = await client.delete(f"/diary/{eid}", headers=user["headers"])
    assert r.status_code == 404


async def test_copy_day(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    yest = (date.today() - timedelta(days=1)).isoformat()
    for meal in ("breakfast", "lunch"):
        await client.post(
            "/diary",
            json={"entry_date": yest, "meal": meal, "food_id": food["id"], "grams": 100},
            headers=admin["headers"],
        )
    r = await client.post(
        "/diary/copy", params={"src": yest, "dst": TODAY}, headers=admin["headers"]
    )
    assert r.status_code == 200
    assert r.json()["copied"] == 2
    today_summary = await client.get(f"/diary/{TODAY}", headers=admin["headers"])
    assert len(today_summary.json()["entries"]) == 2


async def test_recent_foods(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 100},
        headers=admin["headers"],
    )
    r = await client.get("/diary/recent-foods", headers=admin["headers"])
    assert r.status_code == 200
    assert food["id"] in [f["id"] for f in r.json()]


async def test_log_unknown_food_404(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    r = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": 999999, "grams": 100},
        headers=admin["headers"],
    )
    assert r.status_code == 404


async def test_update_entry_grams(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    add = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 100},
        headers=admin["headers"],
    )
    entry_id = add.json()["id"]
    assert add.json()["nutrients"]["kcal"] == 120  # 100 g of 120 kcal/100g

    upd = await client.patch(f"/diary/{entry_id}", json={"grams": 250}, headers=admin["headers"])
    assert upd.status_code == 200, upd.text
    assert upd.json()["grams"] == 250
    assert upd.json()["nutrients"]["kcal"] == 300

    summary = (await client.get(f"/diary/{TODAY}", headers=admin["headers"])).json()
    assert summary["eaten"]["kcal"] == 300
    assert len(summary["entries"]) == 1  # edited in place, not duplicated


async def test_update_entry_not_found(client, admin):
    r = await client.patch("/diary/99999", json={"grams": 100}, headers=admin["headers"])
    assert r.status_code == 404


async def test_cannot_update_other_users_entry(client, admin, user):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    add = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 100},
        headers=admin["headers"],
    )
    eid = add.json()["id"]
    r = await client.patch(f"/diary/{eid}", json={"grams": 200}, headers=user["headers"])
    assert r.status_code == 404


async def test_update_entry_grams_validation(client, admin):
    await client.put("/profile", json=PROFILE_BODY, headers=admin["headers"])
    food = await _food(client, admin["headers"])
    add = await client.post(
        "/diary",
        json={"entry_date": TODAY, "meal": "lunch", "food_id": food["id"], "grams": 100},
        headers=admin["headers"],
    )
    eid = add.json()["id"]
    assert (await client.patch(f"/diary/{eid}", json={"grams": 0}, headers=admin["headers"])).status_code == 422
