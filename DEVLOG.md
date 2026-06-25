# VitaForge — DEVLOG

Newest first. One entry per work session. Honest, not hype.

---

## 2026-06-25 — UI audit fixes: mobile logout, settings overlap, verify banner

Full-UI walkthrough (guest + authed + 390px mobile) turned up three concrete
issues; fixed the cluster.

- **No logout on mobile.** Logout + language lived only in the desktop sidebar
  footer (`md:flex`), which is hidden on phones; the bottom-nav had neither, so
  a mobile user was stranded in-session. Added a mobile top bar in `AppShell`
  (`md:hidden`) carrying the brand, `LanguageSwitcher` and a logout button.
  Verified: tapping it clears auth → /login.
- **Settings "Save changes" overlapped "Recompute norm."** The sticky save CTA
  was a transparent floating pill (`justify-end`) that covered ~155px of the
  Recompute button (measured 3082px² overlap). Reworked into a solid full-width
  sticky footer bar (bg + top border, bleeds to the page padding). Re-measured:
  **0px² overlap at every scroll position**.
- **Email verification had no in-app surface.** Added `VerifyEmailBanner` (shown
  in `AppShell` while `user.email_verified` is false) — a slim bar with a
  **Resend** action (`auth.resendVerification`) and a session-dismiss. This is
  the only in-app way to re-trigger verification; before it only existed behind
  the emailed link. Verified: resend → "email sent" confirmation.
- i18n: `appShell.verify*` (3) + `common.dismiss`, all en/ru/de. tsc + eslint +
  vitest(25) green. Frontend-only; deployed.

Remaining UI nits logged for later: grams-only portions (no presets), no live
kcal preview at chosen quantity, password-change for logged-in users, transient
`/`→`/login` flash on the guest landing, desktop whitespace.

---

## 2026-06-25 — Fix: coaching nags a brand-new account

Manual UX walkthrough (register → onboarding → dashboard) surfaced a real bug: a
user who *just* registered, with zero logs, immediately saw two warnings —
"missed_logging" and "irregular_weighing". They'd had no days to miss.

- Root cause (`coaching/service.py`): the regularity check measured gaps over a
  flat 7-day window (`span = 7`), so an empty trailing week always read as
  `7 - 0 ≥ threshold`. Fixed to count only the days the account has actually
  existed within the window: `span = min(7, exp_days + 1)`. Day-0 → span 1 <
  threshold 2 → silent. The empty-state CTAs guide the first log instead.
- Profile-based warnings (aggressive rate, low protein) are unaffected — they're
  valid from day one.
