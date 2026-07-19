# EAS Android Bundle Root Cause

Date: 2026-07-19

## Failed Build

- EAS account: `sekiphayit`
- EAS project: `@sekiphayit/move-in-range`
- Expo slug: `move-in-range`
- EAS project ID: `30719dd8-101e-4acd-8d2a-e5880d60b721`
- Failed build ID: `f19b94bf-f646-499f-86dd-258a50d516b6`
- Failed commit: `92c5410724ebf7a3902b95613635b3f06ed5b7db`

## Successful Retry

- EAS build ID: `ffa5f78e-d11b-4a42-8bf5-58e6d14e0b2f`
- Build page: `https://expo.dev/accounts/sekiphayit/projects/move-in-range/builds/ffa5f78e-d11b-4a42-8bf5-58e6d14e0b2f`
- APK URL: `https://expo.dev/artifacts/eas/wzoDpl-wBfzaOCmCl2cTJcUUfQZN1W83bf3UjQKDlYQ.apk`
- Commit: `9c1af90aac880f672280eca72faaa49b98f075f2`
- Profile/distribution: `preview` / `INTERNAL`
- SDK/app/build: Expo SDK `53.0.0`, app version `0.1.0`, Android build version `1`
- APK size: `83013799` bytes
- APK SHA-256: `32B03B42E89A09255699AA32F9CC938230703AEBD92376FFE5559CBBC296D34E`
- Completed at: `2026-07-19T14:53:34.292Z`

## Symptom

EAS failed during Android JavaScript bundling:

```text
Android Bundling failed node_modules/expo/AppEntry.js
Error: Unable to resolve module ../../App from /home/expo/workingdir/build/node_modules/expo/AppEntry.js
```

That means EAS treated the repository root as a traditional Expo app using `expo/AppEntry.js`, then looked for a root `App.tsx` or `App.js`.

## Root Cause

The real Expo app is the npm workspace at `apps/mobile`, where `package.json` correctly declares:

```json
{
  "main": "expo-router/entry"
}
```

The repository root is not an Expo app. A root-level EAS config plus a root-level Expo `app.json` made the cloud build target ambiguous and linked the EAS project from the wrong directory. Because the root package has no `main: "expo-router/entry"` and no router `app/` directory, Expo fell back to `node_modules/expo/AppEntry.js` and attempted `../../App`.

## Fix

- Removed the root Expo config target.
- Moved the authoritative EAS config to `apps/mobile/eas.json`.
- Linked `apps/mobile/app.json` to the existing EAS project ID.
- Aligned `apps/mobile/app.json` slug with the linked EAS project slug, `move-in-range`.
- Added `.easignore` so local `.git`, `.local`, generated native output, node modules, and test/build caches are not uploaded.
- Kept the Expo Router entry in `apps/mobile/package.json`.
- Did not add a fake root `App.tsx`.
- Did not patch `node_modules/expo/AppEntry.js`.
- Did not create a second EAS project.

## Canonical Android Identifier

The canonical Android package remains:

```text
com.moveinrange.app
```

The temporary root config had `com.sekiphayit.moveinrange`, but no successful artifact or store release exists from that identifier. The repository, tests, prebuild docs, and prior config consistently use `com.moveinrange.app`.

## EAS App Root

Run EAS commands from:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range\apps\mobile
```

The mobile app root contains:

- `app.json`
- `package.json`
- `eas.json`
- `babel.config.cjs`
- `metro.config.cjs`
- `app/_layout.tsx`
- route files under `app/`

## Archive Inspection

`npx eas-cli build:inspect --platform android --profile preview --stage archive --output ..\..\.local\eas-archive --force` was run from `apps/mobile`.

The archive contains:

- root `package-lock.json`
- root npm workspace metadata
- `apps/mobile/package.json` with `main: "expo-router/entry"`
- `apps/mobile/app.json`
- `apps/mobile/eas.json`
- `apps/mobile/app/_layout.tsx`
- mobile route files
- `apps/mobile/babel.config.cjs`
- `apps/mobile/metro.config.cjs`
- shared workspace packages under `packages/`

The archive does not contain a root `App.tsx`, `.git`, `.local`, `node_modules`, or generated `apps/mobile/android`.

## Runtime API Note

Preview and production EAS profiles intentionally avoid localhost and committed placeholder API URLs. Set `EXPO_PUBLIC_API_BASE_URL` in the EAS preview environment after the Vercel API is deployed, then rebuild the fully working phone beta APK.
