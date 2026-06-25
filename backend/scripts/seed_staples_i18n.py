"""Seed the shared catalog with bilingual (EN/RU/DE) everyday staples.

The USDA bulk import is English-only, so searching "творог" or "Quark" returned
nothing — useless for a RU/DE user. This ships a curated set of common staples
with localized names + synonyms (source="staple_i18n", owner NULL) so the diary
works in all three languages out of the box.

`aliases` is a lowercased, space-joined bag of every synonym/transliteration so
a substring ILIKE finds the row regardless of spelling. Idempotent: upserts by
(source="staple_i18n", name). Run in prod with:

    python -m scripts.seed_staples_i18n
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

_DATA = Path(__file__).parent / "data" / "staples_i18n.json"
_SOURCE = "staple_i18n"


def _load() -> list[dict]:
    return json.loads(_DATA.read_text(encoding="utf-8"))


def _aliases(item: dict) -> str:
    """Lowercased bag of all searchable terms for the row."""
    terms = [item["name"], item.get("name_ru", ""), item.get("name_de", "")]
    terms += item.get("syn", [])
    return " ".join(t for t in terms if t).lower()


async def seed() -> tuple[int, int]:
    """Upsert every staple. Returns (inserted, updated)."""
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
                        name_ru=item.get("name_ru"),
                        name_de=item.get("name_de"),
                        aliases=_aliases(item),
                        brand=None,
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
                existing.name_ru = item.get("name_ru")
                existing.name_de = item.get("name_de")
                existing.aliases = _aliases(item)
                existing.kcal_100g = item["kcal"]
                existing.protein_100g = item["p"]
                existing.fat_100g = item["f"]
                existing.carb_100g = item["c"]
                existing.portions = portions
                updated += 1
        await db.commit()
    return inserted, updated


async def _main() -> None:
    inserted, updated = await seed()
    print(f"seed_staples_i18n: inserted={inserted} updated={updated} total={inserted + updated}")


if __name__ == "__main__":
    asyncio.run(_main())
