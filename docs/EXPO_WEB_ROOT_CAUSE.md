# Expo Web Root Cause

Date: 2026-07-19

## Root Cause

Expo Router web export failed around `expo-router/_ctx.web.js`, `EXPO_ROUTER_APP_ROOT`, and `require.context` because the monorepo resolved `expo-router` from the mobile workspace while `babel-preset-expo` was resolved from the repository root. In that layout the Expo Router Babel plugin was not consistently applied, so the app root was not inlined during static export.

## Fix

- Added `apps/mobile/babel.config.cjs` with `babel-preset-expo` and the Expo Router Babel plugin.
- Added `apps/mobile/metro.config.cjs` so Metro watches the monorepo root and resolves workspace dependencies deterministically.
- Kept the real Expo Router app and real mobile feature components; no duplicate web app was introduced.
- Added a static product web server for exported assets and SPA fallback.

## Web Fallbacks

- SecureStore remains the native token store.
- Web uses a guarded `localStorage` fallback when SecureStore is unavailable, with in-memory fallback retained for restricted browser contexts.
- Product web is served from `apps/mobile/.expo-web-export` on port `3210` in Docker.

## Evidence

- `npm.cmd run mobile:web:build`: PASS
- `npx expo-doctor`: PASS, 18/18 checks
- `npx expo config --type public`: PASS, SDK 53, package `com.moveinrange.app`, bundle `com.moveinrange.app`
- `npx expo export --platform android`: PASS, static Android bundle generated in `apps/mobile/dist`
- `npx expo prebuild --platform android --no-install`: PASS, native project generation validated; generated native tree was not committed

