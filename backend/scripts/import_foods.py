"""Import food data from Open Food Facts / USDA dumps into the local DB (spec §7).

The product DB is populated ahead of time from downloaded dumps so search and
barcode lookup never depend on an external service's uptime.

Usage (from backend/, venv active):
    python -m scripts.import_foods off   path/to/openfoodfacts.jsonl
    python -m scripts.import_foods usda  path/to/usda_fdc.json

Open Food Facts is a JSONL dump (one product per line). USDA FoodData Central
ships either as one big JSON document (a list, or an object keyed by
``FoundationFoods`` / ``SRLegacyFoods`` / ``BrandedFoods`` / ``foods``) or as
JSONL — both are accepted. OFF rows are upserted by (source, barcode); USDA rows
by (source, barcode) when a GTIN/UPC is present, otherwise by (source, name).
"""

import asyncio
import json
import sys
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.foods.models import Food

# USDA FoodData Central nutrient numbers (per 100 g for Foundation / SR Legacy).
_USDA_ENERGY_KCAL = "208"
_USDA_PROTEIN = "203"
_USDA_FAT = "204"
_USDA_CARB = "205"
# Keys under which a USDA full-download JSON object nests its food list.
_USDA_LIST_KEYS = ("FoundationFoods", "SRLegacyFoods", "BrandedFoods", "SurveyFoods", "foods")


def _iter_jsonl(path: Path) -> Iterator[dict]:
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def _iter_usda(path: Path) -> Iterator[dict]:
    """Yield USDA food records from either a single JSON doc or a JSONL file."""
    text = path.read_text(encoding="utf-8")
    try:
        doc = json.loads(text)
    except json.JSONDecodeError:
        # Not a single JSON document (e.g. JSONL, where the first line parses but
        # trailing lines are "extra data") — iterate line by line instead.
        yield from _iter_jsonl(path)
        return
    if isinstance(doc, list):
        yield from doc
        return
    if isinstance(doc, dict):
        for key in _USDA_LIST_KEYS:
            if isinstance(doc.get(key), list):
                yield from doc[key]
                return
        # A single food object.
        yield doc
        return
    raise SystemExit(f"unrecognised USDA JSON structure in {path}")


def _map_off(row: dict) -> dict | None:
    """Map an Open Food Facts product to our Food fields. Skip rows missing energy."""
    nutr = row.get("nutriments", {})
    kcal = nutr.get("energy-kcal_100g")
    if kcal is None or not row.get("product_name"):
        return None
    return {
        "source": "off",
        "barcode": str(row.get("code")) if row.get("code") else None,
        "name": row["product_name"][:512],
        "brand": (row.get("brands") or None),
        "kcal_100g": float(kcal),
        "protein_100g": float(nutr.get("proteins_100g") or 0),
        "fat_100g": float(nutr.get("fat_100g") or 0),
        "carb_100g": float(nutr.get("carbohydrates_100g") or 0),
    }


def _usda_nutrients(row: dict) -> dict[str, float]:
    """Collect per-100 g nutrient amounts keyed by FDC nutrient number."""
    out: dict[str, float] = {}
    for fn in row.get("foodNutrients", []):
        nutrient = fn.get("nutrient") or {}
        number = str(nutrient.get("number") or fn.get("nutrientNumber") or "")
        amount = fn.get("amount", fn.get("value"))
        if number and amount is not None and number not in out:
            try:
                out[number] = float(amount)
            except (TypeError, ValueError):
                continue
    return out


def _map_usda(row: dict) -> dict | None:
    """Map a USDA FoodData Central food to our Food fields. Skip rows missing energy.

    Foundation and SR Legacy foods carry per-100 g amounts in ``foodNutrients``;
    that is the canonical basis we store. Rows without a usable energy value are
    skipped rather than guessed.
    """
    name = row.get("description") or row.get("name")
    if not name:
        return None
    nutr = _usda_nutrients(row)
    kcal = nutr.get(_USDA_ENERGY_KCAL)
    if kcal is None:
        return None
    barcode = row.get("gtinUpc") or row.get("barcode")
    return {
        "source": "usda",
        "barcode": str(barcode)[:32] if barcode else None,
        "name": str(name)[:512],
        "brand": (row.get("brandOwner") or row.get("brandName") or None),
        "kcal_100g": float(kcal),
        "protein_100g": float(nutr.get(_USDA_PROTEIN) or 0),
        "fat_100g": float(nutr.get(_USDA_FAT) or 0),
        "carb_100g": float(nutr.get(_USDA_CARB) or 0),
    }


async def _import(source: str, path: Path) -> None:
    if source == "off":
        records, mapper = _iter_jsonl(path), _map_off
    elif source == "usda":
        records, mapper = _iter_usda(path), _map_usda
    else:
        raise SystemExit(f"unknown source {source!r} (expected 'off' or 'usda')")

    inserted = updated = skipped = 0
    async with AsyncSessionLocal() as db:
        for raw in records:
            mapped = mapper(raw)
            if mapped is None:
                skipped += 1
                continue
            # Upsert key: barcode when present, else name (within the source).
            if mapped["barcode"]:
                key = Food.barcode == mapped["barcode"]
            else:
                key = Food.name == mapped["name"]
            existing = (
                await db.execute(
                    select(Food).where(Food.source == source, key, Food.owner_user_id.is_(None))
                )
            ).scalars().first()
            if existing is None:
                db.add(Food(**mapped))
                inserted += 1
            else:
                for k, v in mapped.items():
                    setattr(existing, k, v)
                updated += 1
            if (inserted + updated) % 1000 == 0:
                await db.commit()
        await db.commit()
    print(f"done: inserted={inserted} updated={updated} skipped={skipped}")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: python -m scripts.import_foods <off|usda> <path>")
    asyncio.run(_import(sys.argv[1], Path(sys.argv[2])))


if __name__ == "__main__":
    main()
