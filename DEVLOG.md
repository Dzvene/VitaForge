# VitaForge — DEVLOG

Newest first. One entry per work session. Honest, not hype.

---

## 2026-06-24 — Integration tests, seed catalog, USDA import, barcode UI, deploy

Closed the biggest v1 debts from `docs/STATUS.md`. All work was sitting
uncommitted in the working tree from the build session; this session verified,
fixed, deployed and committed it.

**Backend**
- **Integration test suite added** (`backend/tests/`, 14 files, **100 tests
  green**). Harness (`conftest.py`) binds the app + in-process event subscribers
  to a throwaway SQLite file before import, rebuilds schema per test. Covers
  auth, profile/nutrition, foods, diary, weight, calibration, coaching, admin,
  subscribers, import mappers, seed. Debt "no API-level tests" → **closed**.
- Two real bugs the tests surfaced:
  - `core/database.py` — SQLite (test DB) rejects queue-pool kwargs
    (`pool_size`/`max_overflow`); now only passed for non-sqlite URLs.
  - `coaching/service.py` — `accepted_count`/`dismissed` set explicitly on row
    creation; column `default=` only applies at flush, but `accept()` reads the
    value before flush.
- **Seed food catalog** (`scripts/seed_foods.py` + `data/seed_foods.json`,
  **104 staples**, per-100 g macros + common portions, `source="seed"`,
  owner NULL, idempotent upsert by (source, name)). A fresh DB had 0 foods →
  diary unusable. Fixed the FK-resolution crash (script must import `User` so
  the `users` table registers before SQLAlchemy resolves the foods FK).
  **Seeded into prod: 104 rows.**
- **USDA FoodData Central import** (`scripts/import_foods.py`) — was OFF-only
  scaffold; now parses USDA single-doc / nested-keys / JSONL, maps FDC nutrient
  numbers (208/203/204/205), upserts by barcode-or-name. Debt "USDA not
  implemented" → **closed** (dump still needs downloading to actually populate).

**Frontend**
- `AddFoodDialog` — barcode lookup form on the search tab (calls
  `foods.byBarcode`); favorites button is now a real toggle (add/remove with
  live `isFav` state) instead of add-only.
- `app/error.tsx` — route error boundary. `test/added.test.tsx` added.

**Tach / boundaries:** `tach check` green (9 slices, acyclic).

**Deploy:** rebuilt + redeployed prod stack
(`docker compose -f docker-compose.prod.yml -p vitaforge up -d --build`).
Smoke: https://vitaforge.matrix-capital.net → 200,
https://api-vitaforge.matrix-capital.net/health → ok, catalog populated.

**Still open:** coaching copy is first-pass/placeholder; calibration soft-degrade
gap thresholds want field tuning; no OFF/USDA dump downloaded yet (only seed +
importers ready); mobile apps not started.
