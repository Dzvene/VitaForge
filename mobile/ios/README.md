# VitaForge — iOS (SwiftUI)

Native iOS client. **Built/run on a Mac** (Xcode 15+, iOS 16 deployment target).
This box (Linux) has no Swift/Xcode toolchain, so the source here is unverified
by a compiler — first build happens on the Mac instance.

## Build

```sh
brew install xcodegen          # once
cd mobile/ios
xcodegen generate              # creates VitaForge.xcodeproj from project.yml
open VitaForge.xcodeproj        # set your DEVELOPMENT_TEAM, run on a simulator/device
```

`.xcodeproj` is gitignored — it's generated from `project.yml`.

## Architecture

- **No third-party deps.** URLSession, SwiftUI, Security (Keychain).
- `Sources/Core/APIClient.swift` — `actor` doing JWT auth with **single-flight
  token refresh** on 401, and `Accept-Language` (en/ru/de) on every request.
- `Sources/Core/KeychainTokenStore.swift` — JWT pair in the Keychain.
- `Sources/Models/` — DTOs mirroring `docs/MOBILE_API.md` (snake_case decoded via
  `.convertFromSnakeCase`). When the schema grows, prefer regenerating from
  `openapi.json` over hand-editing.
- `Sources/Session/Session.swift` — auth/routing state machine
  (`loading → unauthenticated → onboarding → ready`).
- `Sources/Features/` — Auth, Onboarding, Dashboard, Diary (+ add food), Settings.

## Scope (this pass)

Core loop: register/login → onboarding (profile) → dashboard (calorie ring +
macros + maintenance + coaching) → diary (search catalog, log/delete entries).
**Not yet:** weight logging + trend chart, calibration screen, recipes, trends,
push reminders, barcode scanner, biometric lock. The networking + auth + model
foundation is built to extend to those directly.
