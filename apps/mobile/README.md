# WEAVE Android frontend

This package contains native, prop-driven mobile screens and an explicitly labeled UI demo. All business data and mutations in the demo are simulated; camera, QR, sharing, and permission controls may operate on the device. Live mode currently shows an integration notice; it does not silently use fixture data.

Branch: `mob/wp-0-mobile-foundation`. The expanded scope is Mobile frontend plus Android build preparation. This is not completion of Mobile P0, the MVP, or gates G0–G6. See [FRONTEND_STATUS.md](FRONTEND_STATUS.md) for the screen inventory, remaining gaps, and exact team interfaces.

## Run the UI

Use the existing installed dependencies from PowerShell:

```powershell
Set-Location -LiteralPath 'D:\Android\WEAVE\apps\mobile'
$env:EXPO_PUBLIC_ENABLE_UI_PREVIEW = 'true'
pnpm run start
```

`start` runs `expo start --dev-client`. Open a compatible Android development build, then choose the UI preview on Welcome. Expo Go is not the target runtime. `pnpm run android` runs the existing `expo run:android` script when an emulator or device is available.

For a browser preview:

```powershell
$env:EXPO_PUBLIC_APP_MODE = 'demo'
pnpm run start --web
```

Browser preview does not establish Android behavior. The Supabase HTTPS URL was reachable from the PC only; phone access has not been verified. Camera, QR scanning, sharing, notification permissions, cold start, and TalkBack require native checks.

The demo entry is `/preview/events`. Feature groups use `/preview/[screen]`; IDs are listed in the status document. Open Preview tools → screen catalog (`directory`) to inspect the routes. The shared preview shell supplies loading, empty, error, offline, and simulated failure controls. Its scenarios are session-only and may maintain separate state across feature groups. They are not a persisted, cross-feature backend.

Live `/`, `/events`, and `/connection` routes are integration shells. Real sign-in, authenticated routing, invitations, membership updates, and push/deep-link destinations need the team-owned data layer.

## Existing verification commands

```powershell
pnpm run typecheck
pnpm run lint
pnpm run test
```

These are commands to run, not a claim that the latest source passed them. Current evidence and pending checks are recorded in the status document. Focused tests do not replace required security, integration, or device gates.

To export and check the live/demo fixture boundary:

```powershell
$env:EXPO_PUBLIC_APP_MODE = 'live'
$env:EXPO_PUBLIC_ENABLE_UI_PREVIEW = 'false'
pnpm run export:android --output-dir dist
$env:EXPO_PUBLIC_APP_MODE = 'demo'
$env:EXPO_PUBLIC_ENABLE_UI_PREVIEW = 'true'
pnpm run export:android --output-dir dist-demo
node scripts/check-preview-boundary.cjs
```

`metro.config.cjs` substitutes an empty preview module in live release builds and rejects fixture imports there. A standalone demo must explicitly set `EXPO_PUBLIC_APP_MODE=demo`; a runtime `__DEV__` guard alone is not the bundle boundary. The checker needs both exports and checks for the fixture marker.

## Android APK preparation

The local build script accepts `development`, `preview`, and `release`. Its defaults are `D:/Android/Sdk`, `D:/Android/Studio/jbr`, and `arm64-v8a`; override them for the local installation or target architecture.

```powershell
./scripts/build-android.ps1 -Mode development
./scripts/build-android.ps1 -Mode preview
./scripts/build-android.ps1 -Mode release
```

| Mode | Android variant | UI mode | Expected output |
|---|---|---|---|
| `development` | Debug | Live shell with development preview enabled; Metro required | `artifacts/weave-development-arm64-v8a.apk` |
| `preview` | Release | Explicit standalone demo, with simulated data | `artifacts/weave-preview-arm64-v8a.apk` |
| `release` | Release | Live shell; demo disabled; real integration still absent | `artifacts/weave-release-arm64-v8a.apk` |

The script runs Expo prebuild without reinstalling dependencies, invokes Gradle, copies the APK, verifies its signature with `apksigner`, and writes an adjacent `.sha256` file. Non-development modes use a locally generated signing key under `.cache/signing`; retain it for compatible updates. Signing files, generated native directories, caches, and artifacts are ignored by Git. These commands do not publish or upload an app.

The script's local `preview` mode corresponds to a demo build. In `eas.json`, the demo profile is named `ui-preview`; EAS `preview` is a separate live-shell profile. Do not treat those profile names as interchangeable.

Native APK compilation awaits the official NDK/platform/CMake downloads; interrupted transfers are being resumed. Artifact/device verification remains pending. No successful APK installation or native acceptance run is claimed. A completed JS export alone is not an APK build.

## Integration and ownership

- Mobile owns presentation, Android build configuration, camera/QR UI, permission handling, and navigation display.
- Mingpham owns `packages/contracts`, `apps/mobile/src/lib`, the API client, query hooks, upload hooks, persistence, realtime, push integration, and API endpoints #1–36 and #49–53. SCR-17, SCR-19, SCR-20, and SCR-26 remain Mingpham-owned integration slots; their source is absent here and ownership has not transferred.
- AI & Engine owns endpoint routes #37–48 and recovery/claim/AI evaluation. DB owns RPCs, RLS, Storage policies, and migrations.
- Feature types are presentation models, not substitute API DTOs or enums. Mutation callbacks must resolve after server acknowledgement and reject with mapped error information. Adapters own request identity, idempotency, versions, validation, retries, refetching, and authorization.
- Examples and simulated transitions are isolated in `tests/fixtures/mobile`. A future adapter must import canonical contracts and supplied `POL.*` rather than promote these fixtures into production logic.

Supabase CLI login/link is explicitly deferred by the user. In the inspected environment both Google and anonymous sign-in settings were disabled, and the Edge API request ending in `/api/v1/me` returned 404. These are observed integration blockers, not credentials to infer or configuration to change from this frontend task. A publishable key is not a CLI management token.

## Reference

- [MVP specification](../../docs/WEAVE_MVP_Specification.md): §6 screens/UX, §9 contracts, §15 ownership, §16 agent rules.
- [Stack ADR](../../WEAVE_4_0_Stack_Lock_ADR.md).
- Expo SDK 57 and NativeWind 4.2.7 are the native foundation; the current package manifest records exact package constraints. Shared workspace/lockfile integration remains coordinated with Mingpham.

## Reproducible dependency installation

The lockfile belongs only to `apps/mobile`; no root workspace or shared lockfile is changed. From this directory use `pnpm install --ignore-workspace --frozen-lockfile --store-dir .cache/pnpm-store --offline=false`.

Additional packages support native QR scanning/rendering (`expo-camera`, `react-native-qrcode-svg`, `react-native-svg`), OS notification permission UI (`expo-notifications`), selected bundled prototype fonts, and browser-only layout preview (`react-dom`, `react-native-web`). The explicit JSX transform/css-interop packages fix isolated pnpm NativeWind resolution. `react-test-renderer` is limited to focused ACK/draft guard tests and currently emits a deprecation warning. No extra backend service is introduced.
