"""Import Open Food Facts — DACH/RU-relevant branded products, with localized names.

The full OFF dump is ~12 GB gzipped / ~100 GB raw, and most of it is US/FR
products that do nothing for a RU/DE user. This importer **streams** the JSONL
(decompressed on the fly — never stored), keeps only products sold in
Germany / Austria / Switzerland / Russia, and maps OFF's per-language name
fields into our bilingual columns (`name_ru`/`name_de`/`aliases`) so the search
we built actually pays off for branded items.

Usage — stream straight from the dump with zero disk footprint:

    curl -sL https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz \
      | gunzip -c | python -m scripts.import_off --stdin

Or from a local JSONL file (already decompressed or piped):

    python -m scripts.import_off path/to/openfoodfacts-products.jsonl

Insert-only and idempotent: existing OFF rows are loaded once and skipped by
(barcode|name). A disk guard aborts cleanly if free space gets low — this box
is shared, so we never fill the partition.
"""

import asyncio
import json
import shutil
import sys
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.modules.foods.models import Food
from app.modules.identity.models import (
    User,  # noqa: F401 — register `users` so the foods FK resolves
)

_BATCH = 5000
_SOURCE = "off"
_MIN_FREE_BYTES = 4 * 1024**3  # abort if the partition drops below 4 GB free

# Keep products sold in any of these (OFF `countries_tags`).
_KEEP_COUNTRIES = {
    "en:germany",
    "en:austria",
    "en:switzerland",
    "en:russia",
}


def _iter_lines(fh) -> Iterator[dict]:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            continue


def _clean(value: object) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    return text or None


def _map(row: dict) -> dict | None:
    """Map an OFF product to our Food fields, or None to skip it."""
    if not isinstance(row, dict):
        return None

    nutr = row.get("nutriments") or {}
    kcal = nutr.get("energy-kcal_100g")
    if kcal is None:
        return None

    default = _clean(row.get("product_name"))
    name_de = _clean(row.get("product_name_de"))
    name_ru = _clean(row.get("product_name_ru"))
    lang = row.get("lang")
    # Default-language name may itself be German/Russian without the _de/_ru key.
    if name_de is None and lang == "de":
        name_de = default
    if name_ru is None and lang == "ru":
        name_ru = default
    name = default or name_de or name_ru
    if not name:
        return None

    # Relevance gate: sold in DACH/RU, OR carries a German/Russian name. Keeps the
    # import to what helps a RU/DE user instead of dumping the whole world.
    countries = row.get("countries_tags") or []
    in_region = isinstance(countries, list) and not _KEEP_COUNTRIES.isdisjoint(countries)
    if not in_region and not name_de and not name_ru:
        return None

    try:
        macros = {
            "kcal_100g": float(kcal),
            "protein_100g": float(nutr.get("proteins_100g") or 0),
            "fat_100g": float(nutr.get("fat_100g") or 0),
            "carb_100g": float(nutr.get("carbohydrates_100g") or 0),
        }
    except (TypeError, ValueError):
        return None
    # Drop obviously broken energy values (per 100 g can't exceed ~900 kcal).
    if not (0 <= macros["kcal_100g"] <= 1000):
        return None

    brands = _clean(row.get("brands"))
    alias_terms = [name, name_de, name_ru, _clean(row.get("generic_name")), brands]
    aliases = " ".join(dict.fromkeys(t.lower() for t in alias_terms if t)) or None

    return {
        "source": _SOURCE,
        "barcode": str(row["code"])[:32] if row.get("code") else None,
        "name": name[:512],
        "name_ru": name_ru[:512] if name_ru else None,
        "name_de": name_de[:512] if name_de else None,
        "aliases": aliases,
        "brand": brands[:255] if brands else None,
        **macros,
    }


def _identity(mapped: dict) -> tuple[str, str]:
    return ("b", mapped["barcode"]) if mapped["barcode"] else ("n", mapped["name"])


async def _import(records: Iterator[dict]) -> None:
    inserted = skipped = scanned = 0
    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(
                select(Food.barcode, Food.name).where(
                    Food.source == _SOURCE, Food.owner_user_id.is_(None)
                )
            )
        ).all()
        seen: set[tuple[str, str]] = {("b", bc) if bc else ("n", nm) for bc, nm in existing}

        batch: list[Food] = []

        async def flush() -> None:
            nonlocal inserted, batch
            if not batch:
                return
            db.add_all(batch)
            await db.commit()
            inserted += len(batch)
            batch = []

        for raw in records:
            scanned += 1
            if scanned % 500_000 == 0:
                print(f"  scanned={scanned} kept={inserted + len(batch)} skipped={skipped}")
            mapped = _map(raw)
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
                if shutil.disk_usage("/").free < _MIN_FREE_BYTES:
                    await flush()
                    print(f"ABORT: free disk below {_MIN_FREE_BYTES // 1024**3} GB — stopping")
                    break
                await flush()
                print(f"  ...{inserted} inserted")
        else:
            await flush()
        await flush()
    print(f"done: scanned={scanned} inserted={inserted} skipped={skipped}")


def main() -> None:
    args = sys.argv[1:]
    if args == ["--stdin"]:
        records = _iter_lines(sys.stdin)
    elif len(args) == 1:
        path = Path(args[0])
        records = _iter_lines(path.open(encoding="utf-8"))
    else:
        raise SystemExit("usage: python -m scripts.import_off (--stdin | <path.jsonl>)")
    asyncio.run(_import(records))


if __name__ == "__main__":
    main()
