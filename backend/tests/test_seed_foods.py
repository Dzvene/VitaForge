"""The curated food seed: data sanity + it lands as a searchable shared catalog."""

from scripts.seed_foods import _load, seed


def test_seed_data_is_sane():
    items = _load()
    assert len(items) >= 80
    names = [i["name"] for i in items]
    assert len(names) == len(set(names)), "seed has duplicate names"
    # Alcoholic drinks carry ~7 kcal/g of ethanol that the P/F/C Atwater sum
    # cannot account for, so they are exempt from the macro-fit sanity check.
    alcoholic = ("Wine", "Beer")
    for i in items:
        assert i["kcal"] >= 0 and i["p"] >= 0 and i["f"] >= 0 and i["c"] >= 0
        if any(a in i["name"] for a in alcoholic):
            continue
        # Macros must roughly fit the calories (Atwater), allowing rounding + fibre.
        atwater = i["p"] * 4 + i["c"] * 4 + i["f"] * 9
        assert abs(atwater - i["kcal"]) <= max(60, 0.35 * i["kcal"] + 40), i["name"]
        for p in i.get("portions", []):
            assert p["grams"] > 0 and p["name"]


async def test_seed_populates_and_is_searchable(client, admin):
    inserted, updated = await seed()
    assert inserted >= 80
    assert updated == 0

    # Re-running is idempotent: no new rows, everything updates in place.
    inserted2, updated2 = await seed()
    assert inserted2 == 0
    assert updated2 == inserted

    # Seed foods are shared (owner NULL) → visible to any user via search.
    r = await client.get("/foods/search", params={"q": "chicken"}, headers=admin["headers"])
    assert r.status_code == 200
    assert any("Chicken" in f["name"] for f in r.json())

    # A seeded portion is exposed.
    egg = await client.get("/foods/search", params={"q": "Egg, whole"}, headers=admin["headers"])
    portions = egg.json()[0]["portions"]
    assert any(p["name"] == "large egg" and p["grams"] == 50 for p in portions)
