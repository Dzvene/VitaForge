"""Bilingual staple catalog: data sanity + RU/DE search and localized names.

Regression for "поиск на русском не работает" — searching "творог"/"Quark"
returned nothing because the catalog was USDA-English only.
"""

from scripts.seed_staples_i18n import _aliases, _load, seed


def test_staples_data_is_sane():
    items = _load()
    assert len(items) >= 80
    names = [i["name"] for i in items]
    assert len(names) == len(set(names)), "duplicate staple names"
    for i in items:
        assert i["name_ru"] and i["name_de"], i["name"]
        assert i["kcal"] >= 0 and i["p"] >= 0 and i["f"] >= 0 and i["c"] >= 0
        atwater = i["p"] * 4 + i["c"] * 4 + i["f"] * 9
        assert abs(atwater - i["kcal"]) <= max(60, 0.35 * i["kcal"] + 40), i["name"]
        for p in i.get("portions", []):
            assert p["grams"] > 0 and p["name"]


def test_aliases_are_lowercased_and_include_localized_names():
    item = {"name": "Cottage cheese", "name_ru": "Творог", "name_de": "Quark", "syn": ["tvorog"]}
    a = _aliases(item)
    assert a == a.lower()
    for term in ("cottage cheese", "творог", "quark", "tvorog"):
        assert term in a


async def test_staples_seed_idempotent(client, admin):
    inserted, updated = await seed()
    assert inserted >= 80
    assert updated == 0
    inserted2, updated2 = await seed()
    assert inserted2 == 0
    assert updated2 == inserted


async def test_search_finds_staple_in_russian_and_german(client, admin):
    await seed()
    h = admin["headers"]
    for q in ("творог", "Quark", "tvorog"):
        r = await client.get("/foods/search", params={"q": q}, headers=h)
        assert r.status_code == 200
        names = " ".join(f["name"] for f in r.json())
        assert r.json(), f"no result for {q!r}"
        # the cottage-cheese staple is found regardless of query language
        assert any(
            "Творог" in f["name"] or "Quark" in f["name"] or "Cottage" in f["name"]
            for f in r.json()
        ), f"{q!r} → {names}"


async def test_search_localizes_display_name(client, admin):
    await seed()
    base = admin["headers"]
    ru = await client.get(
        "/foods/search", params={"q": "творог"}, headers={**base, "Accept-Language": "ru"}
    )
    de = await client.get(
        "/foods/search", params={"q": "Quark"}, headers={**base, "Accept-Language": "de"}
    )
    en = await client.get(
        "/foods/search", params={"q": "cottage cheese"}, headers={**base, "Accept-Language": "en"}
    )
    assert ru.json()[0]["name"] == "Творог"
    assert de.json()[0]["name"] == "Quark"
    assert en.json()[0]["name"] == "Cottage cheese"