- Tests rewrote the old expectations (which *asserted* the buggy "brand-new user
  → gap warnings" behaviour): now `test_logging_gaps_stay_silent_for_brand_new_account`
  + `test_logging_gaps_warn_once_account_has_aged` (backdates created_at via the
  DB to prove the nudge returns once gaps are real). Dismiss/accept de-escalation
  tests age the account so the warning fires. Backend 153 → 155.
- Verified in prod: fresh account + profile + no logs → `/coaching/warnings`
  returns `[]`.

---

## 2026-06-25 — Guest UI for trend + calibration previews

Closed the standing debt: the `/public/weight/trend` and
`/public/calibration/preview` endpoints were wired in the API client but had no
guest UI. `/try` is now a 3-tab demo so a visitor can feel all three
calibration-first pillars before signing up.

- **Restructured `/try`** into tabs (Target / Trend / Calibration) via the
  existing `Segmented`. Extracted the old nutrition calculator into
  `components/try/TargetDemo.tsx` (behaviour unchanged), added two new demos.
- **TrendDemo** — a deterministic, SSR-safe two-week noisy weigh-in series
  (prefilled, fully editable). Debounced `preview.weightTrend` recompute on every
  edit; renders the same `TrendChart` as the authed app + latest trend + a
  "since start" delta + the read-the-trend-not-the-scale explainer.
- **CalibrationDemo** — two controls (avg daily intake, 2-week weight change)
  generate a full 14-day intake+weight series and call
  `preview.calibration`, surfacing the back-calculated **real maintenance**, avg
  eaten, trend change and days counted, with the method explainer. Live in prod:
  default inputs → 2477 kcal real TDEE.
- **i18n** — 6 new `try.*` tab keys + `tryTrend.*` (7) + `tryCalib.*` (12),
  all three locales en/ru/de.
- Browser-verified all three tabs in RU (chart, latest trend −0.5 kg,
  calibration 2477 kcal). tsc + eslint + vitest (25) green.

---

## 2026-06-25 — Password reset + email verification (provider-agnostic)

Closed the deferred auth debt. Built it provider-agnostic so it ships now and
goes live the moment an SMTP mailbox is filled in — no code change.

**Mailer (`app/core/email.py`)** — one `send_email` entry point picks a backend
at call time: **SMTP** (stdlib `smtplib` in a worker thread, SSL/465 or
STARTTLS/587) when `SMTP_HOST` + `SMTP_PASSWORD` are set; otherwise a **console**
backend that logs the message and appends to an in-memory `OUTBOX` (what makes
dev + the whole test suite runnable with no SMTP account). Sends are best-effort
— a mail failure is logged, never raised, so registration / forgot-password
never 500 because mail is down.

**Tokens (`auth/models.py::EmailToken`)** — single-use, expiring, one table for
both purposes. Only the SHA-256 hash of the emailed secret is stored (raw token
never persisted); rows cascade-delete with the user. A new request of the same
purpose voids the previous unused token. Migration `c3d4e5f6a7b8`.

**Flows (auth slice):**
- Registration now fires a verification email (best-effort).
- `POST /auth/verify-email {token}` — flips `email_verified` + timestamp.
- `POST /auth/resend-verification` (auth) — 409 if already verified.
- `POST /auth/forgot-password {email}` — always 202, no account enumeration.
- `POST /auth/reset-password {token, new_password}` — sets the hash, voids other
  outstanding reset tokens. Both email endpoints throttled 5/15min per IP.

**i18n** — email subjects/bodies + token errors localized en/ru/de via `tr()`
(rendered in the request's Accept-Language). Emails carry a plain-text + minimal
HTML part from the same translated lines.

**Frontend** — `/forgot-password`, `/reset-password` (token from URL, Suspense),
`/verify-email` (auto-verifies on mount, StrictMode-guarded). "Forgot password?"
link on /login. 18 new i18n keys × 3 locales.

**Config** — `SMTP_*`, `FRONTEND_BASE_URL`, token TTLs added to settings +
`.env` (commented one.com recipe) + `.env.example`.

**Tests** — `tests/test_email_auth.py`, 15 cases (verification flip, single-use,
no-enumeration, reset changes password, superseding voids old link, rate limit).
Backend **138 → 153 passed**, frontend 25, tach + ruff + tsc + eslint green.

**Deploy** — rebuilt back+front; migration auto-applied on startup
(`email_tokens` live). Smoke: endpoints return 202/422/401 as designed, three
new pages 200, token pipeline verified end-to-end in prod (token row created,
then cleaned).

**Open:** SMTP not configured yet — until `SMTP_HOST`/`SMTP_PASSWORD` are set,
mail is logged (console backend), not delivered. Owner must create a `vitaforge@`
mailbox (one.com, like Invocore) and fill the `.env`. App INFO logs don't surface
under uvicorn in prod, so the console fallback isn't a real delivery path — SMTP
is the path.

---

## 2026-06-25 — Account self-service + auth rate-limit (Phase 4, no-email parts)

The manual-QA sweep flagged missing auth/GDPR basics. Per the owner's call we
shipped the parts that don't need email infrastructure; password reset + email
verification stay deferred until an email-provider decision.

- **GDPR data export** — `GET /account/export` returns a portable JSON snapshot
  of everything the user owns (profile, nutrition target, calibration, weight
  logs, diary, favorites, custom foods, coaching state). `password_hash` is
  redacted. Rows are serialized generically from each table's columns.
- **Account deletion** — `POST /account/delete` re-authenticates with the
  password, then deletes the `User` row; every owned table drops via the
  existing `ondelete=CASCADE` FKs. Verified a deleted email can re-register.
- New `account` slice: a deliberate cross-slice hub (like `admin`), declared in
  `tach.toml` with edges to the eight data-owning slices.
- **Auth rate-limiting** — `app/core/ratelimit.py`, an in-memory sliding-window
  limiter per client IP (single uvicorn worker, so process-local is correct;
  reads X-Forwarded-For behind nginx). Login 10/60s, register 5/300s, config-
  driven; returns 429 + Retry-After via the i18n'd `error.too_many_requests`.
- **Settings UI** — a "Data & account" card: export (downloads
  vitaforge-export.json) and a password-gated delete with a confirm panel;
  on delete it clears the session and routes to /login. Full EN/RU/DE copy.
- Tests: export shape + redaction, delete + cascade + re-register, wrong-
  password rejected, login/register 429 bursts (limiter reset between tests in
  conftest so counters don't bleed). Backend 138 tests + tach green; frontend
  typecheck + lint + 25 vitest green.

Verified live: `GET /account/export` (all sections, no password_hash), login
brute-force → 9×401 then 429, and the Settings "Daten & Konto" card with the
localized delete-confirm panel.

**Deferred (needs an email provider):** password reset + email verification.
The `email_verified` columns already exist; wiring them on is a follow-up once
SMTP/Resend is chosen. Catalog OFF import (branded RU/DE) also still pending.

---

## 2026-06-25 — Bilingual food catalog (Phase 3): RU/DE staple search

The blocker behind "на русском нихуя не работает, начиная с добавления еды":
the catalog was USDA-English only, so "творог"/"Quark" returned nothing — the
diary was unusable for a RU/DE user out of the box. Chosen approach (over a
tens-of-GB OFF dump on a 46 GB-free box): a curated bilingual staple seed.

- **Schema**: `foods` gains `name_ru`, `name_de`, and a free-text `aliases`
  bag (lowercased synonyms/transliterations). Migration `b2c3d4e5f6a7` adds the
  columns + Postgres trigram GIN indexes on each (SQLite skips the index step).
- **Search** now matches across `name`/`name_ru`/`name_de`/`aliases`; prefix
  ranking considers the localized names too. NULL on the USDA rows → no-op
  there, so nothing regresses for English search.
- **Localized display**: `FoodOut.localized(food, locale)` shows the RU/DE name
  when present (search/barcode/favorites/get), so the diary reads "Творог" /
  "Quark" instead of the canonical English. Falls back to `name`.
- **Seed**: `scripts/seed_staples_i18n.py` + `data/staples_i18n.json` — 99
  everyday staples (dairy, grains, meat/fish, eggs, legumes, veg, fruit, nuts,
  oils, a few RU/DE dishes) with EN/RU/DE names, synonyms, per-100g macros and
  common portions. Idempotent upsert by (source="staple_i18n", name).
- Tests: data sanity (Atwater fit), idempotency, and RU/DE/translit search +
  localized-name regression. Backend 131 tests + tach green.

Verified live after migrate+seed+redeploy: API "творог"/"Quark"/"гречка"/
"Hähnchenbrust"/"молоко" all hit per Accept-Language with localized display
names; in the diary UI (DE) "творог" → Quark/Magerquark/Quarktaschen.

**Scope note:** 99 staples cover the common everyday searches, NOT a full
catalog — branded/regional RU/DE products still need the OFF import (deferred,
the streaming importer is ready but wants disk prep). Said plainly so this
isn't mistaken for full coverage.

**Still open:** (4) auth/GDPR — per the owner's call, do the no-email parts now
(account deletion, data export, auth rate-limit); password reset + email
verification wait on an email-provider decision.

---

## 2026-06-25 — i18n backend reactivity (Phase 2 of the manual-QA sweep)

The leak found in Phase 1's verification: server-translated copy (coaching
cards, "why this method" hints, calibration reasons) only re-localized on the
next fetch, so switching language mid-session left it stuck in the old
language until the query expired. Plus the calibration soft-degrade reasons
were hardcoded English server-side, leaking into the RU/DE UI verbatim.

- **Cache invalidation on language change**: a small `LocaleQuerySync`
  component (mounted under QueryClientProvider) invalidates the `["coaching"]`
  and `["calibration"]` query keys on every i18n `languageChanged`, so the
  server copy refetches in the new language with no page reload.
- **Calibration degrade reasons through `tr()`**: added
  `calibration.degrade.{no_data,missing_logs,missing_weighs}` and
  `calibration.skipped` to the backend message catalog (en/ru/de) and replaced
  the four hardcoded literals in `calibration/service.py` plus the four guest
  mirrors in `public/service.py`. English text is unchanged so prior
  substring assertions still hold.
- Regression tests: `tr()` unit check for the new keys + an end-to-end guest
  `/public/calibration/preview` test asserting the RU and DE reason strings.

Verified live after redeploy: RU→DE switch on the dashboard instantly
re-localized the coaching cards and "why this method" (backend content), 0
console errors; `GET …/calibration/preview` returns the localized reason per
Accept-Language (en/ru/de checked via curl). Backend 126 tests + tach green;
frontend typecheck + lint green.

**Still open:** (3) catalog RU/DE — food search is USDA-only, "творог" returns
nothing; needs OFF import + bilingual names. (4) auth/GDPR — password reset,
email verification, account deletion, data export, auth rate-limit (Phase 4
needs an email-sending decision before reset/verification can ship).

---

## 2026-06-25 — Frontend i18n leak fixes (Phase 1 of a manual-QA sweep)

A full manual click-through of every screen (login → onboarding → dashboard →
diary → add-food → weight → calibration → settings → guest /try → landing)
surfaced systemic i18n leaks, not isolated typos. Phase 1 closes the
component-level ones:

- **Hardcoded units / words** went through `t()`: `g`, `kg`, `kcal`, `/100g`,
  "Remaining"/"Over by", "{{n}} left"/"over by {{n}}", and the
  "Log at least two days to see a trend." empty state. `fmtG/fmtKg/fmtKgSigned`
  now take an optional unit arg (English default keeps the pure unit tests
  locale-free); every call site passes `t("common.grams"|"kg")`. New keys:
  `common.per100g`, `charts.*`, `weight.trendMinHint` in en/ru/de.
- **Raw key on screen**: the add-food meal toggle showed
  `diary.addFood.mealShort.breakfast` (key never existed) — unified to the
  existing `enums.meal.breakfast`.
- **Hydration mismatch (#418)**: i18n was detecting the browser language at
  import time, so the first client render disagreed with the server's `en`
  markup. Now init is pinned to `en` (matches SSR) and detection moved into a
  post-mount effect in `I18nProvider` (localStorage `vf_lang` → navigator),
  with `<html lang>` + storage kept in sync on every `languageChanged`. Console
  is clean on reload; no more #418.
- **Guest pages had no language switcher** (/try, /login, /register) — added
  via `AuthScaffold` (covers login+register) and the /try header.

Verified live on the RU UI after redeploy: dashboard units/labels, coaching
cards, "why this method", weight `кг`, add-food `Завтрак` + `/100 г`, switcher
on guest pages, 0 console errors. typecheck + lint + 25 vitest all green.

**Still open (next phases):** (2) backend content only re-localizes on the next
fetch — switching language mid-session keeps already-loaded coaching/calibration
copy in the old language until refetch; calibration soft-degrade strings
("Not enough weigh-ins…") are still English server-side. (3) catalog is
USDA-only — RU/DE food search returns nothing ("творог" → empty); needs OFF
import + bilingual names. (4) no password reset / email verification / account
deletion / data export / auth rate-limit.

---

## 2026-06-25 — Backend i18n (Accept-Language) + mobile API hand-off

Server-generated copy now localizes en/ru/de from the request, so the native
apps (built on the Win/Mac instances — store accounts already paid) and the web
share one contract. Pattern mirrors Invocore's backend i18n.

- `app/core/i18n.py` — `current_locale` ContextVar, `parse_accept_language`,
  `tr(key, **kwargs)` (fallback locale→en→key, `str.format` interpolation), and
  `LocaleMiddleware` (sets the ContextVar per request). Registered in `main.py`.
- `MESSAGES` holds en/ru/de for the full coaching surface (7 warnings, 5 hints,
  5 in-day guidance lines — 2 interpolated) + the most user-visible errors
  (email exists, invalid credentials, barcode not found).
- `coaching/catalog.py` reduced to a key registry (`WARNING_TYPES`, `HINT_KEYS`);
  text moved to i18n. `coaching/service.py`, `auth/service.py`, `foods/service.py`
  resolve via `tr()`.
- Frontend `lib/api/client.ts` sends `Accept-Language: <active lang>` on every
  request, so backend copy follows the UI language picker.
- `docs/MOBILE_API.md` — hand-off for the native instances: hosts, JWT flow +
  TTLs, the Accept-Language requirement, route groups, onboarding sequence,
  enums, and that `openapi.json` is the canonical DTO source.
- 5 backend i18n tests (parse, tr fallback/interpolation, localized hints +
  error end-to-end). Backend **124 tests green**, tach + ruff clean. Verified
  live: errors and coaching hints return en/ru/de by Accept-Language.

## 2026-06-25 — Multi-language UI: English / Russian / German (frontend)

Full i18n of the web app. Pattern mirrors the proven sibling projects the user
pointed at: **react-i18next + i18next-browser-languagedetector** like süd-fenster
admin (frontend); the backend Accept-Language pattern from Invocore is the next
step (coaching/error strings).

- `lib/i18n/` — i18next init (en/ru/de, fallback en, `load: "languageOnly"`,
  detector order localStorage `vf_lang` → navigator), `I18nProvider` (client,
  keeps `<html lang>` in sync), `useDayLabel` hook for locale-aware relative/
  absolute dates. `LanguageSwitcher` (inline select in landing header + app
  sidebar; segmented in Settings).
- `format.ts` enum label maps (meal/activity/goal) + `dayLabel` replaced by
  shared `enums.*` keys + `relativeDayKey`/`formatDayAbsolute` so dates localize.
- Every screen converted to `t(...)`: landing, try, auth (login/register/
  scaffold), onboarding, error boundary, dashboard, diary (+ Add/Custom food
  dialogs), weight, calibration, settings, admin (overview/foods/users), app
  shell/nav. 17 translation namespaces, three locale JSON files kept key-parity.
  Dynamic server-provided strings (coaching hint/warning text, food names) are
  intentionally left to the backend.
- The 7 screen conversions were fanned out to parallel subagents (disjoint
  files), each returning an en/ru/de fragment; merged + placeholder-normalized
  to i18next `{{var}}` syntax.
- vitest setup now imports the i18n init so tests resolve real English copy.
  typecheck + `next lint` clean, **25 frontend tests green**. Rebuilt + deployed;
  verified live in all three languages (EN/RU/DE) on the landing.

## 2026-06-24 — Public landing page (the front door was a redirect)

`/` was a client redirect — signed-in → `/dashboard`, everyone else → a bare
`/login` form. A first-time visitor saw a login box with zero explanation of what
the product is, and the guest `/try` calculator was unreachable (nothing linked
to it). Fixed:

- `app/page.tsx` is now a real landing: hero (calibration-first pitch), the
  3-step method (estimate → log → real maintenance), a verifiable-facts strip
  (450k foods / €0 / every number explained — no invented testimonials or user
  counts, per the no-fake-social-proof rule), a feature grid (diary+barcode,
  weight trend, calibration, coaching) and CTAs to `/try` and `/register`.
  Signed-in visitors still bounce to `/dashboard`.
- Reuses the existing design system (Button/`card`, brand/ink tokens, lucide,
  copy voice from `/try`); product name kept as "Baseline" to match the rest of
  the user-facing app. Content is server-rendered (good for SEO).
- typecheck + `next lint` clean, 25 frontend tests green. Rebuilt + redeployed
  `vitaforge-frontend`; landing live at https://vitaforge.matrix-capital.net (200,
  SSR copy present, /try /register /login linked).

## 2026-06-24 — Real food catalog at scale (104 → 458k), streaming importer, relevance search

The #1 release blocker: a calorie tracker with 104 seed foods is unusable. Closed
it — and fixed the half-truth that "the importers are ready" (they read whole
files into memory; the USDA Branded dump is **3.16 GB** and would OOM this box).

**Importer rewritten to stream** (`scripts/import_foods.py`)
- `ijson` over the array (`<Key>.item`) instead of `read_text()` + `json.loads()`.
  Top-level shape auto-detected by streaming the prefix (keyed object / array /
  JSONL / lone object). Memory now flat regardless of file size — proven on the
  3.16 GB branded file.
- Insert-only + batched (`add_all` per 5000): existing keys for the source are
  loaded once, then dedup is in-memory. Replaces a SELECT-per-row that would have
  been ~450k round-trips. Idempotent across re-runs.
- **Three real data bugs the real dumps surfaced** (would have silently lost food):
  - USDA arrays carry stray JSON `null`s (32 in Foundation 2026-04) → both
    mappers now skip non-dict rows.
  - Foundation reports energy via **Atwater factors** (958 specific / 957
    general), not 208 — only ~25% carry 208. Energy lookup now tries 208 → 958 →
    957 (268 is kJ, excluded). Foundation yield 95 → 321 mapped.
  - FK-resolution crash: must import `User` so `users` registers before the
    `foods.owner_user_id` FK resolves (same trap as the seed script).

**Relevance search** (`foods/service.py`) — was `ILIKE %q%` ordered alphabetically;
on a 458k table "chicken" surfaced branded junk. Now: prefix match first, generic
(no brand) over branded, then shorter/canonical name. Portable across Postgres
(prod) and SQLite (tests). Migration `a1f2c3d4e5b6` adds a **pg_trgm GIN index**
on `lower(name)` (Postgres-only; SQLite no-op) so the substring ILIKE is not a seq
scan.

**Loaded into prod** (USDA FoodData Central 2026-04 / SR Legacy 2018):
- SR Legacy 7793 + Foundation 235 generic + Branded 450 023 (with barcodes) =
  **458 155 foods, 450k with barcodes** (was 104).
- Smoke: search "chicken"/"milk" → generic-first, 0.18 s; barcode lookup 34 ms.

**Tests:** 114 → **119** (streaming detector, Atwater energy, null-skip, search
relevance). `ruff` clean (fixed 2 pre-existing nits), `tach` green.

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
