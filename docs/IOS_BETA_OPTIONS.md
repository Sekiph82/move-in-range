# iOS Beta Options

## Free Expo Go

- No Apple Developer membership required.
- Uses the real deployed Vercel API when `EXPO_PUBLIC_API_BASE_URL` is set.
- Requires the Expo development server while testing.
- Not a standalone installed application.
- Suitable for functional beta coverage of JavaScript-compatible screens and API flows.

Run:

```powershell
cd <repo-root>\apps\mobile
$env:EXPO_PUBLIC_API_BASE_URL="https://<MOVEINRANGE_API_VERCEL_URL>"
npx.cmd expo start --tunnel --clear
```

Scan the QR code with iPhone Camera or Expo Go.

Test:

- registration
- login
- onboarding
- readiness
- plan
- workout
- diabetes
- calendar
- privacy
- logout
- relogin
- password reset link handling where supported

Expo Go limitation:

Standalone signing, Apple push notification entitlement behavior, custom native modules outside Expo Go, and App Store/TestFlight distribution are not validated by Expo Go.

## Free Xcode Personal Provisioning

Requirements:

- Mac
- Xcode
- Apple Account
- physical iPhone

Limitations:

- provisioning expires after approximately 7 days
- rebuild and reinstall required
- restricted device and App ID limits
- advanced capabilities may be unavailable

## Paid Apple Developer Route

Required for:

- TestFlight
- EAS internal iOS distribution
- App Store
- long-lived signed builds
- normal tester distribution

Do not trigger paid Apple enrollment from this repository.

## Current iOS Config

- `ios.bundleIdentifier`: `com.moveinrange.app`
- scheme: `moveinrange`
- unused permissions are not requested in `app.json`
- associated domains are not configured because no universal-link domain is active yet

iOS export validation command:

```powershell
cd <repo-root>\apps\mobile
npm.cmd exec -- expo config --type public
npm.cmd exec -- expo export --platform ios --clear
```

Validation recorded on 2026-07-19:

- `npm.cmd exec -- expo config --type public`: PASS; `ios.bundleIdentifier` is `com.moveinrange.app`.
- `npm.cmd exec -- expo export --platform ios --clear`: PASS; bundled `apps/mobile/node_modules/expo-router/entry.js`.

iOS EAS inspection command, do not continue if Apple credentials or paid membership are required:

```powershell
npx.cmd eas-cli build --platform ios --profile preview
```
