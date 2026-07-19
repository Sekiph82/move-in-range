# Android Beta Build Handoff

Current artifact status: blocked external. No APK or AAB was produced because this workstation has no Android SDK, no Java/Gradle toolchain, no `adb`, no `emulator`, and no EAS CLI/authenticated session.

Validated locally:

- `npm --workspace @moveinrange/mobile exec -- expo-doctor`: 18/18 checks passed.
- `npm --workspace @moveinrange/mobile exec -- expo config --type public`: package `com.moveinrange.app`, scheme `moveinrange`, version `0.1.0`.
- `npm --workspace @moveinrange/mobile exec -- expo export --platform android`: Android bundle export succeeded to `dist`.
- `npm --workspace @moveinrange/mobile exec -- expo prebuild --platform android --no-install`: generated Gradle project structure, `applicationId 'com.moveinrange.app'`, `versionCode 1`, `versionName "0.1.0"`, deep-link scheme `moveinrange`.
- Manifest permissions observed: `INTERNET`, `READ_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`, `WRITE_EXTERNAL_STORAGE`.
- Prebuild warnings to resolve before production: configure Android edge-to-edge for target SDK 36; install/configure `expo-system-ui` if automatic user interface style is required.

Environment and toolchain result:

- `ANDROID_HOME`: not set.
- `ANDROID_SDK_ROOT`: not set.
- `JAVA_HOME`: not set.
- `eas`, `adb`, `emulator`, `java`, `gradle`: not found on PATH.
- `eas whoami` and `eas build:list`: blocked because EAS CLI executable is not installed in the workspace.

Install Android Studio and SDK:

1. Install Android Studio.
2. In SDK Manager, install Android SDK Platform 35 or the Expo SDK recommended platform, Android SDK Build-Tools, Android Emulator, and Platform-Tools.
3. Set `ANDROID_HOME` and `ANDROID_SDK_ROOT` to the SDK path.
4. Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to PATH.
5. Verify:
   ```powershell
   adb version
   emulator -list-avds
   java -version
   ```

Create an emulator:

1. Open Android Studio Device Manager.
2. Create a Pixel-class AVD with Google APIs.
3. Start it and verify:
   ```powershell
   adb devices
   ```

Local API address for emulator:

- Android emulator cannot use `localhost` for host services.
- Start the Docker stack with `docker compose up -d --build`.
- Use `http://10.0.2.2:8200` for emulator access to the host API.

Expo development build:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
npm.cmd install
$env:EXPO_PUBLIC_API_BASE_URL='http://10.0.2.2:8200'
npm.cmd --workspace @moveinrange/mobile run android
```

EAS preview build:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
npm.cmd install
npm.cmd install --save-dev eas-cli
eas login
eas build --platform android --profile preview
```

Do not run a paid build without confirming the account plan and build cost.

APK installation:

```powershell
adb install -r path\to\MoveInRange-preview.apk
adb shell am start -a android.intent.action.VIEW -d "moveinrange://auth/reset-password?token=test"
```

Log collection:

```powershell
adb logcat | Select-String -Pattern "MoveInRange|ReactNativeJS|AndroidRuntime"
```

Manual acceptance checklist:

- install
- launch
- registration
- login
- onboarding all 22 steps
- keyboard behavior
- date inputs
- back navigation
- SecureStore restore
- logout
- password reset deep link
- readiness
- daily, weekly, monthly plan
- workout timer
- pause, resume, rest, skip, substitute
- pain and symptom stop
- background and foreground
- process termination and workout restore
- offline queue and reconnect
- notification permission and local notification
- dynamic text
- TalkBack
- portrait rotation behavior
- low-memory restart
