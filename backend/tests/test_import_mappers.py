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


def test_map_usda_skips_without_energy():
    row = {"description": "Mystery", "foodNutrients": [{"nutrient": {"number": "203"}, "amount": 5}]}
    assert _map_usda(row) is None


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
