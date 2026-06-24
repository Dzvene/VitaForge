"""Pure-function tests for the OFF + USDA dump mappers (scripts/import_foods)."""

import json

from scripts.import_foods import _iter_usda, _map_off, _map_usda


def test_map_off_happy_path():
    row = {
        "code": "737628064502",
        "product_name": "Thai peanut noodle kit",
        "brands": "Simply Asia",
        "nutriments": {
            "energy-kcal_100g": 389,
            "proteins_100g": 11,
            "fat_100g": 8,
            "carbohydrates_100g": 70,
        },
    }
    m = _map_off(row)
    assert m["source"] == "off"
    assert m["barcode"] == "737628064502"
    assert m["kcal_100g"] == 389.0
    assert m["protein_100g"] == 11.0


def test_map_off_skips_without_energy_or_name():
    assert _map_off({"product_name": "x", "nutriments": {}}) is None
    assert _map_off({"nutriments": {"energy-kcal_100g": 100}}) is None


def test_map_usda_foundation_per_100g():
    row = {
        "description": "Egg, whole, raw, fresh",
        "foodNutrients": [
            {"nutrient": {"number": "208", "unitName": "kcal"}, "amount": 143},
            {"nutrient": {"number": "203"}, "amount": 12.6},
            {"nutrient": {"number": "204"}, "amount": 9.5},
            {"nutrient": {"number": "205"}, "amount": 0.72},
        ],
    }
    m = _map_usda(row)
    assert m["source"] == "usda"
    assert m["name"].startswith("Egg")
    assert m["kcal_100g"] == 143.0
    assert m["protein_100g"] == 12.6
    assert m["fat_100g"] == 9.5
    assert m["barcode"] is None


def test_map_usda_branded_uses_gtin_and_brand():
    row = {
        "description": "Protein bar",
        "gtinUpc": "00012345678905",
        "brandOwner": "ACME",
        "foodNutrients": [
            {"nutrient": {"number": "208"}, "amount": 350},
            {"nutrient": {"number": "203"}, "amount": 30},
        ],
    }
    m = _map_usda(row)
    assert m["barcode"] == "00012345678905"
    assert m["brand"] == "ACME"
    assert m["carb_100g"] == 0.0  # missing nutrient defaults to 0


def test_map_usda_energy_from_atwater_when_no_208():
    # Foundation foods mostly report energy via Atwater factors (958 specific /
    # 957 general), not 208. Specific (958) wins over general (957).
    row = {
        "description": "Hummus, commercial",
        "foodNutrients": [
            {"nutrient": {"number": "957"}, "amount": 200},
            {"nutrient": {"number": "958"}, "amount": 229},
            {"nutrient": {"number": "203"}, "amount": 7.4},
        ],
    }
    m = _map_usda(row)
    assert m["kcal_100g"] == 229.0
    assert m["protein_100g"] == 7.4


def test_map_usda_skips_without_energy():
    # 268 is kJ (wrong unit) — must not be accepted as kcal.
    row = {
        "description": "Mystery",
        "foodNutrients": [
            {"nutrient": {"number": "203"}, "amount": 5},
            {"nutrient": {"number": "268"}, "amount": 900},
        ],
    }
    assert _map_usda(row) is None


def test_mappers_skip_non_dict_rows():
    # USDA dump arrays carry stray JSON nulls (32 in Foundation 2026-04); both
    # mappers must skip any non-dict row instead of crashing.
    assert _map_usda(None) is None
    assert _map_off(None) is None
    assert _map_usda("x") is None


def test_iter_usda_handles_object_keyed_list(tmp_path):
    doc = {"FoundationFoods": [{"description": "A"}, {"description": "B"}]}
    p = tmp_path / "fdc.json"
    p.write_text(json.dumps(doc), encoding="utf-8")
    assert [r["description"] for r in _iter_usda(p)] == ["A", "B"]


def test_iter_usda_handles_plain_array(tmp_path):
    p = tmp_path / "fdc.json"
    p.write_text(json.dumps([{"description": "A"}]), encoding="utf-8")
    assert [r["description"] for r in _iter_usda(p)] == ["A"]


def test_iter_usda_handles_jsonl(tmp_path):
    p = tmp_path / "fdc.jsonl"
    p.write_text('{"description": "A"}\n{"description": "B"}\n', encoding="utf-8")
    assert [r["description"] for r in _iter_usda(p)] == ["A", "B"]


def test_iter_usda_streams_keyed_object_with_metadata(tmp_path):
    # FDC dumps put metadata keys before the list; the streaming detector must
    # still find BrandedFoods and yield every item (pretty-printed, multi-line).
    import json

    doc = {
        "BrandedFoods": [
            {"description": "Bar", "gtinUpc": "1", "foodNutrients": []},
            {"description": "Soda", "gtinUpc": "2", "foodNutrients": []},
        ]
    }
    p = tmp_path / "branded.json"
    p.write_text(json.dumps(doc, indent=2), encoding="utf-8")
    assert [r["description"] for r in _iter_usda(p)] == ["Bar", "Soda"]


def test_iter_usda_handles_pretty_printed_jsonl_vs_single(tmp_path):
    # A single pretty-printed object (multi-line) must NOT be mistaken for JSONL.
    import json

    p = tmp_path / "single.json"
    p.write_text(json.dumps({"description": "Solo"}, indent=2), encoding="utf-8")
    assert [r["description"] for r in _iter_usda(p)] == ["Solo"]
