param(
  [ValidateSet('development','preview','release')][string]$Mode = 'development',
  [string]$Architecture = 'arm64-v8a',
  [int]$GradleHeapMb = 4096,
  [string]$AndroidSdk = 'D:/Android/Sdk',
  [string]$JavaHome = ''
)
$ErrorActionPreference = 'Stop'
$mobileRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $mobileRoot
if (-not $JavaHome) {
  $localJdk = Get-ChildItem -LiteralPath (Join-Path $mobileRoot '.cache/toolchains') -Directory -Filter 'jdk-17*' -ErrorAction SilentlyContinue | Select-Object -First 1
  $JavaHome = if ($localJdk) {$localJdk.FullName} elseif ($env:JAVA_HOME) {$env:JAVA_HOME} else {'D:/Android/Studio/jbr'}
}
$env:ANDROID_HOME = $AndroidSdk
$env:JAVA_HOME = $JavaHome
$env:GRADLE_USER_HOME = Join-Path $mobileRoot '.cache/gradle'
$env:EXPO_NO_TELEMETRY = '1'
$env:NODE_ENV = if ($Mode -eq 'development') {'development'} else {'production'}
$env:EXPO_PUBLIC_APP_MODE = 'live'
$env:EXPO_PUBLIC_ENABLE_UI_PREVIEW = 'false'
if (-not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) {throw 'Java was not found. Supply -JavaHome.'}
if (-not (Test-Path -LiteralPath (Join-Path $AndroidSdk 'platform-tools/adb.exe'))) {throw 'Android SDK was not found. Supply -AndroidSdk.'}
if ($Mode -ne 'development') {
  $signingDir = Join-Path $mobileRoot '.cache/signing'
  New-Item -ItemType Directory -Force $signingDir | Out-Null
  $signingProperties = Join-Path $signingDir 'release.properties'
  $keystorePath = Join-Path $signingDir 'weave-local-release.keystore'
  if (-not (Test-Path -LiteralPath $signingProperties)) {
    if (Test-Path -LiteralPath $keystorePath) {throw 'Keystore exists without its properties. Restore the properties; do not overwrite the signing key.'}
    $randomBytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($randomBytes)
    $rng.Dispose()
    $env:WEAVE_STORE_PASSWORD = [Convert]::ToBase64String($randomBytes)
    $env:WEAVE_KEY_PASSWORD = $env:WEAVE_STORE_PASSWORD
    try {
      & (Join-Path $JavaHome 'bin/keytool.exe') -genkeypair -keystore $keystorePath -alias weave-local -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=WEAVE Local Build' -storepass:env WEAVE_STORE_PASSWORD -keypass:env WEAVE_KEY_PASSWORD
      if ($LASTEXITCODE -ne 0) {throw 'Signing key generation failed.'}
      $lines = @(
        ('storeFile=' + $keystorePath.Replace('\','/'))
        ('storePassword=' + $env:WEAVE_STORE_PASSWORD)
        'keyAlias=weave-local'
        ('keyPassword=' + $env:WEAVE_KEY_PASSWORD)
      )
      [IO.File]::WriteAllLines($signingProperties, $lines, (New-Object Text.UTF8Encoding($false)))
    } finally {Remove-Item Env:WEAVE_STORE_PASSWORD,Env:WEAVE_KEY_PASSWORD -ErrorAction SilentlyContinue}
  }
  $env:WEAVE_REQUIRE_RELEASE_SIGNING = '1'
}
& node node_modules/expo/bin/cli prebuild --platform android --no-install --no-clean
if ($LASTEXITCODE -ne 0) {throw 'Expo prebuild failed.'}
# Autolinking's cache does not track an app namespace changed by prebuild.
$autolinkingFile = Join-Path $mobileRoot 'android/build/generated/autolinking/autolinking.json'
if (Test-Path -LiteralPath $autolinkingFile) {
  $appGradle = Get-Content -Raw -LiteralPath (Join-Path $mobileRoot 'android/app/build.gradle')
  $namespace = [regex]::Match($appGradle, 'namespace\s+[\x22\x27]([^\x22\x27]+)').Groups[1].Value
  $cachedPackage = (Get-Content -Raw -LiteralPath $autolinkingFile | ConvertFrom-Json).project.android.packageName
  if ($namespace -and $cachedPackage -ne $namespace) {
    Remove-Item -LiteralPath $autolinkingFile
    Write-Output 'Invalidated autolinking metadata after Android namespace change.'
  }
}
$variant = if ($Mode -eq 'development') {'Debug'} else {'Release'}
Push-Location -LiteralPath (Join-Path $mobileRoot 'android')
try {
  # Keep a one-task result as an array: PowerShell otherwise splats its characters.
  [string[]]$tasks = if ($Mode -eq 'development') { @(':app:assembleDebug') } else { @(':app:createBundleReleaseJsAndAssets', '--rerun', ':app:assembleRelease') }
  # Environment mode is not an input of the React Native bundle task. Always rebundle
  # for standalone builds so a cached demo bundle cannot enter the live APK.
  # Windows PowerShell 5 turns redirected native stderr warnings into error records.
  # Gradle's exit code is authoritative; keep warning output without aborting early.
  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & ./gradlew.bat @tasks ('-PreactNativeArchitectures=' + $Architecture) ('-Dorg.gradle.jvmargs=-Xmx' + $GradleHeapMb + 'm -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8') --max-workers=2 --no-parallel --no-daemon --console=plain
    $gradleExitCode = $LASTEXITCODE
  } finally {$ErrorActionPreference = $previousErrorAction}
  if ($gradleExitCode -ne 0) {throw ('Gradle build failed with exit code ' + $gradleExitCode + '.')}
} finally {Pop-Location}
$apkSource = Join-Path $mobileRoot ('android/app/build/outputs/apk/' + $variant.ToLower() + '/app-' + $variant.ToLower() + '.apk')
$artifactDir = Join-Path $mobileRoot 'artifacts'
New-Item -ItemType Directory -Force $artifactDir | Out-Null
$artifact = Join-Path $artifactDir ('weave-' + $Mode + '-' + $Architecture.Replace(',','-') + '.apk')
Copy-Item -LiteralPath $apkSource -Destination $artifact
if ($Mode -ne 'development') {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead($artifact)
  try {
    $bundle = $archive.GetEntry('assets/index.android.bundle')
    if ($null -eq $bundle) {throw 'Standalone APK is missing its JavaScript bundle.'}
    $stream = $bundle.Open()
    $memory = New-Object IO.MemoryStream
    try {
      $stream.CopyTo($memory)
      $hasFixture = [Text.Encoding]::GetEncoding(28591).GetString($memory.ToArray()).Contains('WEAVE_UI_FIXTURE_ONLY')
      if ($hasFixture) {throw 'Product APK contains test fixture data.'}
    } finally {$stream.Dispose(); $memory.Dispose()}
  } finally {$archive.Dispose()}
}
$buildTools = Get-ChildItem -LiteralPath (Join-Path $AndroidSdk 'build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1
& (Join-Path $buildTools.FullName 'apksigner.bat') verify --verbose $artifact
if ($LASTEXITCODE -ne 0) {throw 'APK signature verification failed.'}
$hash = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash
[IO.File]::WriteAllText($artifact + '.sha256', $hash)
Write-Output ('APK: ' + $artifact)
Write-Output ('SHA256: ' + $hash)
