# VitaForge

A personal calorie & macro tracker for weight control. Computes a daily calorie
+ macro target for your goal, logs what you eat, shows what's left for the day,
and tracks a smoothed weight trend.

**Principles** (the whole point — see [`docs/SPEC.md`](docs/SPEC.md)):
- A tool, not a subscription funnel. **No ads, no paywall, ever.** Every feature
  (macros, custom protein targets, trend, calibration, history) is always free.
- It doesn't just count — it **explains the method and warns about mistakes**, so
  you understand *why* the right result needs this sequence rather than trusting
  numbers blindly.
- **Calibration-first.** Instead of building a deficit on a formula guess, it
  measures your real maintenance from your own intake + weight trend (the RP /
  Israetel approach), then builds the goal from that. This is the core idea.

## Stack

Mirrors the Invocore / SuedFenster house stack.

- **Backend**: FastAPI + SQLAlchemy 2 (async) + PostgreSQL, Pydantic v2,
  JWT (argon2). **Vertical-slice architecture** with `tach`-enforced module
  boundaries. The calculation engine is pure and IO-free in `app/core`.
- **Mobile (native, no cross-platform)**: iOS in Swift/SwiftUI, Android in
  Kotlin/Compose. Same order as Invocore — **iOS first**, then Android.

## Layout

```
backend/            FastAPI service (the product's brain)
  app/core/         infra + the PURE engine: nutrition_math.py, params.py
  app/shared/       base model/schema, exceptions, pagination
  app/modules/      vertical slices (see below)
  alembic/          migrations
  tests/            engine tests
ios-native/         Swift / SwiftUI app   (scaffolded later, iOS first)
android-native/     Kotlin / Compose app  (after iOS)
docs/SPEC.md        the product specification
```

### Backend slices (`app/modules/`)

| slice | owns | responsibility |
|-------|------|----------------|
| `identity` | `users` | the user record |
| `auth` | — | register / login / refresh / me (operates on identity) |
| `profile` | `profiles` | inputs, goal, macro & param overrides (§3, §6) |
| `nutrition` | `nutrition_targets` | the Norm: target calories + macros (§4.1, §4.2) |
| `foods` | `foods`, portions, favorites | product DB, search, barcode, custom (§7) |
| `diary` | `diary_entries` | logging + daily summary / remaining (§4.6, §8) |
| `weight` | `weight_logs` | measurements + EMA trend (§4.3) |
| `calibration` | `calibration_status` | baseline real-TDEE + weekly recalc (§4.4/§4.5) |
| `coaching` | warning state | hints, warnings, in-day guidance, no-blame (§5) |

The dependency graph is acyclic and locked by `backend/tach.toml`. Key choice:
`calibration` depends on `nutrition` and *writes* the real maintenance figure
into it, rather than the reverse — that keeps `diary → nutrition → …` from ever
forming a cycle.

## Run it (local)

```bash
# 1. Postgres (docker; host port 5433 to avoid your local PG18)
docker compose up -d db
#    then set backend/.env: DATABASE_URL=...@localhost:5433/vitaforge

# 2. Backend
cd backend
python -m venv venv && venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env          # edit secrets + DATABASE_URL
venv/Scripts/python -m alembic upgrade head
venv/Scripts/python -m uvicorn app.main:app --reload   # http://localhost:8000/docs

# 3. Quality gate
venv/Scripts/python -m tach check     # module boundaries
venv/Scripts/python -m ruff check app tests
venv/Scripts/python -m pytest         # engine tests
```

Food data: download Open Food Facts + USDA dumps, then
`python -m scripts.import_foods off path/to/dump.jsonl` (spec §7).

## Status

- ✅ Backend v1 skeleton: all slices, pure engine, boundaries green, engine
  tested, initial migration generated.
- ⏳ Next: API integration tests, food-dump import at scale, then the iOS app.

See [`docs/STATUS.md`](docs/STATUS.md) for the honest build state.
