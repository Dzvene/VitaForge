"""Import food data from Open Food Facts / USDA dumps into the local DB (spec §7).

The product DB is populated ahead of time from downloaded dumps so search and
barcode lookup never depend on an external service's uptime.

Usage (from backend/, venv active):
    python -m scripts.import_foods off   path/to/openfoodfacts.jsonl
    python -m scripts.import_foods usda  path/to/usda_fdc.json

Open Food Facts is a JSONL dump (one product per line). USDA FoodData Central
ships either as one big JSON document (a list, or an object keyed by
``FoundationFoods`` / ``SRLegacyFoods`` / ``BrandedFoods`` / ``foods``) or as
JSONL — both are accepted.

Everything is **streamed** (OFF line by line, USDA via ijson over the array),
never read whole into memory — the USDA Branded dump alone is multi-GB and would
OOM a small box otherwise. Inserts are batched and the import is insert-only:
existing shared rows for the same source are loaded once and used to skip
duplicates, so re-running is idempotent without a per-row SELECT round-trip.
Identity key is (source, barcode) when a GTIN/UPC is present, else (source, name).
"""

import asyncio
import json
import sys
from collections.abc import Iterator
from pathlib import Path

import ijson
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.foods.models import Food
from app.modules.identity.models import (
    User,  # noqa: F401 — register `users` so the foods FK resolves
)

_BATCH = 5000

# USDA FoodData Central nutrient numbers (per 100 g for Foundation / SR Legacy).
# Energy in kcal is reported under different numbers across datasets: SR Legacy
# and Branded use 208; Foundation mostly uses Atwater factors (958 specific, 957
# general) and only ~25% carry 208. Try them in order of preference; 268 is kJ
# (wrong unit) and is intentionally excluded.
_USDA_ENERGY_KCAL = ("208", "958", "957")
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


def _looks_like_jsonl(path: Path) -> bool:
    """True when the file is JSON-lines (≥2 consecutive standalone JSON values).

    A pretty-printed single JSON doc also spans many lines, so we cannot count
    lines. Instead: if the first two non-empty lines each parse as a complete
    JSON value, it is JSONL. A one-line-per-doc compact file (single object or
    array) fails this and falls through to the streaming ijson path.
    """
    lines: list[str] = []
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            stripped = line.strip()
            if stripped:
                lines.append(stripped)
            if len(lines) >= 2:
                break
    if len(lines) < 2:
        return False
    try:
        json.loads(lines[0])
        json.loads(lines[1])
    except json.JSONDecodeError:
        return False
    return True


def _usda_list_key(path: Path) -> str | None:
    """Detect the top-level shape of a USDA JSON doc by streaming the prefix.

    Returns the nesting key (e.g. ``"BrandedFoods"``) for a keyed object, ``None``
    for a top-level array, or ``"__single__"`` for a lone food object. Only the
    head of the file is read — FDC dumps put the list key first.
    """
    with path.open("rb") as fh:
        for prefix, event, value in ijson.parse(fh):
            # Only top-level structure has an empty prefix; nested keys/containers
            # carry a non-empty prefix and are ignored (metadata may precede the
            # list). Decide nothing until we either find a known list key, see a
            # top-level array, or the root object closes.
            if prefix != "":
                continue
            if event == "start_array":
                return None
            if event == "map_key" and value in _USDA_LIST_KEYS:
                return value
            if event == "end_map":
                return "__single__"  # root closed, no known list key → lone object
    return "__single__"


def _iter_usda(path: Path) -> Iterator[dict]:
    """Stream USDA food records from a JSON doc (array / keyed object) or JSONL."""
    if _looks_like_jsonl(path):
        yield from _iter_jsonl(path)
        return
    key = _usda_list_key(path)
    if key == "__single__":
        yield json.loads(path.read_text(encoding="utf-8"))
        return
    item_prefix = "item" if key is None else f"{key}.item"
    with path.open("rb") as fh:
        yield from ijson.items(fh, item_prefix)


def _map_off(row: dict) -> dict | None:
    """Map an Open Food Facts product to our Food fields. Skip rows missing energy."""
    if not isinstance(row, dict):
        return None
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
    if not isinstance(row, dict):
        return None  # USDA arrays contain stray nulls (e.g. 32 in Foundation 2026-04)
    name = row.get("description") or row.get("name")
    if not name:
        return None
    nutr = _usda_nutrients(row)
    kcal = next((nutr[n] for n in _USDA_ENERGY_KCAL if n in nutr), None)
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


def _identity(mapped: dict) -> tuple[str, str]:
    """Dedup key within a source: barcode when present, else name."""
    return ("b", mapped["barcode"]) if mapped["barcode"] else ("n", mapped["name"])


async def _import(source: str, path: Path) -> None:
    if source == "off":
        records, mapper = _iter_jsonl(path), _map_off
    elif source == "usda":
        records, mapper = _iter_usda(path), _map_usda
    else:
        raise SystemExit(f"unknown source {source!r} (expected 'off' or 'usda')")

    inserted = skipped = 0
    async with AsyncSessionLocal() as db:
        # Load existing shared keys for this source once, then insert-only. This
        # keeps the import O(rows) instead of a SELECT per row, and stays
        # idempotent across re-runs without touching already-imported data.
        existing_rows = (
            await db.execute(
                select(Food.barcode, Food.name).where(
                    Food.source == source, Food.owner_user_id.is_(None)
                )
            )
        ).all()
        seen: set[tuple[str, str]] = {
            ("b", bc) if bc else ("n", nm) for bc, nm in existing_rows
        }

        batch: list[Food] = []
        for raw in records:
            mapped = mapper(raw)
            if mapped is None:
                skipped += 1
                continue
            key = _identity(mapped)
            if key in seen:
                skipped += 1
                continue
            seen.add(key)
            batch.append(Food(**mapped))
            if len(batch) >= _BATCH:
                db.add_all(batch)
                await db.commit()
                inserted += len(batch)
                batch = []
                print(f"  ...{inserted} inserted")
        if batch:
            db.add_all(batch)
            await db.commit()
            inserted += len(batch)
    print(f"done: inserted={inserted} skipped={skipped}")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: python -m scripts.import_foods <off|usda> <path>")
    asyncio.run(_import(sys.argv[1], Path(sys.argv[2])))


if __name__ == "__main__":
    main()
