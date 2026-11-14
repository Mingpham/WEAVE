# WEAVE Android frontend

Native Expo SDK 57 / TypeScript / Expo Router / NativeWind 4.2.7 presentation for the 29 Mobile-owned screens. Product routing contains no fixture-backed preview. UI components accept typed props and server-acknowledged callbacks; the team data provider is still required to populate event screens.

Branch: `mob/wp-0-mobile-foundation`. Ownership remains unchanged: Mingpham supplies contracts, `src/lib`, auth/data/upload/realtime hooks and SCR-17/19/20/26. Missing services show an unavailable state, never simulated success. See [FRONTEND_STATUS.md](FRONTEND_STATUS.md) for the screen/interface inventory and [MOBILE_UI_TASKS.md](MOBILE_UI_TASKS.md) for this UI delivery.

## Run

From PowerShell with the existing installed dependencies:

```powershell
Set-Location -LiteralPath 'D:\Android\WEAVE\apps\mobile'
pnpm run start --web --clear
```

For an installed compatible Android development client:

```powershell
pnpm run start --clear
```

The Android development client requires Metro. Expo Go is not the target runtime. No APK was successfully produced in the last authorized native build; do not interpret a web bundle as Android acceptance.

Routes: `/` (Welcome), `/auth`, `/events`, `/join?code=...`, `/join/consent`, `/join/profile`, `/create-event`, and `/p/{projectId}/{screen}?item={entityId}`. Event destinations and role/pending-membership guards live in `src/features/navigation/routes.ts`. The organizer and participant tab bars share the native screen shell.

## Team integration

Wrap the router in `MobilePresentationProvider` from `src/features/navigation/presentation.tsx`. Supply hook-derived session state, a pure `read(route)` lookup returning `MobileBinding`, and the four owner-screen slots. `MobileView` is a discriminated union pairing each screen with its component props; it is a presentation boundary, not a replacement API contract.

A binding supplies loading/empty/error/offline state and authoritative event access. Mutation callbacks resolve only after server ACK and reject on failure. Adapters own authorization, idempotency, canonical versions/policy values, uploads, durable drafts and refetching. Use canonical contracts from the team branch; do not promote `tests/fixtures/mobile` into the app.

Without this provider the app opens Welcome and local entry controls, while data-dependent screens report unavailable. There is no real-service completion claim. Supabase login/link remains deferred.

## Checks

```powershell
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm exec expo export --platform web --output-dir dist
node scripts/check-preview-boundary.cjs dist
```

Metro rejects fixture imports in product bundles. The boundary checker asserts that exported JavaScript contains no fixture marker. The commands are available for verification; recorded results and skipped device checks are in the status document.

## Android build preparation

The existing script supports these commands, but no new build was authorized or run during this UI completion task:

```powershell
./scripts/build-android.ps1 -Mode development
./scripts/build-android.ps1 -Mode preview
./scripts/build-android.ps1 -Mode release
```

`development` is a debug development client requiring Metro. Both `preview` and `release` embed the product JavaScript bundle and are intended to run without Metro. `preview` means internal APK distribution, not simulated business data. All modes use `com.weave.mobile`.

Expected artifacts are `artifacts/weave-{mode}-arm64-v8a.apk` plus SHA256 files. Local non-development builds use an ignored signing key under `.cache/signing`; retain it for compatible updates. Defaults: SDK `D:/Android/Sdk`, JDK `D:/Android/Studio/jbr`, installed NDK `27.1.12297006`, arm64-v8a. Dependencies, native tools and shared lockfiles were not changed in this UI task.

The last native attempt failed at `:react-native-worklets:configureCMakeRelWithDebInfo[arm64-v8a]`. No APK or phone smoke-test pass exists. [BUILD_HANDOFF.md](BUILD_HANDOFF.md) preserves the exact historical error/log and final-attempt limit.

## References

- [MVP specification](../../docs/WEAVE_MVP_Specification.md): behavior, screen inventory and ownership.
- [Stack ADR](../../WEAVE_4_0_Stack_Lock_ADR.md): stack decisions.
- [Prototype](../../docs/prototypes/WEAVE_4.0_Mobile_Prototype-2.html): visual reference; implemented with native components.

The package-local lockfile remains separate from the shared workspace. Only if installation is needed: `pnpm install --ignore-workspace --frozen-lockfile --store-dir .cache/pnpm-store --offline=false`.
