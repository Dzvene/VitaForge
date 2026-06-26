# VitaForge — Mobile API hand-off

Contract for the native apps (iOS SwiftUI, Android Compose) built on the
Win/Mac instances. The backend is the single source of truth; this doc is the
orientation, the **live OpenAPI schema is canonical** for request/response DTOs.

## Hosts

| Env | Base URL |
| --- | --- |
| Production API | `https://api-vitaforge.matrix-capital.net/api/v1` |
| Health (no prefix) | `https://api-vitaforge.matrix-capital.net/health` |
| OpenAPI JSON (DTO source of truth) | `https://api-vitaforge.matrix-capital.net/openapi.json` |
| Swagger UI | `https://api-vitaforge.matrix-capital.net/docs` |

Generate native models from `openapi.json` (e.g. swift-openapi-generator /
openapi-generator kotlin) rather than hand-writing DTOs — the schema moves.

## Auth (JWT, HS256)

Stateless bearer tokens. Flow:

1. `POST /auth/register` `{ email, password (≥8), full_name? }` → `UserOut`.
   The **first** account created becomes `role: "admin"` (owner); the rest are
   `"user"`.
2. `POST /auth/login` `{ email, password }` → `{ access_token, refresh_token, token_type }`.
3. Send `Authorization: Bearer <access_token>` on authed calls.
4. On `401`, `POST /auth/refresh` `{ refresh_token }` → new token pair. Refresh
   single-flight; if refresh fails, send the user back to login.
5. `GET /auth/me` → current `UserOut`.

Token TTLs: access **60 min**, refresh **30 days** (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`
/ `JWT_REFRESH_TOKEN_EXPIRE_DAYS`). Store tokens in the platform keychain/keystore.

## Localization — send `Accept-Language`

Server-generated copy (coaching hints/warnings/day-guidance, key error messages)
is localized **en / ru / de** from the `Accept-Language` header. Send the user's
app language on **every** request (e.g. `Accept-Language: de`). Unsupported tags
fall back to English. Static food names are not translated (catalog data).

## Route groups (under `/api/v1`)

| Prefix | Purpose |
| --- | --- |
| `/auth` | register, login, refresh, me |
| `/profile` | get/update profile (drives the nutrition norm) |
| `/nutrition` | current target (Norm) + recompute |
| `/foods` | search, barcode lookup, custom foods, favorites |
| `/diary` | log/remove entries, day summary, copy day, recent foods |
| `/weight` | log weight, series + EMA trend |
| `/calibration` | status/estimate, recalc, skip (real-maintenance back-calc) |
| `/coaching` | hints, data-driven warnings, in-day guidance, accept/dismiss |
| `/public` | **guest** preview (no auth): nutrition/weight/calibration preview |
| `/admin` | owner-only: overview stats, foods CRUD, users |

## Guest preview (no account)

`POST /public/nutrition/preview`, `/public/weight/trend`, `/public/calibration/preview`
mirror the authed compute with no auth/DB — use for an onboarding "try it"
screen. `GET /foods/search` and `/foods/barcode/{barcode}` work without a token
too (shared catalog only).

## Onboarding sequence (mirror the web flow)

1. Register → login → store tokens.
2. `GET /profile` → 404 means onboarding not done → collect sex/age/height/
   weight/activity/goal/target_rate → `PUT /profile`. Saving the profile triggers
   (server-side, via events) the initial norm compute + opens the calibration
   window.
3. Land on the dashboard: `GET /nutrition` (target) + `GET /diary` (day) +
   `GET /coaching/day-guidance`.

## Enums (keep native enums in sync with the schema)

- sex: `male` | `female`
- activity_level: `sedentary` | `light` | `moderate` | `high` | `very_high`
- goal: `lose` | `maintain` | `gain`
- meal: `breakfast` | `lunch` | `dinner` | `snack`

## Push notifications (reminders)

Reminders (weigh-in / log-your-day) are delivered to native apps over **APNs**
(iOS) and **FCM** (Android). The schedule itself is configured via
`PUT /reminders/prefs` (master switch, timezone, per-reminder `HH:MM` local time,
locale); the scheduler stays silent when the day's action is already done.

Register the device's push token after the user grants permission, and clear it
on sign-out:

- `POST /reminders/devices` `{ platform: "ios" | "android", token }` → 204.
  `token` is the APNs device token / FCM registration token. Re-registering the
  same token is idempotent (re-points it at the current user).
- `DELETE /reminders/devices` `{ token }` → 204.
- `POST /reminders/test` → fires a test notification to all of the account's
  registered devices + browser subscriptions; returns `{ delivered, devices }`.
- `GET /reminders/config` includes `native_push_enabled` (server has APNs/FCM
  creds) and `devices` (count registered for this account).

Server credentials (APNs `.p8` key id/team id/bundle id; FCM service-account
JSON) are configured in the backend env. Until they're set, registration still
works and tokens are stored, but `test`/scheduled sends report `delivered: 0`.

## Notes

- All nutrition is stored/served **per 100 g**; portions carry grams.
- Dates are `YYYY-MM-DD` (local day, no tz shift) in diary/weight.
- CORS is configured for the web app; native clients are unaffected by CORS.
