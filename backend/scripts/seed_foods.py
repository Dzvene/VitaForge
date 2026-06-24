"""Seed the shared food catalog with a curated set of common foods (spec §7).

A fresh database has no foods, which makes the diary unusable until an OFF/USDA
dump is imported. This ships ~110 accurate, everyday staples (per-100 g macros,
with common portions) as shared catalog entries (source="seed", owner NULL) so
the app works out of the box.

Idempotent: upserts by (source="seed", name). Re-running refreshes macros and
portions without creating duplicates. Run in prod with:

    python -m scripts.seed_foods
"""

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.foods.models import Food, FoodPortion
from app.modules.identity.models import (
    User,  # noqa: F401 — register `users` so the foods FK resolves
)

_DATA = Path(__file__).parent / "data" / "seed_foods.json"
_SOURCE = "seed"


def _load() -> list[dict]:
    return json.loads(_DATA.read_text(encoding="utf-8"))


async def seed() -> tuple[int, int]:
    """Upsert every seed food. Returns (inserted, updated)."""
    items = _load()
    inserted = updated = 0
    async with AsyncSessionLocal() as db:
        for item in items:
            existing = (
                await db.execute(
                    select(Food).where(Food.source == _SOURCE, Food.name == item["name"])
                )
            ).scalar_one_or_none()

            portions = [
                FoodPortion(name=p["name"], grams=p["grams"]) for p in item.get("portions", [])
            ]
            if existing is None:
                db.add(
                    Food(
                        source=_SOURCE,
                        owner_user_id=None,
                        name=item["name"],
                        brand=item.get("brand"),
                        barcode=None,
                        kcal_100g=item["kcal"],
                        protein_100g=item["p"],
                        fat_100g=item["f"],
                        carb_100g=item["c"],
                        portions=portions,
                    )
                )
                inserted += 1
            else:
                existing.kcal_100g = item["kcal"]
                existing.protein_100g = item["p"]
                existing.fat_100g = item["f"]
                existing.carb_100g = item["c"]
                existing.brand = item.get("brand")
                # Replace portions wholesale (cascade delete-orphan handles removal).
                existing.portions = portions
                updated += 1
        await db.commit()
    return inserted, updated


async def _main() -> None:
    inserted, updated = await seed()
    print(f"seed_foods: inserted={inserted} updated={updated} total={inserted + updated}")


if __name__ == "__main__":
    asyncio.run(_main())
