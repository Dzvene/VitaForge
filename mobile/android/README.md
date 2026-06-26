# VitaForge — Android (Jetpack Compose)

Native Android client. **Built/run on a machine with the Android SDK** (Android
Studio Koala+ or the command-line SDK). This Linux box has no JDK/Gradle/SDK, so
the source here is unverified by a compiler — first build happens on the
Win/Mac/Linux build instance.

## Build

Open `mobile/android` in Android Studio and let it sync (it provisions Gradle),
**or** from the command line:

```sh
cd mobile/android
gradle wrapper            # once, to materialize ./gradlew + wrapper jar
./gradlew assembleDebug   # builds app/build/outputs/apk/debug/app-debug.apk
```

The Gradle wrapper jar/scripts are intentionally not committed; `gradle wrapper`
(or Android Studio) generates them. Set the SDK path in `local.properties`
(`sdk.dir=…`) — Android Studio does this automatically.

## Stack

- Kotlin 2.0, Jetpack Compose (Material 3), single-Activity.
- **OkHttp + kotlinx.serialization** for networking — `core/ApiClient.kt` does JWT
  auth with **single-flight token refresh** (a `Mutex` coalesces concurrent 401s)
  and sends `Accept-Language` (en/ru/de) on every request.
- `core/TokenStore.kt` — JWT pair in `EncryptedSharedPreferences` (Keystore-backed).
- `model/Models.kt` — `@Serializable` DTOs mirroring `docs/MOBILE_API.md`
  (explicit `@SerialName` for the snake_case wire keys).
- `session/SessionViewModel.kt` — auth/routing state machine
  (`LOADING → UNAUTH → ONBOARDING → READY`).
- `ui/` — Auth, Onboarding, Dashboard, Diary (+ add-food sheet), Settings.

## Scope (this pass)

Register/login → onboarding → dashboard → diary → weight (Canvas trend chart) →
calibration → a "More" tab holding trends (7/30-day summaries + goal/pace),
recipes (log to diary), and settings.
**Not yet:** recipe creation, push reminders, barcode scanner, biometric lock.
