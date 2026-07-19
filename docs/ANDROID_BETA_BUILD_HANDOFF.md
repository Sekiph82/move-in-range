# Android Beta Build Handoff

Current artifact status: root-cause validation APK available; fully working phone beta APK pending Vercel API URL. Failed EAS build `f19b94bf-f646-499f-86dd-258a50d516b6` used the repository root as a traditional Expo app and tried `expo/AppEntry.js` -> `../../App`; the successful retry below confirms `apps/mobile` is now the authoritative EAS app root.

Successful preview artifact:

- EAS build ID: `ffa5f78e-d11b-4a42-8bf5-58e6d14e0b2f`.
- Build page: `https://expo.dev/accounts/sekiphayit/projects/move-in-range/builds/ffa5f78e-d11b-4a42-8bf5-58e6d14e0b2f`.
- APK URL: `https://expo.dev/artifacts/eas/wzoDpl-wBfzaOCmCl2cTJcUUfQZN1W83bf3UjQKDlYQ.apk`.
- Local downloaded artifact: `.local/eas-artifacts/MoveInRange-preview-ffa5f78e.apk`.
- APK size: `83013799` bytes.
- APK SHA-256: `32B03B42E89A09255699AA32F9CC938230703AEBD92376FFE5559CBBC296D34E`.
- Build profile: `preview`; distribution: `INTERNAL`; artifact type: APK.
- EAS account/project: `sekiphayit` / `move-in-range`; project ID `30719dd8-101e-4acd-8d2a-e5880d60b721`.
- Git commit: `9c1af90aac880f672280eca72faaa49b98f075f2` (`fix(eas): align mobile slug with project`).
- SDK/app version/build: Expo SDK `53.0.0`; app version `0.1.0`; Android build version `1`.
- Created/completed: `2026-07-19T14:41:14.123Z` / `2026-07-19T14:53:34.292Z`; expires `2026-08-02T14:41:14.157Z`.
- Build retry used remote Android credentials; because no local `keytool` was installed, EAS generated a cloud keystore during the non-interactive preview build.
- Runtime note: this APK was produced before the zero-cost Vercel API URL existed. It validates EAS app-root and APK generation, but a new fully working phone beta APK must be built after `EXPO_PUBLIC_API_BASE_URL` is set in the EAS preview environment.

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
- `npx eas-cli whoami` from `apps/mobile`: `sekiphayit`.
- `eas build:list --platform android --limit 1 --json`: latest Android build is `FINISHED`.

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

Use the existing EAS project. The successful preview retry used EAS remote Android credentials and EAS generated a cloud keystore because no local `keytool` was installed; audit and preserve the selected Android credentials before any production/store distribution. Do not create a second EAS project, submit to Google Play, or run a paid build without confirming the account plan and build cost.

Preview API configuration:

- `apps/mobile/eas.json` intentionally does not embed localhost or placeholder API URLs for preview/production.
- Set `EXPO_PUBLIC_API_BASE_URL` through EAS environment variables after the Vercel API is deployed.
- APK runtime validation remains blocked until the app is rebuilt against a real public API and installed on a device.

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
