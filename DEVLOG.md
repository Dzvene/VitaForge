# VitaForge — DEVLOG

Newest first. One entry per work session. Honest, not hype.

---

## 2026-06-24 — Mechanical lock for the VSA boundaries (canon gate)

Roadmap/canon review: we are in **v1**, web part functionally near-complete
(profile/onboarding, norm+macros, calibration real-maintenance, manual recompute,
diary+summary, weight+trend, configurable params, guest preview). `tach check`
green, **114 backend tests green**, prod live, seed catalog (104) serving. Canon
held **structurally** — but the only real gap vs Invocore/SmartWMS/süd-fenster was
**no mechanical lock**: `make check` existed but was manual, nothing stopped drift.
Closed that.

- `.githooks/pre-commit` — VSA gate: (1) `tach check` must pass (runs in the
  backend image via `docker run`, host has no python), (2) blocks a new
  god-file `services.py` inside a slice, (3) blocks a new top-level package under
  `app/` outside `core|modules|shared` (a slice escaping tach registration).
- `.githooks/commit-msg` — blocks compromise phrases («оставляем навсегда»,
  «feature а не debt», «good enough for now», …) that precede half-migrations.
- Activated via `git config core.hooksPath .githooks`. Bypass only with
  `VITAFORGE_VSA_LOOSE=1` (not canon).
- **Verified it bites:** injected an illegal `foods → calibration` import (foods
  is a leaf), hook failed with the exact tach violation; restored, tree clean.

**Next:** real food data at scale — download OFF/USDA dump, run the ready
importer, FTS instead of ILIKE. (Importers done; only seed is loaded so far.)

## 2026-06-24 — Guest preview slice (try-before-signup), tests, deploy

Finished the half-built guest/public preview that was sitting uncommitted in the
working tree, then added the tests it lacked and a frontend page to use it.

**Backend — `public` slice (new, tach leaf, depends_on=[])**
- `app/modules/public/` — stateless guest endpoints, no auth, no DB:
  `POST /public/nutrition/preview` (starting target), `/public/weight/trend`
  (EMA), `/public/calibration/preview` (real-TDEE estimate). Service mirrors the
  authenticated slices faithfully using only `app.core` engine + default params,
  so a guest's numbers reproduce exactly post-registration. Schemas re-declared
  locally so the slice never grows a cross-slice edge.
- Foods read endpoints made guest-accessible: new `get_optional_user` dep +
  `OptionalUser` type; `FoodService` visibility now accepts `user_id=None` →
  shared catalog only (a guest never sees anyone's custom foods).
- **`tests/test_public.py` — 14 tests** (was the gap): formula-hold vs
  calibrated target, guest↔authenticated parity, EMA trend, real-TDEE estimate +
  soft-degrade refusals, guest foods visibility. Backend now **114 green**;
  `tach check` green (10 slices, acyclic).

**Frontend**
- `lib/api/endpoints.ts` — `preview.{nutrition,weightTrend,calibration}` (auth:false).
- `app/try/page.tsx` — public "Try it, no account" calculator: onboarding-style
  form → target + macros, plus an honest panel explaining this is a *formula
  guess* and that Baseline calibrates real maintenance from logged data. CTA →
  /register. Link added from /login.
- `test/preview.test.ts` — asserts no bearer is attached and the body shape.
  Frontend **25 green**, lint clean, typecheck clean.

**Deploy:** rebuilt + redeployed (`-p vitaforge up -d --build`). Smoke (prod):
`/health` 200, `/public/nutrition/preview` returns formula target,
`/foods/search` 200 without a token, `/try` 200.

**Still open:** unchanged from below (coaching copy, calibration field-tuning,
OFF/USDA dump, mobile). The guest page only surfaces the nutrition preview; the
weight-trend & calibration preview endpoints are wired in the API client but
have no guest UI yet (intended for a future interactive calibration demo).

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
