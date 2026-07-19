# Product Acceptance Checklist

Legend: `[ ] NOT STARTED`, `[~] IN PROGRESS`, `[x] COMPLETE`, `[!] BLOCKED`, `[-] NOT APPLICABLE`

- [x] COMPLETE Mobile product workflow decomposition
  - feature: product workflow routing
  - route: `/auth`, `/onboarding`, `/readiness`, `/daily-plan`, `/weekly-plan`, `/monthly-plan`, `/calendar`, `/exercises`, `/exercise/:id`, `/workout/:sessionId`, `/diabetes`, `/integrations`, `/notifications`, `/privacy`, `/caregivers`, `/professionals`, `/achievements`, `/settings`
  - component: `ProductWorkflowScreen`, feature screens under `apps/mobile/src/features`
  - API endpoint: route-specific endpoints in `apps/mobile/src/api.ts`
  - persistence: API-backed profile, onboarding, readiness, plans, sessions, diabetes, notifications, privacy, sharing
  - validation: `validateOnboardingStepPayload`, route-specific control disabling, backend validation
  - unit-test evidence: `product workflow is decomposed into feature-specific screens`
  - integration-test evidence: `python -m pytest services/api/tests`
  - E2E evidence: `Playwright live browser smoke can visit configured admin routes`
  - manual validation: Docker stack health, API ready, admin login HTTP 200
  - blocker: None

- [x] COMPLETE Real 22-step onboarding controls
  - feature: onboarding
  - route: `/onboarding`
  - component: `OnboardingScreen`, `model.ts`
  - API endpoint: `PUT /api/v1/onboarding`, `GET /api/v1/onboarding`
  - persistence: resumable onboarding draft and completion flag
  - validation: preferred name, ISO date of birth, self-described gender, pregnancy trimester, height/weight, locale, sensitivity side, goals, targets, schedule minutes
  - unit-test evidence: `real onboarding metadata covers required acceptance steps and validation`
  - integration-test evidence: `test_complete_product_platform.py`
  - E2E evidence: `Playwright live browser smoke can visit configured admin routes`
  - manual validation: TypeScript typecheck
  - blocker: None

- [x] COMPLETE Planning and plan modification UI
  - feature: plans
  - route: `/quick-session`, `/daily-plan`, `/weekly-plan`, `/monthly-plan`
  - component: `PlanScreens.tsx`
  - API endpoint: `POST /plans/daily/generate`, `GET /plans/daily/today`, `POST /plans/{plan_id}/modify`, `POST /quick-session`, `POST /plans/weekly/generate`, `POST /plans/monthly/generate`
  - persistence: saved plan records and plan modification records
  - validation: numeric duration, selected modification options, backend unsafe request interpretation
  - unit-test evidence: `safety precedence blocks chest discomfort`, `daily plan durations match requested total`
  - integration-test evidence: `test_release_candidate_api_e2e.py`
  - E2E evidence: Docker browser smoke baseline
  - manual validation: Docker test profile
  - blocker: None

- [x] COMPLETE Guided workout and feedback controls
  - feature: workout
  - route: `/workout/:sessionId`, `/workout/:sessionId/pain`, `/workout/:sessionId/symptom`, `/workout/:sessionId/feedback`
  - component: `WorkoutScreens.tsx`, `workoutPlayer.ts`
  - API endpoint: `POST /sessions`, `POST /sessions/{session_id}/pain`, `POST /sessions/{session_id}/symptoms`, `POST /sessions/{session_id}/complete`
  - persistence: sessions and session events
  - validation: blocked readiness disables start, symptom flow uses idempotency key, duplicate completion is prevented in state tests
  - unit-test evidence: `pain flow pauses and offers substitution or stop`, `workout snapshot restores active state without duplicate completion`
  - integration-test evidence: `test_mvp_hardening.py`
  - E2E evidence: Docker browser smoke baseline
  - manual validation: TypeScript typecheck
  - blocker: None

- [x] COMPLETE Diabetes context UX
  - feature: diabetes
  - route: `/diabetes`
  - component: `DiabetesScreen.tsx`
  - API endpoint: `POST /glucose`, `POST /diabetes/context`, `GET /diabetes/insights`
  - persistence: glucose and diabetes context entries
  - validation: timing selector, unit selector, numeric value, no insulin or treatment calculation
  - unit-test evidence: `diabetes conversion and insight sample size`
  - integration-test evidence: `test_complete_product_platform.py`
  - E2E evidence: Docker browser smoke baseline
  - manual validation: TypeScript typecheck
  - blocker: None

- [x] COMPLETE Honest integrations, notifications, privacy, and sharing UX
  - feature: integrations, notifications, privacy, caregivers, professionals
  - route: `/integrations`, `/notifications`, `/privacy`, `/caregivers`, `/professionals`
  - component: `IntegrationsScreen`, `NotificationsScreen`, `PrivacyScreen`, `SharingScreens`
  - API endpoint: `GET /integrations/providers`, `POST /integrations/connect`, `GET/PUT /notification-preferences`, `POST /privacy/export-jobs`, `POST /privacy/deletion-jobs`, `POST /caregivers/invite`, `POST /professionals/invite`
  - persistence: provider connections, notification preferences, export/deletion jobs, relationship records
  - validation: sandbox label, disabled blocked providers, scoped invites, destructive privacy confirmation payload
  - unit-test evidence: `provider state reports activation blockers honestly`
  - integration-test evidence: `test_complete_product_platform.py`
  - E2E evidence: Docker browser smoke baseline
  - manual validation: TypeScript typecheck
  - blocker: None

- [!] BLOCKED Native mobile device acceptance
  - feature: device validation
  - route: Expo native runtime
  - component: mobile app
  - API endpoint: API stack available through Docker
  - persistence: SecureStore and native notification permission state require a physical device or emulator
  - validation: unit-tested storage fallbacks and notification preference persistence
  - unit-test evidence: `token store restores valid access tokens and rejects expired or invalid stored values`
  - integration-test evidence: Docker API integration tests
  - E2E evidence: web-compatible browser smoke only
  - manual validation: Not executed on a physical device in this pass
  - blocker: Physical mobile device or emulator session is required

- [!] BLOCKED External production provider activation
  - feature: external integrations
  - route: `/integrations`
  - component: `IntegrationsScreen`
  - API endpoint: `GET /integrations/providers`, `POST /integrations/connect`
  - persistence: sandbox provider records can persist; production credentials are not present
  - validation: blocked providers cannot show a fake successful connect action
  - unit-test evidence: `provider state reports activation blockers honestly`
  - integration-test evidence: `test_complete_product_platform.py`
  - E2E evidence: Docker browser smoke baseline
  - manual validation: Provider cards display Sandbox or blocker status
  - blocker: Real vendor developer credentials and consented accounts are required
