"""Import food data from Open Food Facts / USDA dumps into the local DB (spec §7).

The product DB is populated ahead of time from downloaded dumps so search and
barcode lookup never depend on an external service's uptime.

Usage (from backend/, venv active):
    python -m scripts.import_foods off   path/to/openfoodfacts.jsonl
    python -m scripts.import_foods usda  path/to/usda_foods.json

This is intentionally minimal — it upserts by (source, barcode) for OFF and by
(source, name) for USDA. Extend the field mapping as you refine the dumps.
"""

import asyncio
import json
import sys
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.foods.models import Food


def _iter_jsonl(path: Path) -> Iterator[dict]:
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


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


async def _import(source: str, path: Path) -> None:
    if source != "off":
        raise SystemExit("Only the 'off' mapper is implemented in this scaffold")
    inserted = updated = skipped = 0
    async with AsyncSessionLocal() as db:
        for raw in _iter_jsonl(path):
            mapped = _map_off(raw)
            if mapped is None:
                skipped += 1
                continue
            existing = None
            if mapped["barcode"]:
                existing = (
                    await db.execute(
                        select(Food).where(
                            Food.source == "off", Food.barcode == mapped["barcode"]
                        )
                    )
                ).scalar_one_or_none()
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
