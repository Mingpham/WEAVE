# Android development on the connected phone

From PowerShell:

```powershell
cd D:\Android\WEAVE\apps\mobile
.\scripts\build-android.ps1 -Mode development
```

The script prefers an installed portable JDK 17 under `.cache/toolchains/jdk-17*`, then `JAVA_HOME`. Override with `-JavaHome 'C:/path/to/jdk-17'`. Expo SDK 57's Android build image uses Java 17. JDK 25 caused Prefab's CMake setup to reject the native-access warning in this environment. NDK 27.1.12297006 is already installed; do not redownload it.

The development APK is `artifacts/weave-development-arm64-v8a.apk`. It requires Metro. A standalone APK instead uses `-Mode release`; a development build does not establish release success.

With the development APK installed, keep USB debugging connected and run:

```powershell
& 'D:/Android/Sdk/platform-tools/adb.exe' -s 9373b815 reverse tcp:8081 tcp:8081
pnpm run start --localhost --port 8081
```

Open WEAVE's development client and select `http://localhost:8081`. Fast Refresh applies JS/TS changes without rebuilding the APK. Rebuild for native dependency/plugin changes. The development menu provides Reload and DevTools; shake the phone or press `m` in the Metro terminal. Press `j` for React Native DevTools when the app is connected.

Logs for the build/device setup performed by Codex are under ignored `.cache/logs/`. To collect JS/native logs while reproducing a problem:

```powershell
& 'D:/Android/Sdk/platform-tools/adb.exe' -s 9373b815 logcat ReactNativeJS:V AndroidRuntime:E '*:S'
```

The app still needs the team presentation/data provider for event/auth business flows. Welcome and local entry UI do not establish those integrations. SCR-17/19/20/26 remain team-owned.

## Fixed build-script failures

- `Cannot locate tasks that match ':'`: PowerShell unwrapped a one-element task list to a string and splatted individual characters. Keep `[string[]]$tasks`.
- Native stderr warnings stopped the script under Windows PowerShell 5. Capture Gradle's exit code while retaining stderr warnings; fail on a nonzero exit code.
- Old `com.weave.mobile.preview.BuildConfig` in generated autolinking: invalidate only autolinking metadata when its cached package differs from the generated app namespace.

- Windows/pnpm native path lengths: the config plugin places CMake staging in `.cache/cxx` and uses portable `.cache/toolchains/ninja/ninja.exe` when present. This machine has official Ninja 1.13.2 (GitHub release checksum verified); the SDK's Ninja 1.10.2 cannot stat codegen paths over 260 characters. SDK files were not replaced.
- A white screen with `ClassNotFoundException: expo.modules.splashscreen.SplashScreenManager` required adding the SDK-matched `expo-splash-screen` native dependency.

## Build evidence - 2026-11-14

Development build succeeded with signature verification. Final APK SHA256: `DAFED6B86BEEABE01C5D6B6CAD980F6B220DC2616C40C5D74742EA7F8AA82500`.

Build log: `.cache/logs/development-final-build.log`. Earlier failure details: `development-build-stale-autolinking.log`, `cmake-diagnosis.log`, and `development-jdk17-build.log` in the same directory. This is an arm64 development APK, not a standalone release acceptance result.

The final development APK was installed on the connected phone. The development launcher opens and displays its server URL/Connect controls. Loading the product UI from Metro and the camera/cold-start smoke flow remain unverified; further device/build work was stopped at the user's request.
