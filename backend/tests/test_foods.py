"""Foods slice: search, barcode, custom products, favorites, visibility."""

CHICKEN = {
    "name": "Chicken breast, raw",
    "kcal_100g": 120,
    "protein_100g": 23,
    "fat_100g": 2.6,
    "carb_100g": 0,
    "barcode": "1111111111111",
}
RICE = {"name": "White rice, cooked", "kcal_100g": 130, "protein_100g": 2.7, "carb_100g": 28}


async def _create(client, headers, payload):
    r = await client.post("/foods", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


async def test_create_and_get_custom_food(client, admin):
    food = await _create(client, admin["headers"], CHICKEN)
    assert food["source"] == "custom"
    got = await client.get(f"/foods/{food['id']}", headers=admin["headers"])
    assert got.status_code == 200
    assert got.json()["name"] == CHICKEN["name"]


async def test_create_food_with_portions(client, admin):
    payload = {**RICE, "portions": [{"name": "cup", "grams": 158}]}
    food = await _create(client, admin["headers"], payload)
    assert food["portions"][0]["name"] == "cup"
    assert food["portions"][0]["grams"] == 158


async def test_search_matches_substring_case_insensitive(client, admin):
    await _create(client, admin["headers"], CHICKEN)
    r = await client.get("/foods/search", params={"q": "chicken"}, headers=admin["headers"])
    assert r.status_code == 200
    assert any("Chicken" in f["name"] for f in r.json())


async def test_search_empty_query_rejected(client, admin):
    r = await client.get("/foods/search", params={"q": ""}, headers=admin["headers"])
    assert r.status_code == 422


async def test_barcode_lookup(client, admin):
    await _create(client, admin["headers"], CHICKEN)
    r = await client.get(f"/foods/barcode/{CHICKEN['barcode']}", headers=admin["headers"])
    assert r.status_code == 200
    assert r.json()["barcode"] == CHICKEN["barcode"]


async def test_barcode_unknown_404(client, admin):
    r = await client.get("/foods/barcode/0000000000000", headers=admin["headers"])
    assert r.status_code == 404


async def test_custom_food_not_visible_to_other_user(client, user, admin):
    # admin owns this custom food; the plain user must not see it.
    food = await _create(client, admin["headers"], CHICKEN)
    r = await client.get(f"/foods/{food['id']}", headers=user["headers"])
    assert r.status_code == 404


async def test_shared_food_visible_to_all(client, admin, user):
    # Admin creates a SHARED catalog product via the admin route (owner-less).
    r = await client.post("/admin/foods", json=RICE, headers=admin["headers"])
    assert r.status_code == 201
    shared_id = r.json()["id"]
    # Plain user sees it.
    got = await client.get(f"/foods/{shared_id}", headers=user["headers"])
    assert got.status_code == 200


async def test_favorites_add_list_remove(client, admin):
    food = await _create(client, admin["headers"], CHICKEN)
    fid = food["id"]
    assert (await client.put(f"/foods/{fid}/favorite", headers=admin["headers"])).status_code == 204
    favs = await client.get("/foods/favorites", headers=admin["headers"])
    assert [f["id"] for f in favs.json()] == [fid]
    # Adding again is idempotent (no duplicate).
    await client.put(f"/foods/{fid}/favorite", headers=admin["headers"])
    favs2 = await client.get("/foods/favorites", headers=admin["headers"])
    assert len(favs2.json()) == 1
    # Remove.
    assert (
        await client.delete(f"/foods/{fid}/favorite", headers=admin["headers"])
    ).status_code == 204
    favs3 = await client.get("/foods/favorites", headers=admin["headers"])
    assert favs3.json() == []


async def test_favorite_nonexistent_food_404(client, admin):
    r = await client.put("/foods/999999/favorite", headers=admin["headers"])
    assert r.status_code == 404


async def test_food_kcal_over_limit_rejected(client, admin):
    r = await client.post("/foods", json={**CHICKEN, "kcal_100g": 5000}, headers=admin["headers"])
    assert r.status_code == 422
