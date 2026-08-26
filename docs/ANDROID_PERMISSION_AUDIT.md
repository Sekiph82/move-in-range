# Android Permission Audit

Date: 2026-07-19

Scope:

- Expo config: `apps/mobile/app.json`
- Generated Android manifest from temporary prebuild: `apps/mobile/android/app/src/main/AndroidManifest.xml`
- EAS CLI availability and authentication only. No paid or cloud build was triggered.

Configured permissions:

- Allowed: `INTERNET`, `VIBRATE`
- Blocked through Expo config: `android.permission.READ_EXTERNAL_STORAGE`, `android.permission.WRITE_EXTERNAL_STORAGE`, `android.permission.SYSTEM_ALERT_WINDOW`

Temporary prebuild command:

```powershell
npm.cmd --workspace @moveinrange/mobile exec -- expo prebuild --platform android --no-install --clean
```

Manifest result:

- `android.permission.INTERNET`: present
- `android.permission.VIBRATE`: present
- `android.permission.READ_EXTERNAL_STORAGE`: generated with `tools:node="remove"`
- `android.permission.WRITE_EXTERNAL_STORAGE`: generated with `tools:node="remove"`
- `android.permission.SYSTEM_ALERT_WINDOW`: generated with `tools:node="remove"`

EAS CLI check:

```powershell
npx.cmd eas-cli --version
npx.cmd eas-cli whoami
```

Result:

- `eas-cli/21.0.2 win32-x64 node-v24.14.0`
- `whoami`: blocked with `Not logged in`
- No EAS build command was run.

Release classification:

- Permission audit: PASS for current Expo config and generated manifest.
- Installable APK/AAB: BLOCKED EXTERNAL until EAS authentication or local Android build tooling is available.
- Native runtime/device validation: BLOCKED EXTERNAL until an Android emulator or physical device is available.
