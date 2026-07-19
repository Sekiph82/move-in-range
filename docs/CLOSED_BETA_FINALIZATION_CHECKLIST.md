# Closed Beta Finalization Checklist

Date: 2026-07-19

- [x] COMPLETE Expo Router web export
  - route: all Expo Router product routes
  - component: `ProductWorkflowScreen`, tabs, auth, onboarding, product feature screens
  - user action: static export and browser navigation
  - API endpoint: `EXPO_PUBLIC_API_BASE_URL`
  - persistence: web token fallback to localStorage when SecureStore is unavailable
  - authorization: SessionGuard protects product routes
  - validation: `npm.cmd run mobile:web:build`
  - browser E2E: `tests/product-ui-e2e.test.mjs`
  - Docker evidence: `product-web` service healthy on `3210`
  - installable-build evidence: Android static export and prebuild validated, no APK produced
  - manual evidence: `docs/EXPO_WEB_ROOT_CAUSE.md`
  - blocker: none for web export

- [x] COMPLETE product browser E2E
  - route: `/auth/*`, `/onboarding`, `/readiness`, `/daily-plan`, `/workout/*`, `/diabetes`, `/calendar`, `/privacy`, `/settings`
  - component: real mobile feature components
  - user action: registration, 22 onboarding steps, readiness, plan generation, workout controls, feedback, diabetes, export, deletion, logout/login
  - API endpoint: auth, onboarding, readiness, plans, sessions, exercise feedback, diabetes, privacy
  - persistence: PostgreSQL via API, Redis token revocation, localStorage web session fallback
  - authorization: protected route denial verified
  - validation: Node test assertions and screenshots
  - browser E2E: Docker Playwright 2/2 product UI tests passed
  - Docker evidence: full Docker test service passed, Node 39/39, skips 0
  - installable-build evidence: Android static export passed
  - manual evidence: `docs/CLOSED_BETA_FINAL_VISUAL_REVIEW.md`
  - blocker: native device validation remains unavailable

- [x] COMPLETE typed admin operations
  - route: `/api/admin-session/mutate`
  - component: admin dashboard, users, exercises, policies, privacy jobs, notifications, integrations
  - user action: typed operation forms only
  - API endpoint: allowlisted `/api/v1/admin/*` backend operations
  - persistence: PostgreSQL-backed admin mutations and audit logs
  - authorization: CSRF and required admin role enforced
  - validation: unknown fields, unknown operations, and path injection rejected
  - browser E2E: admin Playwright acceptance passed
  - Docker evidence: full Docker test service passed
  - installable-build evidence: not applicable to admin web
  - manual evidence: `docs/CLOSED_BETA_FINAL_SECURITY_REVIEW.md`
  - blocker: none

- [x] COMPLETE password reset email delivery
  - route: `/auth/forgot-password`, `/auth/reset-password`
  - component: product auth reset screens and API email adapter
  - user action: request email, open reset URL, update password
  - API endpoint: `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password`
  - persistence: `password_reset_tokens`, `email_delivery_attempts`, refresh revocation
  - authorization: reset token hash, expiry, single-use, session invalidation
  - validation: no account enumeration, no token in routine logs
  - browser E2E: Mailpit reset E2E passed
  - Docker evidence: Mailpit healthy on `1025` and `8025`
  - installable-build evidence: not applicable
  - manual evidence: `docs/CLOSED_BETA_FINAL_SECURITY_REVIEW.md`
  - blocker: none

- [x] COMPLETE privacy export and deletion lifecycle evidence
  - route: `/privacy`
  - component: `PrivacyScreen`, API privacy routes
  - user action: request export, download archive, request selected deletion
  - API endpoint: `/api/v1/privacy/export-jobs`, `/api/v1/privacy/export-jobs/{id}/download`, `/api/v1/privacy/deletion-jobs`
  - persistence: export/deletion jobs, manifests, checksum, audit metadata
  - authorization: owner-bound export token and authenticated deletion request
  - validation: API and product UI E2E assertions
  - browser E2E: privacy export screenshot captured
  - Docker evidence: full Docker test service passed
  - installable-build evidence: not applicable
  - manual evidence: `docs/CLOSED_BETA_FINAL_SECURITY_REVIEW.md`
  - blocker: none

- [x] COMPLETE Docker acceptance
  - route: all local services
  - component: Compose stack
  - user action: `docker compose up -d --build`, `docker compose --profile test run --rm tests`
  - API endpoint: `/api/v1/ready`, product `/healthz`, admin `/login`
  - persistence: PostgreSQL volumes, Redis cache/revocation, Mailpit SMTP capture
  - authorization: app/test services wait for healthy dependencies
  - validation: config, build, up, ps, healthchecks, full test service
  - browser E2E: admin and product Playwright passed in Docker
  - Docker evidence: postgres, redis, mailpit, api, admin, product-web healthy
  - installable-build evidence: not applicable
  - manual evidence: final command logs
  - blocker: none

- [!] BLOCKED installable Android APK artifact
  - route: native Android runtime
  - component: Expo Android project generation and EAS profiles
  - user action: `npx expo-doctor`, `npx expo config --type public`, `npx expo export --platform android`, `npx expo prebuild --platform android --no-install`
  - API endpoint: environment-driven `EXPO_PUBLIC_API_BASE_URL`
  - persistence: not runtime-tested
  - authorization: no native auth runtime claim
  - validation: Expo doctor 18/18, config export, static Android export, prebuild
  - browser E2E: not applicable
  - Docker evidence: product web and API tests cover shared logic
  - installable-build evidence: no APK; Android SDK/emulator/device unavailable and no paid EAS cloud build was triggered
  - manual evidence: generated native project was validated and left uncommitted
  - blocker: Android SDK/emulator/physical device or authorized EAS cloud build required

