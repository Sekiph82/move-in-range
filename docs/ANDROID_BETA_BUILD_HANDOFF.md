# Android Beta Build Handoff

Current artifact status: blocked external. Failed EAS build `f19b94bf-f646-499f-86dd-258a50d516b6` used the repository root as a traditional Expo app and tried `expo/AppEntry.js` -> `../../App`. The source fix makes `apps/mobile` the authoritative EAS app root.

Validated locally:

- Mobile app root: `apps/mobile`.
- EAS project: `@sekiphayit/move-in-range`.
- Expo slug: `move-in-range`.
- EAS project ID: `30719dd8-101e-4acd-8d2a-e5880d60b721`.
- Android package identifier: `com.moveinrange.app`.
- `npm.cmd exec expo-doctor` from `apps/mobile`: checks passed.
- `npm.cmd exec expo config --type public` from `apps/mobile`: package `com.moveinrange.app`, scheme `moveinrange`, version `0.1.0`, Expo Router entry from `package.json`.
- `npm.cmd exec expo export --platform android --clear` from `apps/mobile`: Android bundle export succeeded and bundled `apps/mobile/node_modules/expo-router/entry.js`.
- `npm.cmd exec expo export:embed -- --eager --platform android --dev false` from `apps/mobile`: Android embed bundle succeeded and wrote bundle output without `expo/AppEntry.js`.
- `npx.cmd eas-cli build:inspect --platform android --profile preview --stage archive --output ..\..\.local\eas-archive --force` from `apps/mobile`: archive contains `apps/mobile/package.json` with `main=expo-router/entry`, `apps/mobile/app/_layout.tsx`, mobile routes, Metro/Babel configs, root lockfile, and shared workspace packages; archive excludes root `App.tsx`, `.git`, `.local`, `node_modules`, and generated `apps/mobile/android`.
- `npm.cmd exec expo prebuild --platform android --no-install`: generated Gradle project structure, `applicationId 'com.moveinrange.app'`, `versionCode 1`, `versionName "0.1.0"`, deep-link scheme `moveinrange`.
- Manifest permissions observed after permission audit: `INTERNET`, `VIBRATE`; `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, and `SYSTEM_ALERT_WINDOW` are generated only with `tools:node="remove"` from Expo `blockedPermissions`.
- Prebuild warnings to resolve before production: configure Android edge-to-edge for target SDK 36; install/configure `expo-system-ui` if automatic user interface style is required.

Environment and toolchain result:

- `ANDROID_HOME`: not set.
- `ANDROID_SDK_ROOT`: not set.
- `JAVA_HOME`: not set.
- `eas`, `adb`, `emulator`, `java`, `gradle`: not found on PATH.
- `npx eas-cli --version`: `eas-cli/21.0.2 win32-x64 node-v24.14.0`.
- `npx eas-cli whoami`: rerun from `apps/mobile` before retrying cloud build.
- `eas build:list`: run only after authentication is confirmed.

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
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range\apps\mobile
npm.cmd install
npx.cmd eas-cli whoami
npx.cmd eas-cli build --platform android --profile preview --clear-cache
```

Use the existing EAS project and remote keystore. Do not create a second EAS project, regenerate credentials, submit to Google Play, or run a paid build without confirming the account plan and build cost.

Preview API configuration:

- `apps/mobile/eas.json` intentionally does not embed localhost for preview/production.
- Until a real staging API exists, preview uses `https://api.moveinrange.invalid`; APK runtime validation remains blocked because the app cannot reach a real API.

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
