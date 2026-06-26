# VitaForge — DEVLOG

Newest first. One entry per work session. Honest, not hype.

---

## 2026-06-26 — Web UI gaps: edit diary entry, edit/delete weight, account details

Closed the three real web gaps from the UI audit (the rest of the web was
already complete). Each is a thin backend endpoint + UI, tested + deployed.

- **Edit a diary entry's amount.** `PATCH /diary/{id}` (`DiaryUpdateIn{grams}`,
  user-scoped, switches the row to manual grams, republishes DIARY_CHANGED). UI:
  a pencil on each row opens an inline grams editor (Enter/Esc, live recompute).
  Previously the only fix for a wrong portion was delete + re-add.
- **Delete / edit a weigh-in.** `WeightPoint` now carries its `id`;
  `DELETE /weight/{id}` removes a stray point (trend + calibration recompute off
  the rest). UI: each recent-entry row gets edit (prefills the form → re-log
  overwrites that day) + delete. A typo'd weight used to be unfixable and
  silently skewed the EMA trend the whole method rests on.
- **Edit name / email.** `PATCH /auth/me` (`UpdateProfileRequest`, PATCH
  semantics via `model_fields_set`). Email change checks uniqueness (409), resets
  `email_verified`, and sends a fresh verification link. UI: an "Account details"
  card in Settings.
- **(polish) Portion-mode quick-chips.** The add-food portion path got ×0.5/1/
  1.5/2/3 one-tap counts, matching the grams quick-chips.

Backend: **213 tests** green (+12: diary edit ×4, weight delete ×4, profile
edit ×4), tach + ruff clean. Fixed a test-isolation bug: the reminders test now
pins `VAPID_PRIVATE_KEY_B64=""` in conftest so a real key in `.env` can't flip
`push_enabled`. i18n en/ru/de for all new copy. Deployed backend + frontend.
**Verified on prod**: API e2e (diary 100→250 g = 950 kcal, weight delete leaves
1, email change → verified=false) and a live browser pass (RU) — added Oats,
edited 100→250 g (246→615 kcal, meal total + macros recomputed), removed it; the
Account details card renders prefilled.

---

## 2026-06-26 — Mobile: trends + recipes screens (both platforms)

Rounded out the core product surface on iOS and Android.

- **Trends** (`GET /analytics/trends`) — 7- and 30-day summary cards (logging
  adherence, avg intake, on-target days, weight change + weekly rate), a goal
  card (progress bar + status + ETA), and a pace card.
- **Recipes** (`GET /recipes`) — list saved recipes with totals; tap → pick a
  meal → log the whole recipe to today (`POST /recipes/{id}/log`); swipe/icon to
  delete. Recipe *creation* stays on the web for now (it needs the per-component
  food search — deferred, noted in the READMEs).

Navigation: the tab count outgrew a flat bar. iOS lets its `TabView` auto-collapse
the overflow into the system **More** tab (7 tabs). Android added an explicit
**More** tab (a small menu → Trends / Recipes / Settings with a back bar), so the
bottom bar stays at 5.

New DTOs (TrendsOut + nested, RecipeOut/Component/LogIn) verified against the
backend schemas. Still **source-only / uncompiled** — first build on Mac/Win.
Remaining: recipe creation, push (APNs/FCM — needs new backend device-token
endpoints), barcode scanner, biometric lock, store/CI.

---

## 2026-06-26 — Mobile: weight + calibration screens (both platforms)

Extended the native apps with the two screens most central to the
calibration-first identity, mirrored on iOS and Android.

- **Weight.** Daily weigh-in (`POST /weight`) + a raw/EMA-trend chart from
  `GET /weight/series`. iOS uses **Swift Charts** (raw faint line + brand trend
  line); Android draws a **Compose `Canvas`** chart (two normalized polylines +
  raw dots) — no charting dependency added. "Already logged today" collapses the
  input, matching the web.
- **Calibration.** `GET /calibration/status` → window progress (clean days /
  window), days-remaining, last real-TDEE; **Recalculate** (`POST
  /calibration/recalc`, gated on `ready_to_estimate`) and **Skip**
  (`/calibration/skip`) with the estimate result (real maintenance, avg intake,
  trend change, new target) rendered after.

Plumbing: new DTOs (WeightLogIn/Point/Series, CalibrationStatus, EstimateResult)
verified against the backend schemas; client gained a no-body `POST→decode`
helper (iOS `post(_:)`, Android `postEmpty`) and a body-no-response submit; both
tab bars went 3 → 5 (Today/Diary/Weight/Calibrate/Settings).

