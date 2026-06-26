# VitaForge — Mobile

Native clients for the VitaForge API: **iOS** (SwiftUI) and **Android** (Jetpack
Compose). Both talk to the same backend; the contract is `docs/MOBILE_API.md`
and the live `openapi.json` is canonical for DTOs.

| Platform | Path | Build on | Toolchain |
| --- | --- | --- | --- |
| iOS | [`ios/`](ios/README.md) | macOS | Xcode 15+, XcodeGen, iOS 16 target |
| Android | [`android/`](android/README.md) | SDK machine | Android Studio / Gradle, minSdk 26 |

## Status — scaffolded, not yet compiled

This source was written on a Linux server that has **no Swift/Xcode and no
JDK/Gradle/Android SDK**, so it is **source-only and has not been through a
compiler**. First build + verification happen on the Mac/Win build instances
(where the paid store accounts live). Treat the first build as a compile-fix pass.

Both apps implement the same core loop, deliberately mirrored so the two stay in
step:

1. **Auth** — register / login, JWT stored in Keychain (iOS) /
   EncryptedSharedPreferences (Android), single-flight refresh on 401.
2. **Onboarding** — profile form → `PUT /profile` (triggers the norm compute).
3. **Dashboard** — calorie ring + macro bars + maintenance + coaching guidance.
4. **Diary** — search the catalog (localized via `Accept-Language`), log and
   delete entries.
5. **Weight** — daily weigh-in + raw/EMA-trend chart (Swift Charts on iOS, a
   Compose `Canvas` chart on Android).
6. **Calibration** — window progress, real-TDEE recalc / skip, estimate result.
7. **Trends** — 7/30-day summaries (logging adherence, avg intake, on-target,
   weight change/rate), pace, and goal progress + ETA.
8. **Recipes** — list saved recipes and log one to today's diary in a tap
   (creation stays on the web for now).

Every request sends the user's language as `Accept-Language` (en/ru/de) so
server-generated copy comes back localized.

### Not yet built (next passes)

Recipe creation UI, **push reminders** (APNs / FCM — separate from the web's Web
Push, needs new backend device-token endpoints), barcode scanner, biometric
app-lock, store metadata/CI. The networking + auth + model foundation is
shared-shaped on both platforms so these slot in directly.
