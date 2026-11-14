# Mobile source handoff — 2026-11-14

Branch: `mob/wp-0-mobile-foundation`. Frontend commit: `9b2a391`. Prototype-only commit: `1ea4289`. Both were pushed to origin. The subsequent build configuration changes are committed separately.

## Run

```powershell
Set-Location -LiteralPath 'D:\Android\WEAVE\apps\mobile'
$env:EXPO_PUBLIC_ENABLE_UI_PREVIEW = 'true'
pnpm run start
```

This starts Metro for a development client. Choose UI preview on Welcome. For a standalone, signed, explicitly labeled demo APK:

```powershell
./scripts/build-android.ps1 -Mode preview
```

Expected artifact: `artifacts/weave-preview-arm64-v8a.apk`, with an adjacent SHA256 file. `preview` uses the release variant, package `com.weave.mobile.preview`, and embeds the JavaScript bundle. It does not require Metro. A successful APK or phone smoke test must be recorded before claiming it works.

## Source coverage and limitations

- 29 Mobile screen components: Welcome/My Events; sign-in and joining/consent/profile/waiting; event creation/People/Settings/Me; Plan Studio/editor/review/resources; task board/detail/editor/assignment/submission review; Command Center/Participant Home; incident/manual decision/new incident; composer/report/probe/resource report/recovery offer/evidence detail.
- Native camera/gallery compression, QR scan/share, and notification permission presentation are implemented. Device verification is pending.
- All business flows use visibly labeled, session-only fixtures in `tests/fixtures/mobile`. Real auth, API mutations, upload, persistence, realtime, push registration, and team contract integration are absent.
- SCR-17 Timeline, SCR-19 Close & Report, SCR-20 Settlement and SCR-26 Inbox remain owner integration slots. No replacement implementation or ownership transfer was made.
- See `FRONTEND_STATUS.md` for screen IDs and exact required team interfaces. Supabase login/link remains deferred.

## Checks already completed

- Integrated TypeScript and ESLint passed after the screen work.
- Ten ACK/draft/guard tests passed. Three focused regression cases passed for failed/stale manual rechecks and partial offer retry behavior.
- Live and demo Android JavaScript exports passed; the fixture-boundary check passed. These do not establish native APK success.
- No additional broad review, dependency change, or test rerun is required merely to push this handoff.

## Native build evidence and final-attempt boundary

Official Android NDK 27.1.12297006 was downloaded once with resumed ranges and verified against the official size and SHA1. Android platform 36 and CMake 3.22.1 were also verified and installed. The NDK is available at `D:/Android/Sdk/ndk/27.1.12297006`; do not download it again.

An earlier Gradle attempt exhausted its 2 GiB JVM heap. The script now uses 4 GiB heap, 1 GiB metaspace, two workers, and no project parallelism. Bundle source scanning now excludes local tool caches and output folders; Metro exclusions are scoped to the app root so dependency `dist` folders remain available. Dependencies and the lockfile are unchanged by these build fixes.

The current `preview` build is the final authorized attempt. If it fails, retain its error and log, hand off, and stop; do not start another environment-fix sequence. Gradle daemon logs are under `.cache/gradle/daemon/9.3.1/daemon-*.out.log`.

ADB previously recognized the connected `23122PCD1G` phone as `arm64-v8a`. On success, install the standalone preview and perform only the agreed short demo/camera/force-stop/reopen smoke pass. Metro has been stopped.

## Final attempt result — stopped as requested

The final attempt failed after 3m 41s at `:react-native-worklets:configureCMakeRelWithDebInfo[arm64-v8a]`. Gradle reported: `WARNING: A restricted method in java.lang.System has been called`. The deeper cause has not been investigated; no further environment changes or builds were attempted.

Command from `D:/Android/WEAVE/apps/mobile`: `./scripts/build-android.ps1 -Mode preview`.

Log: `.cache/gradle/daemon/9.3.1/daemon-28992.out.log`. Generated report: `android/build/reports/problems/problems-report.html`.

No APK was produced. Installation, demo navigation, camera, and force-stop/reopen on the connected phone were **not run**. Existing source checks remain as recorded above; they are not a native runtime pass. NDK remains installed and verified. Await the user's next decision.