Still **source-only / uncompiled** (no toolchain on this box — first build is on
Mac/Win). Remaining: recipes, trends, push (APNs/FCM), barcode scanner,
biometric lock, store/CI.

---

## 2026-06-26 — Native mobile apps scaffolded (iOS + Android)

Started the native apps under `mobile/` (monorepo, next to `docs/MOBILE_API.md`):
**iOS** SwiftUI (`mobile/ios`) and **Android** Jetpack Compose (`mobile/android`).

**🔴 Honest caveat up front.** This Linux box has no Swift/Xcode and no
JDK/Gradle/Android SDK, and it runs prod containers — installing heavy toolchains
here would risk prod, so I didn't. That means **none of this mobile code has been
through a compiler.** It's source-only, written to be built + fixed on the
Mac/Win instances (where the paid store accounts live). First build = a
compile-fix pass. Recorded plan was always "mobile on Win/Mac"; this is the
hand-off source, structured so each side builds in one step (XcodeGen
`project.yml` for iOS, standard Gradle for Android).

**Both platforms, same core loop** (deliberately mirrored):

- **Networking.** iOS: `actor APIClient` (URLSession) with single-flight token
  refresh on 401 + `Accept-Language` on every request. Android: `ApiClient`
  (OkHttp + kotlinx.serialization) with a `Mutex`-coalesced refresh + same header.
  No third-party deps on iOS; Android uses OkHttp/serialization/security-crypto.
- **Token storage.** iOS Keychain; Android EncryptedSharedPreferences (Keystore).
- **Models.** DTOs hand-written against the live schemas (auth/profile/nutrition/
  diary/foods/coaching) — verified field-by-field against the backend Pydantic
  schemas, not guessed. iOS uses `.convertFromSnakeCase`; Android uses explicit
  `@SerialName`.
- **Routing.** A `loading → unauthenticated → onboarding → ready` state machine
  (iOS `Session` ObservableObject, Android `SessionViewModel`). `GET /profile`
  404 ⇒ onboarding.
- **Screens.** Auth (login/register + language), onboarding (profile → norm),
  dashboard (calorie ring + macro bars + maintenance + coaching guidance), diary
  (catalog search, log/delete), settings (language + sign out).

**Not yet:** weight + EMA trend, calibration, recipes, trends, push (APNs/FCM —
separate from the web's Web Push), barcode scanner, biometric lock, store/CI.
The auth + networking + model foundation is shared-shaped so these extend
directly. ~19 Swift + ~20 Kotlin files. READMEs in each platform dir cover the
build steps.

---

## 2026-06-26 — Reminders (Web Push, no SMTP)

The last open feature-list item. Reminders never needed email — email delivery
was stuck on a dead one.com mailbox (535 auth). Delivered them over **Web Push
(VAPID)** instead: a notification fires even with the tab closed, which is the
whole point, and it sidesteps SMTP entirely.

**Backend — new `reminders` slice** (tach: `depends_on = [identity, weight,
diary]`). Two tables (migration `a7b8c9d0e1f2`): `reminder_prefs` (one row/user —
master switch, IANA timezone, locale, per-reminder on/off + `HH:MM` local time,
and `last_*_sent_on` dedupe dates) and `push_subscriptions` (one row per
browser/device). Endpoints: `GET /reminders/config` (prefs + browser VAPID key +
device count), `PUT /reminders/prefs`, `POST /reminders/{subscribe,unsubscribe,
test}`.

- **Delivery** (`sender.py`): one EC P-256 private key (`VAPID_PRIVATE_KEY_B64`,
  base64'd PEM) is the single source of truth — the browser-facing application
  server key is *derived* from it at runtime, so they can't drift. `pywebpush`
  (sync) is called via `asyncio.to_thread`. A 404/410 from the push service →
  the subscription is dead → pruned.
- **Scheduler** (`scheduler.py`): an in-process asyncio loop started from the app
  lifespan, ticking every 60 s. State lives in the DB so a restart resumes
  cleanly and a single backend container = exactly one scheduler (no
  double-send). Disabled under tests / when no VAPID key is set.
- **Calibration-first voice carried into push:** a reminder whose action is
  already done today (weighed / logged — checked via the weight + diary slices)
  is marked resolved *without* notifying. No nagging about something you've
  already done. And saving prefs after a reminder's time has already passed
  locally seeds `last_*_sent_on = today`, so enabling at 4 pm doesn't instantly
  fire the "morning weigh-in".
- Copy (`notifications.py`) in en/ru/de, picked by the user's stored locale
  (the scheduler has no request, so no Accept-Language). 10 tests → **backend
  201**, tach green.

**Frontend.** `public/sw.js` (tiny service worker: `push` → `showNotification`,
`notificationclick` → focus/open the route). `lib/push.ts` wraps the SW-register
→ permission → `PushManager.subscribe(applicationServerKey)` dance. A new
**Reminders card** in Settings: master toggle, per-reminder on/off + time
pickers, a "this device" subscribe/test/disable block, and a server-not-
configured hint. i18n en/ru/de (26 keys). Timezone is captured from
`Intl.DateTimeFormat` and locale from i18next on save.

- **Dockerfile fix:** the frontend runner stage never copied `public/` (there was
  no public dir before), so `/sw.js` 404'd. Added the copy.

**Deploy.** Generated the VAPID key (`python -m scripts.gen_vapid`), put it in
`backend/.env`, recreated backend (env_file) + rebuilt frontend. Migration
applied on boot; both tables live; scheduler running (`should_run` True).

**Verified on prod.** API e2e (throwaway account): config defaults → prefs
persist → subscribe (count 1) → test push (`devices:1`). Browser (logged-in QA
account, RU): the card renders correctly, toggled the master switch on + saved →
DB shows `enabled=t, locale=ru`, and the anti-retro-fire seeding did its job —
`last_weigh_sent_on=today` (past 08:00) but `last_log_sent_on=null` (before
20:00, so tonight's meal reminder will still fire). `/sw.js` → 200.

**Open:** iOS Safari needs the site installed as a PWA to receive push (a
platform limit; native mobile apps will carry their own push). Real end-to-end
*delivery* through a push service couldn't be exercised headlessly — verified
the full request path and pruning logic instead. Feature list now fully closed;
the remaining lever is distribution, not features.

---

## 2026-06-26 — CSV export (diary + weight log)

List item #6. Spreadsheet-friendly export, alongside the existing JSON GDPR dump.

**Backend.** New `GET /account/export.csv?dataset=diary|weight` (defaults to
`diary`) in the `account` slice, streaming `text/csv` with a
`Content-Disposition` attachment header. `AccountService.export_csv` builds the
file with stdlib `csv`: the diary export joins `DiaryEntry`→`Food` and writes
per-entry kcal/macros scaled to grams; the weight export writes
`logged_on,weight_kg`. No new tables, no migration. 4 tests (diary row math,
weight row, default dataset, auth-required) → backend 191, tach green.

**Frontend.** `account.exportCsv(dataset)` in the API client (the client's
`parse()` already falls back to raw text for non-JSON responses). Settings →
"Data & account" gains two buttons (Diary CSV / Weight log CSV) that fetch and
trigger a Blob download. i18n en/ru/de.

**Deploy.** Rebuilt + redeployed backend + frontend. Smoke: health 200,
`/account/export.csv` → 401 without a token, frontend 200.

**Feature list status:** Trends items #1–6 now all closed. Remaining: reminders
(blocked on SMTP mailbox).

**Dashboard quick weigh-in.** Calibration-first lives or dies on the daily
morning weigh-in ("weigh daily" is literally on the dashboard), yet logging a
weight meant navigating to /weight every morning. The dashboard weight-trend
card now has an inline weigh-in: a number field + "Log" that posts today's
weight, invalidates the weight + calibration queries, and toasts. Once today is
logged the form is replaced by "Today's weight is logged ✓" (guarded by
`loggedToday` = any point with `logged_on === today`). Reuses the existing
`weight.log` endpoint and `weight.*` copy; two new keys (`dashboard.weighInToday`,
`dashboard.weighedInToday`) in en/ru/de. Verified live: logged 80.5 kg from the
dashboard → card flips to "80.5 kg / smoothed trend" + the done note. Also
removed a stray `node_modules/` that had been npm-installed at the repo root.

**Live QA + favicon.** Walked register → onboarding → dashboard → settings on
prod (throwaway account), confirmed the CSV buttons download correctly. The only
defect surfaced was a `favicon.ico` 404 on every page load — the app shipped
without an icon. Added `src/app/icon.svg` (brand rounded-square + the lucide
"activity" pulse, brand-500 on white) via the App Router icon convention; Next
now injects `<link rel="icon">` and serves `/icon.svg` (200). Re-checked prod:
0 console errors.

---

## 2026-06-26 — Recipes / meals (log a whole meal in one tap)

List item #5. Compose foods you eat together into a named recipe, then log the
whole thing in one tap.

**Backend — new `recipes` slice** (tach: `depends_on = [foods, diary]`).
`recipes` + `recipe_components` tables (migration `f6a7b8c9d0e1`, per-user,
cascade on user + food delete). CRUD at `/recipes` with server-computed totals,
plus `POST /recipes/{id}/log` which **expands the recipe into one diary entry
per component** for a (date, meal) — so diary, day summary and analytics keep
working unchanged. Added `DiaryService.add_batch` (one commit + one DIARY_CHANGED
per day) and `FoodService.get_many` (bulk visibility-checked fetch). 8 tests
(187 total), tach green. (Footgun fixed: a method named `list` shadowed the
builtin in a later annotation → `from __future__ import annotations`.)

**Frontend**: a `/recipes` page (cards with totals + components, create/edit in a
dialog with a food-search picker + per-component grams + live total, delete) and
a **Recipes tab in the diary's Add-food dialog** — tap a saved recipe to log it
straight into the open meal. Nav entry; i18n en/ru/de (523 keys, parity).
tsc/eslint/vitest(25) green.

Verified e2e on prod (RU): created "Porridge" (Oats 80 g + Milk 200 g → 424 kcal),
saw it on /recipes, opened Diary → Add → Recipes → tapped it → two breakfast
entries appeared totalling 424 kcal; deleted the account (recipe cascade-cleaned,
0 rows).

Still open from the list: CSV export (small), reminders (SMTP-blocked).

---

## 2026-06-26 — Goal weight + ETA projection

Completes list item #2. The Trends pace card showed rate-vs-plan but couldn't
say "X kg to go, ETA <date>" because the model had no goal weight. Added one.

**Backend**: `profiles.target_weight_kg` (nullable Float, migration
`e5f6a7b8c9d0`) — optional, flows through the existing `model_dump()` upsert and
ProfileOut. Analytics gains a `GoalOut` on `/analytics/trends`: status
(no_target / no_data / reached / on_track / off_track / stalled), start (earliest
trend point) → current (latest trend) → target, remaining kg, progress %, and an
**ETA** (`eta_weeks` + `eta_date`) projected from the smoothed monthly rate.
The ETA is only emitted when the trend is actually moving toward the goal — a
flat trend reads "stalled", moving away reads "off_track", no fake countdown.
5 new tests; backend **179 passed**, tach green.

**Frontend**: optional "Goal weight" input in onboarding + Settings (shown when
goal ≠ maintain). A Goal-progress card on Trends: progress bar (start · now ·
target), and a status line — on-track shows "X kg to go · on track for <date>
(~N wk)", with stalled/off-track/reached/no-data variants and a "set a goal"
prompt linking to Settings when none is set. i18n across en/ru/de (498 keys,
parity). tsc/eslint/vitest(25) green.

Verified e2e on prod: seeded a throwaway (target 75, weights 82→79.4 over 4
weeks) → goal card showed 9%, 82→75 with current trend 81.4, "6.4 kg to go · on
track for 20 Apr 2027 (~43 wk)", RU-localized ETA date; deleted the account.
(The EMA trend lags sparse weekly weigh-ins, so the projection is conservative —
honest, and tightens with daily weighing.)

Still open from the list: recipes/meals, CSV export, reminders (SMTP-blocked).

---

## 2026-06-26 — Trends / insights (weekly + monthly rollups)

The app had no period view — dashboard was today-only, diary was day-by-day,
weight had a chart but no per-period rate. For a "read the trend, not the day"
product that was the biggest content gap. Added a **Trends** screen.

**Backend — new `analytics` slice** (read-only/derived, owns no tables; tach:
`depends_on = [diary, weight, nutrition, profile]`). `GET /analytics/trends`
returns, for the last 7 and last 30 days: avg kcal + macros over logged days,
logging adherence (days logged / total), on-target days (within ±10% of the
kcal target), avg-vs-target delta, weight change + weekly rate from the smoothed
trend, a 30-day intake series for the chart, and **pace vs plan** (actual weekly
rate vs the goal's target rate, with an on-pace %). Added `DiaryService.daily_totals`
(per-day full nutrients) feeding the aggregator. 4 tests; backend **174 passed**,
tach green. No migration (derived data).

Note: there's no goal-*weight* in the data model, so "ETA to target weight"
isn't computed — pace is rate-vs-plan instead (honest with what we store).

**Frontend — `/trends` screen**: two period cards (7d / 30d) with adherence bar,
avg calories vs target, on-target days, macro averages, weekly weight rate; a
pace-vs-plan card (planned vs actual rate, on-pace badge); and a 30-day daily-
calories bar chart with the target line, over/under colouring and not-logged
days. Nav entry added (desktop + mobile). i18n `trends.*` + `nav.trends` across
en/ru/de (482 keys, parity verified). tsc/eslint/vitest(25) green.

Verified end-to-end on prod: seeded a throwaway with 6 logged days + 3 weigh-ins,
rendered the screen (week 6/7, avg 2248 kcal −526 vs target, rate −0.2 kg/wk,
pace 32%, chart with target line + bars), confirmed RU localization, deleted the
account.

This covers list items #1–#4 (weekly/monthly averages, adherence, weight rate,
pace). Still open from the list: goal-weight + ETA projection (needs a
target-weight field), recipes/meals, CSV export, reminders (SMTP-blocked).

---

## 2026-06-26 — DB-backed legal content + admin editor

The legal pages (Impressum/Privacy/Terms/Cookies) were static in the frontend
(`lib/legal.ts`) with `[Operator legal name]`-style placeholders that needed a
code change to fill. Made them admin-editable.

**Backend — new `legal` slice** (canonical VSA, tach leaf, `depends_on = []`),
same defaults-plus-overrides shape as `app_config`:
- `defaults.json` (generated from `lib/legal.ts` via tsx, lives inside the slice)
  is the baseline; a `legal_documents` row overrides a (doc, locale). Migration
  `d4e5f6a7b8c9`.
- Public `GET /legal/{doc}` — localized via Accept-Language (or `?locale=`),
  unknown locale → English, unknown doc → 404.
- Admin `GET /admin/legal` (all 12 doc×locale, override-or-default with a
  `customized` flag), `GET/PUT /admin/legal/{doc}/{locale}`.
- 10 tests (`test_legal.py`): defaults, localization, locale fallback, 404,
  admin list, admin-role gate, create/update override, public reflection,
  no-duplicate upsert. Backend **170 passed**, tach green.

**Public frontend** — `LegalPage` renders the bundled copy instantly (no flash,
crawlable) then swaps in the live API version (which carries any admin override);
on fetch error it keeps the bundled copy, so the page never blanks.

**Admin console** — new `/legal` page: a card per document with en/ru/de chips
(`customized`/`default` badges), and a section editor (title, intro, last-updated,
add/remove sections, add/remove body paragraphs). Plain-fetch, matches the
existing admin style.

Verified end-to-end against prod with a throwaway admin: edited impressum/en
(filled the operator placeholder), confirmed `customized=true` and that the
public page served the override, opened the editor in the browser (sections +
controls render), then reverted the row (table back to 0 = defaults) and deleted
the account. **Defaults still carry the placeholders** — the operator now fills
real legal details from Admin → Legal pages instead of editing code (closes the
editing half of the Impressum/Privacy launch blocker; the real data is still
the owner's to enter).

---

## 2026-06-26 — OFF catalog expansion (EU + RU)

Grew the Open Food Facts slice from **18,490 → 64,710** (+46,220, all barcoded).

First confirmed the old `DACH/RU`-only filter was exhausted, not partial: a full
re-scan of the 12.4 GB dump did **3,000,000 lines, 0 new kept** — every match was
already in the DB. A breakdown showed the old yield was name-driven (14,148 RU
names, 3,156 DE names, only 1,199 by country alone), so re-running couldn't add
anything.

Broadened `scripts/import_off.py` `_KEEP_COUNTRIES` from 4 (DE/AT/CH/RU) to 16 —
the EU markets whose products share German/Austrian shelves plus the
Russian-speaking neighbours: FR, NL, BE, LU, PL, CZ, IT, ES, GB, UA, BY, KZ. The
"or has a DE/RU name" rule and the kcal requirement are unchanged; dedup by
(barcode|name) so the existing rows aren't doubled.

Re-streamed the full dump (zero disk footprint, host gunzip → container insert):
scanned 4,577,280 lines, inserted 46,220. The new rows are country-matched with
native names (FR/PL/IT/…), so the DE/RU-named subset stays 18,490 and DE/RU text
search isn't polluted — the win is **3× barcode coverage** for products actually
sold in the EU. Smoke: guest "käse" → 30 results 0.29s; a fresh French product
resolves by barcode in 0.03s. pg_trgm GIN holds. Catalog total ~523k.

---

## 2026-06-26 — Admin foods/params CMS + SMTP attempt

**Admin catalog + parameters (standalone console).** The standalone admin
(`admin-vitaforge.matrix-capital.net`) had only Overview + Users; ported the
Foods and Parameters management that previously lived only in the in-app admin.
- `admin/src/lib/api.ts`: types (FoodOut/FoodCreate/Portion/ParamsView) +
  endpoints (foods/createFood/updateFood/deleteFood, getParams/setParams) —
  all hit existing backend admin routers, no backend change.
- `foods/page.tsx`: search, list (source badge + per-100g macros + barcode),
  create/edit modal (the admin app has no Dialog primitive, so a lean inline
  overlay), delete with confirm. `params/page.tsx`: effective values grid,
  "overridden" badges, save.
- `(panel)/layout.tsx`: Foods + Parameters nav entries (desktop + mobile).
- Verified end-to-end against prod: registered a throwaway, promoted it to admin
  in the DB, confirmed list/create/edit/delete via API (201/200/204, 0 leftover)
  and the UI (modal + params grid render), then deleted the account (cascade —
  0 rows, only the real owner remains admin). Did **not** click "Save
  parameters" so no engine overrides were written to prod. admin tsc clean.

**SMTP — attempted, blocked on credentials.** Wired `andreas@mattalnet.com` /
`send.one.com` into `backend/.env` (mattalnet.com is on one.com per MX). one.com
rejected the login with **535 Authentication failed** on both 465 (SSL) and 587
(STARTTLS) — transport fine, the password pair is wrong/needs SMTP enabled. Per
policy I don't guess passwords, so reverted the mailer to the safe console
fallback (host/user kept as a ready recipe, password blanked) and recreated the
backend. **Still blocked:** need a working mailbox password (or confirm SMTP
access is enabled for that mailbox) — then just fill `SMTP_PASSWORD` and
`up -d --force-recreate backend`.

---

## 2026-06-26 — UX debts: change password, weight legend, auth routing

Closed the open UX debts from the 2026-06-25 UI audit. All three verified in
the browser against prod (registered a throwaway account, exercised each flow,
then deleted it — 0 rows left behind).

**Change password (signed-in users)** — previously you could only reset via the
emailed link from the logged-out flow.
- Backend: `POST /auth/change-password` (authenticated). `AuthService.change_password`
  re-verifies the current password (a hijacked session can't silently swap it),
  rejects a no-op change, and voids any outstanding reset tokens. New i18n keys
  `error.current_password_wrong` / `error.password_unchanged` (en/ru/de).
- Frontend: a "Password" card in Settings (current / new / confirm, client-side
  length + match checks, backend error surfaced via `Accept-Language`).
- Tests: 5 new in `test_email_auth.py` (success, wrong-current 401, same-password
  422, unauth 401, voids reset tokens). Backend **160 passed**, tach green.

**Weight chart legend** — with a single weigh-in the chart shows a "log two days"
hint, but the raw/trend legend still rendered underneath (meaningless). Gated the
legend on `points.length >= 2` so it only shows when the trend line is drawn.

**Auth routing / flicker** — a signed-in visitor hitting `/login`, `/register`
or `/` saw the guest form/landing for a beat. New `useRedirectIfAuthed` hook
(mount-gated so the first client render still matches SSR — no hydration
mismatch) bounces them to `/dashboard`; login/register show a spinner during the
redirect, and the landing's auth check is mount-gated the same way.

**i18n:** `settings.security.*` added to en/ru/de; all three locales at 452 keys,
parity verified. tsc / eslint / vitest (25) green.

**Deploy:** `-p vitaforge up -d --build`. Smoke: `/health` 200,
`/api/v1/auth/change-password` 401 unauth, change-password round-trip confirmed
(old pw → 401, new pw → 200).

**Still open (unchanged):** SMTP delivery (mailbox not created), admin
foods/params CMS depth, OFF catalog beyond the 18.5k DACH/RU subset, mobile apps.

---

## 2026-06-26 — Separate admin console + landing hero preview

**Admin console** — a standalone Next.js app on its own subdomain
`admin-vitaforge.matrix-capital.net`, matching the pattern the other projects
use (separate from the app). Reuses VitaForge's exact design system (copied
tailwind tokens + globals + theme), so it's the same light-first look with a
dark toggle.

- `admin/` — lean Next.js 15 (no react-query/i18n; plain fetch + zustand theme).
  Admin-gated login (the `/auth/me` role must be `admin`, else bounced),
  sidebar shell + mobile top/bottom bars.
- Overview: platform stats from `GET /admin/stats`. Users: list/search +
  promote/demote + enable/disable via `PATCH /admin/users/{id}` (existing
  backend endpoints — no backend changes needed).
- Infra: admin service on `127.0.0.1:3631` in docker-compose; nginx vhost +
  LE cert for the subdomain (wildcard DNS already resolved it). Backend
  `CORS_ORIGINS` extended to allow the admin origin (the first sign it was
  needed: `/auth/me` preflight blocked → login bounced).
- Verified live: login gate, overview (Foods 476,744 etc.), users table.

**Landing hero** got a framed product preview (the calorie ring + macro bars in
a glowing card) under the copy — a real product snapshot beats a stock photo for
a tracker and it's 100% ours (no image licensing).

Next: admin foods/params management, and optional DB-backed legal content so the
admin can edit the policy pages.

---

## 2026-06-25 — Light-first theming (light default + dark/system toggle)

Reworked the design system to be light by default with a dark/system toggle —
the friendly, consumer-health look, with our own palette (kept the steel-blue
brand, added a teal accent; macro hues tuned per theme).

- **Tokens → CSS variables.** `tailwind.config.ts` semantic colors now resolve to
  `rgb(var(--token) / <alpha-value>)`, so opacity modifiers still work. The
  palette lives in `globals.css`: `:root` = light (default), `.dark` = the old
  graphite values. Components only ever name semantic tokens, so flipping the
  class re-themes the whole app — the sweep was tiny (the catalog was already
  ~all semantic). Themed shadows + skeleton shimmer via vars too.
- **No-flash.** Inline script in `app/layout.tsx` applies `.dark` from
  `localStorage('vf_theme')` before first paint; light is the default so an
  unset visitor never flashes. `suppressHydrationWarning` on `<html>`.
- **Theme store + toggle.** `lib/theme.ts` (light/dark/system, persisted,
  tracks OS changes in system mode). `ThemeToggle` (cycling icon button) wired
  into the sidebar footer, mobile top bar, auth scaffold and /try header;
  `ThemeSegmented` added to Settings beside Language.
- **Charts re-themed.** `charts.tsx` hardcoded hex → Tailwind stroke/fill classes
  + `currentColor` gradient stops, so the ring/trend follow the theme.
- Verified in prod: login + full dashboard in both light and dark; toggle
  persists; charts/ring/macro bars/banner all theme correctly. tsc + eslint +
  vitest(25) green.

Note: this is our own light theme in the standard health-app idiom (light
surfaces, soft shadows, rounded cards) with VitaForge's own colors — not a copy
of any specific product's design.

---

## 2026-06-25 — Quick-amount chips for logging (portion friction)

Investigated the "grams-only, no portion presets" UX complaint. Finding: the
named-portion picker (grams/portions toggle + portion select + **live kcal/macro
preview**) was already built and working — but only the 154 curated staples
carry portion data (`food_portions`); the 477k USDA/OFF bulk rows have none, so
for almost everything you fell back to typing grams. (My earlier audit was
partly wrong: live preview already worked; the gap is data coverage, not UI.)

- Added one-tap **quick-amount chips** (30/50/100/150/200/250 g) under the grams
  input in `AddFoodDialog`, shown for every food. Tapping sets the amount; the
  active chip highlights; the existing live kcal/macro preview updates. Kills the
  "type grams every time" friction for the bulk catalog without needing portion
  data. Frontend-only, no new i18n (uses `common.grams`).
- Verified in prod: chips render + 200 g → 122 kcal live for a milk row; API
  still returns named portions for staples (`Молоко 3.2%` → cup 250 g), so the
  richer toggle path is intact.

Deeper portion coverage for real branded products would need serving sizes
captured from the USDA/OFF dumps at import — deferred with the heavy re-import.

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
