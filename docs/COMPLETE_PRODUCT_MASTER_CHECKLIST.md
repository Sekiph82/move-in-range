# MoveInRange Complete Product Master Checklist

Status legend:

```text
[ ] NOT STARTED
[~] IN PROGRESS
[x] COMPLETE
[!] BLOCKED
[-] NOT APPLICABLE
```

This checklist is closed for the complete-product platform branch. Items marked `[x]` have implementation and automated evidence. Items marked `[!]` have real interfaces, mocks, tests, docs, and an explicit external blocker.

## 01 Onboarding

- [x] COMPLETE CP-01-01: Multi-step resumable onboarding wizard with progress, validation, English/Turkish support, loading/error-ready API, and mobile entry surface.
  - Implementation files: `services/api/app/routes.py`, `services/api/app/db/models.py`, `apps/mobile/src/onboarding/onboardingState.ts`, `apps/mobile/app/(tabs)/profile.tsx`
  - Tests: `services/api/tests/test_complete_product_platform.py`, `tests/mobile.test.mjs`
  - Verification evidence: `python -m pytest services/api/tests/test_complete_product_platform.py`; `npm.cmd run test`; `npm.cmd run typecheck`
  - Blockers: None
  - Follow-up notes: UX can be split into more dedicated mobile screens later without changing storage/API contracts.
- [x] COMPLETE CP-01-02: Onboarding draft storage and API persistence.
  - Implementation files: `onboarding_progress` model, `20260719_0005_complete_product_platform.py`, `/api/v1/onboarding`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: clean SQLite migration passed with `npm.cmd run db:migrate` using a fresh DB URL.
  - Blockers: None
  - Follow-up notes: Account isolation covered by authenticated user-owned rows.

## 02 Identity and gender

- [x] COMPLETE CP-02-01: Identity, date of birth, gender, height/weight/unit/country/timezone/language payload support with non-gendered planning boundary.
  - Implementation files: `ProfilePayload`, `/profile/advanced`, `apps/mobile/src/onboarding/onboardingState.ts`, `docs/ONBOARDING_MODEL.md`
  - Tests: `test_complete_product_platform_user_workflow`, `tests/mobile.test.mjs`
  - Verification evidence: Python and Node tests passed.
  - Blockers: None
  - Follow-up notes: Gender is stored as voluntary context and not used as a workout shortcut.
- [x] COMPLETE CP-02-02: Versioned consent records.
  - Implementation files: `ConsentRecord`, `/api/v1/consents`, `docs/PRIVACY_AND_DATA_RIGHTS.md`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: user B cannot read user A consent history.
  - Blockers: None
  - Follow-up notes: Legal review remains separate from software implementation.

## 03 Physiological contexts

- [x] COMPLETE CP-03-01: Voluntary pregnancy, postpartum, menopause, osteoporosis risk, and pelvic-floor context storage.
  - Implementation files: `/profile/advanced`, `Profile.health_payload`, `docs/ONBOARDING_MODEL.md`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: advanced profile payload is authenticated and user-owned.
  - Blockers: None
  - Follow-up notes: Contexts are not inferred from gender.
- [x] COMPLETE CP-03-02: Deterministic physiological safety policies.
  - Implementation files: `services/api/app/services/platform.py`, `/api/v1/safety/evaluate`
  - Tests: `services/api/tests/test_complete_product_platform.py`
  - Verification evidence: contextual safety is exercised by baseline, plan, quick-session, and simulator paths.
  - Blockers: None
  - Follow-up notes: Clinical policy review is still required before medicalized claims.

## 04 Health profile

- [x] COMPLETE CP-04-01: Expanded structured health profile storage.
  - Implementation files: `/profile/advanced`, `Profile.health_payload`, `docs/ONBOARDING_MODEL.md`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: condition, restriction, and capacity payloads persist through authenticated API calls.
  - Blockers: None
  - Follow-up notes: No diagnosis is performed.
- [x] COMPLETE CP-04-02: Cross-user-safe profile APIs.
  - Implementation files: `require_user`, user-owned query filters, `/profile`, `/profile/advanced`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: privacy/export/consent isolation checks pass.
  - Blockers: None
  - Follow-up notes: Continue adding isolation assertions as new views are added.

## 05 Goals and target muscles

- [x] COMPLETE CP-05-01: General goals and target-focus selection.
  - Implementation files: `GoalPreference`, `/goals-targets`, `GENERAL_GOALS`, `TARGET_FOCUSES`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: invalid goals/focuses are rejected and valid focus data persists.
  - Blockers: None
  - Follow-up notes: Safety remains authoritative.
- [x] COMPLETE CP-05-02: Structured natural request mapping.
  - Implementation files: `interpret_natural_request`, `/goals-targets`, `/plans/advanced/generate`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: "20 minute back and core session, no floor" maps to structured fields.
  - Blockers: None
  - Follow-up notes: Natural language is deterministic intent mapping only.

## 06 Activity and capacity

- [x] COMPLETE CP-06-01: Activity, mobility, balance, transfer, tolerance, aids, and position fields.
  - Implementation files: `CapacityProfile`, `/capacity-profile`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: low balance and no-floor flags are derived from stored inputs.
  - Blockers: None
  - Follow-up notes: The user is not reduced to beginner/intermediate/advanced.
- [x] COMPLETE CP-06-02: Versioned derived capacity profile.
  - Implementation files: `derive_capacity_profile`, `capacity_profiles`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: capacity version and expiry are returned.
  - Blockers: None
  - Follow-up notes: Planner uses conservative flags.

## 07 Baseline assessments

- [x] COMPLETE CP-07-01: Optional guided baseline assessment API with stop/safety blocking.
  - Implementation files: `BaselineAssessment`, `/baseline-assessments`, `evaluate_contextual_safety`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: cardiac rehabilitation context blocks unsafe completed assessment.
  - Blockers: None
  - Follow-up notes: Dedicated instructional mobile pages can reuse this contract.
- [x] COMPLETE CP-07-02: Timestamped assessment results with confidence, symptoms, expiry, and safety decision.
  - Implementation files: `baseline_assessments`, `_assessment_payload`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: assessment records include confidence and expiry.
  - Blockers: None
  - Follow-up notes: No normative claims are made.

## 08 Planning engine

- [x] COMPLETE CP-08-01: Advanced deterministic planning engine.
  - Implementation files: `build_program_payload`, `/plans/advanced/generate`, `Plan`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: generated plans include selected/excluded exercises and safety decisions.
  - Blockers: None
  - Follow-up notes: LLM bypass is not implemented.
- [x] COMPLETE CP-08-02: Stored generator/policy/rules/exclusion/selection evidence.
  - Implementation files: `PlanDecisionEvidence`, `20260719_0005_complete_product_platform.py`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: endpoint returns `evidence_id`.
  - Blockers: None
  - Follow-up notes: Evidence model is auditable.

## 09 Program variants

- [x] COMPLETE CP-09-01: Requested program variant families with deterministic rules.
  - Implementation files: `PROGRAM_VARIANTS`, `choose_variant`, `build_program_payload`
  - Tests: `test_platform_service_contracts_are_deterministic`
  - Verification evidence: variant registry contains more than 20 deterministic variants.
  - Blockers: None
  - Follow-up notes: Exercise selection depth can improve as exercise metadata expands.

## 10 Plan modification

- [x] COMPLETE CP-10-01: Structured plan modification controls.
  - Implementation files: `apply_plan_modification`, `/plans/{plan_id}/modify`, `PlanModification`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: make-easier works and cross-user modification returns 404.
  - Blockers: None
  - Follow-up notes: Safety prevents unsafe harder changes.
- [x] COMPLETE CP-10-02: Optional natural-language intent parser backed by structured controls.
  - Implementation files: `interpret_natural_request`, `apply_plan_modification`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: natural request is mapped to structured targets.
  - Blockers: None
  - Follow-up notes: Parser is deterministic, not generative.

## 11 Workout player

- [x] COMPLETE CP-11-01: Deterministic workout state machine with restart recovery and feedback hooks.
  - Implementation files: `apps/mobile/src/workout/workoutPlayer.ts`, session/pain/symptom/completion APIs
  - Tests: `tests/mobile.test.mjs`, `test_release_candidate_api_e2e.py`, `test_complete_product_platform.py`
  - Verification evidence: pause/resume, stopped sessions, duplicate completion, and feedback tests pass.
  - Blockers: None
  - Follow-up notes: Native haptics/wake-lock runtime should be manually tested on devices.
- [!] BLOCKED CP-11-02: Background, foreground, termination, and device runtime validation.
  - Implementation files: `workoutPlayer.ts`, `MANUAL_DEVICE_TEST_CHECKLIST.md`
  - Tests: `tests/mobile.test.mjs`
  - Verification evidence: unit tests pass; device validation is not claimed.
  - Blockers: Android/iOS device tooling and physical device validation unavailable.
  - Follow-up notes: Run manual device checklist when tooling exists.

## 12 Media and silhouette

- [!] BLOCKED CP-12-01: Licensed media precedence and cache policy.
  - Implementation files: `resolve_media`, `resolveWorkoutMedia`, `/exercises/{id}/media-resolution`, `MEDIA_SYSTEM.md`
  - Tests: `test_complete_product_platform.py`, `tests/mobile.test.mjs`
  - Verification evidence: fallback resolver tests pass.
  - Blockers: Authorized third-party exercise media licenses are unavailable.
  - Follow-up notes: No unauthorized media was committed.
- [!] BLOCKED CP-12-02: Scalable silhouette asset generation and approval workflow.
  - Implementation files: `MediaApproval`, `/media-approvals`, `MEDIA_SYSTEM.md`
  - Tests: API/model migration coverage through pytest and migration checks.
  - Verification evidence: admin approval model and fallback URI schema exist.
  - Blockers: Actual generated/native asset production was not available.
  - Follow-up notes: Internal renderer can consume `silhouette://` URIs.

## 13 Voice guidance

- [!] BLOCKED CP-13-01: Turkish/English voice guidance with adapters and scheduler.
  - Implementation files: `schedule_voice_cues`, `scheduleLocalVoiceCues`, `/voice/cues`, `VOICE_GUIDANCE.md`
  - Tests: `test_platform_service_contracts_are_deterministic`, `tests/mobile.test.mjs`
  - Verification evidence: API and mobile cue scheduler tests pass.
  - Blockers: Native background audio and silent-mode behavior require device validation.
  - Follow-up notes: Mock TTS/prerecorded adapter metadata is implemented.

## 14 Dynamic safety

- [x] COMPLETE CP-14-01: Safety checks across onboarding, assessments, planning, modification, session, pain/symptoms, progression, and special contexts.
  - Implementation files: `evaluate_contextual_safety`, `SafetyDecision`, API endpoints
  - Tests: `test_complete_product_platform.py`, `test_safety.py`, `test_mvp_hardening.py`
  - Verification evidence: Python safety and complete-product tests pass.
  - Blockers: None
  - Follow-up notes: Clinical review is required before publishing policy claims.
- [x] COMPLETE CP-14-02: Admin simulator support.
  - Implementation files: `/admin/policy-simulator`, `ProgramSimulation`
  - Tests: `test_admin_complete_platform_surfaces`
  - Verification evidence: simulator returns stored simulation id.
  - Blockers: None
  - Follow-up notes: Simulator uses authenticated admin role checks.

## 15 Diabetes

- [x] COMPLETE CP-15-01: Expanded diabetes context records and delayed checks.
  - Implementation files: `DiabetesContextEntry`, `/diabetes/context`, `NotificationJob`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: mmol/L conversion and delayed notification job path pass.
  - Blockers: None
  - Follow-up notes: No treatment recommendations.
- [x] COMPLETE CP-15-02: Insight engine with disclaimers.
  - Implementation files: `diabetes_insights`, `/diabetes/insights`
  - Tests: `test_complete_product_platform_user_workflow`, existing diabetes tests
  - Verification evidence: insights endpoint returns no-insulin disclaimer.
  - Blockers: None
  - Follow-up notes: Confidence remains limited until more samples exist.

## 16 CGM

- [!] BLOCKED CP-16-01: CGM and health-data provider architecture.
  - Implementation files: `ProviderConnection`, `ProviderSyncRecord`, `PROVIDER_REGISTRY`, `/integrations/*`, `INTEGRATIONS.md`
  - Tests: `test_complete_product_platform_user_workflow`, `tests/mobile.test.mjs`
  - Verification evidence: Nightscout mock sync passes; Dexcom reports `blocked_credentials`.
  - Blockers: Dexcom, Libre, Tidepool, Apple Health, and Android Health Connect credentials/entitlements unavailable.
  - Follow-up notes: Official APIs/SDKs only; no scraping.

## 17 Wearables

- [!] BLOCKED CP-17-01: Wearable adapter architecture.
  - Implementation files: `WearableSample`, `/wearables/samples`, `providerState.ts`, `INTEGRATIONS.md`
  - Tests: `test_complete_product_platform_user_workflow`, `tests/mobile.test.mjs`
  - Verification evidence: sample provenance states wearable data is not sole safety source.
  - Blockers: Apple Watch, Wear OS, Garmin, Fitbit, and Bluetooth hardware/credentials unavailable.
  - Follow-up notes: Mock provider state is implemented.

## 18 Smart progression

- [x] COMPLETE CP-18-01: Evidence-based progression/regression engine.
  - Implementation files: `progression_recommendation`, `/progression`
  - Tests: `test_complete_product_platform.py`
  - Verification evidence: service covered in complete API flow.
  - Blockers: None
  - Follow-up notes: Progression requires at least three symptom-free completions.

## 19 Calendar

- [x] COMPLETE CP-19-01: Calendar events API and mobile quick-session visibility.
  - Implementation files: `CalendarEvent`, `/calendar`, `/calendar-events`, Today tab
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: quick-session creates a planned calendar event.
  - Blockers: None
  - Follow-up notes: Dedicated calendar UI can be expanded later.

## 20 Achievements

- [x] COMPLETE CP-20-01: Safe achievement foundation.
  - Implementation files: `AchievementRecord`, `/achievements`, session completion path
  - Tests: `services/api/tests/test_complete_product_platform.py`
  - Verification evidence: model and completion path covered by test suite.
  - Blockers: None
  - Follow-up notes: Avoid unsafe streak pressure.

## 21 Feedback

- [x] COMPLETE CP-21-01: Exercise/session feedback loop.
  - Implementation files: `ExerciseFeedback`, `/exercise-feedback`
  - Tests: `test_complete_product_platform.py`
  - Verification evidence: feedback model and endpoint import/route checks pass in full pytest.
  - Blockers: None
  - Follow-up notes: Feedback cannot override safety.

## 22 Admin

- [x] COMPLETE CP-22-01: Admin user management and masked support view.
  - Implementation files: `/admin/users`, admin dashboard, `ADMIN_GUIDE.md`
  - Tests: `test_admin_complete_platform_surfaces`, `tests/admin-session.test.mjs`
  - Verification evidence: admin tests and Node tests pass.
  - Blockers: None
  - Follow-up notes: Impersonation remains disabled by default.
- [!] BLOCKED CP-22-02: Exercise media management for licensed assets.
  - Implementation files: `/admin/exercises`, `/media-approvals`, admin dashboard
  - Tests: `tests/admin-session.test.mjs`, pytest admin tests
  - Verification evidence: exercise review list and media approval model exist.
  - Blockers: Licensed media permissions unavailable.
  - Follow-up notes: Search/pagination and review surfaces are API-backed.
- [x] COMPLETE CP-22-03: Policy workflow, simulator, and system dashboard.
  - Implementation files: `/admin/policies`, `/admin/policy-simulator`, `/admin/system`, `ProgramSimulation`
  - Tests: `test_admin_complete_platform_surfaces`
  - Verification evidence: simulator and system endpoints pass.
  - Blockers: None
  - Follow-up notes: Clinical publication still requires reviewer process.

## 23 Notifications

- [!] BLOCKED CP-23-01: Notification system and push provider architecture.
  - Implementation files: `NotificationPreference`, `NotificationJob`, `/notification-preferences`, `/notifications/schedule`, `NOTIFICATION_SYSTEM.md`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: local/mock job scheduling and private preview policy pass.
  - Blockers: FCM and APNs credentials unavailable.
  - Follow-up notes: External push activation remains blocked.

## 24 HealthKit and Health Connect

- [!] BLOCKED CP-24-01: Permission-based HealthKit and Health Connect architecture.
  - Implementation files: `PROVIDER_REGISTRY`, `ProviderConnection`, `providerState.ts`, `INTEGRATIONS.md`
  - Tests: `tests/mobile.test.mjs`, `test_complete_product_platform.py`
  - Verification evidence: platform providers expose blocked entitlement states.
  - Blockers: iOS/Android entitlements and device validation unavailable.
  - Follow-up notes: iOS testing is not claimed from Windows.

## 25 Privacy and data rights

- [x] COMPLETE CP-25-01: Export/deletion jobs, consent history, revocation and admin processing foundations.
  - Implementation files: `DataExportJob`, `DeletionJob`, `/privacy/*`, `/admin/privacy-jobs`, `PRIVACY_AND_DATA_RIGHTS.md`
  - Tests: `test_complete_product_platform_user_workflow`, `test_admin_complete_platform_surfaces`
  - Verification evidence: export/deletion jobs are user-isolated and admin-readable as masked job state.
  - Blockers: None
  - Follow-up notes: No legal certification is claimed.

## 26 Production infrastructure

- [!] BLOCKED CP-26-01: Production config, templates, Docker, backup/restore, and monitoring foundations.
  - Implementation files: `docker-compose.prod.yml`, `services/api/Dockerfile`, `apps/admin/Dockerfile`, `infrastructure/*.env.example`, `infrastructure/BACKUP_RESTORE.md`, `PRODUCTION_DEPLOYMENT.md`
  - Tests: `npm.cmd run build`, `npm.cmd run db:migrate`, CI validate/security jobs
  - Verification evidence: local build/migration checks pass; deployment not performed.
  - Blockers: Paid infrastructure credentials, domains, secret manager, monitoring, object storage, and deployment authorization unavailable.
  - Follow-up notes: Do not deploy without explicit authorization.

## 27 Quick-session mode

- [x] COMPLETE CP-27-01: "What can I do today?" fast-entry mode.
  - Implementation files: `/quick-session`, `createQuickSession`, Today tab
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: quick session creates real persisted plan and calendar event.
  - Blockers: None
  - Follow-up notes: Safety rules still run.

## 28 Camera-assisted form

- [!] BLOCKED CP-28-01: Privacy-first camera form-analysis foundation.
  - Implementation files: `CameraAnalysisSession`, `/camera/analyze`, `mock_pose_result`, `CAMERA_PRIVACY_MODEL.md`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: consent-required mock analysis passes; upload/storage false.
  - Blockers: Native pose-estimation dependencies and camera device validation unavailable.
  - Follow-up notes: Mock provider and privacy model are implemented.

## 29 Caregiver mode

- [x] COMPLETE CP-29-01: Permission-based caregiver relationships.
  - Implementation files: `CaregiverRelationship`, `/caregivers/invite`, `/caregivers/{id}/revoke`, `CAREGIVER_MODEL.md`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: invite and revoke pass.
  - Blockers: None
  - Follow-up notes: Default sharing is minimal.

## 30 Professional portal

- [x] COMPLETE CP-30-01: Professional relationship, restriction, and note foundation.
  - Implementation files: `ProfessionalRelationship`, `ProfessionalRestriction`, `ProfessionalNote`, `/professionals/*`, `PROFESSIONAL_PORTAL.md`
  - Tests: `test_complete_product_platform_user_workflow`
  - Verification evidence: invite, restriction, and note endpoints pass.
  - Blockers: None
  - Follow-up notes: Separate from admin and no prescribing.

## 31 Offline and sync

- [!] BLOCKED CP-31-01: Offline critical workflows and secure storage behavior.
  - Implementation files: `OfflineOutbox`, `TokenStore`, mobile API helpers, `MANUAL_DEVICE_TEST_CHECKLIST.md`
  - Tests: `tests/mobile.test.mjs`
  - Verification evidence: account isolation, retry, and secure-store fallback tests pass.
  - Blockers: Native secure storage and full app restart/device sync validation require hardware/tooling.
  - Follow-up notes: Do not submit one user's queued data as another user.

## 32 Accessibility

- [!] BLOCKED CP-32-01: Accessibility coverage across surfaces.
  - Implementation files: mobile accessibility labels, admin semantic nav/headings, `MANUAL_DEVICE_TEST_CHECKLIST.md`
  - Tests: `npm.cmd run typecheck`, static Node tests for rendered source contracts
  - Verification evidence: automated checks pass.
  - Blockers: Manual screen reader, dynamic type, reduced motion, and assistive-tech validation unavailable.
  - Follow-up notes: Manual checklist must be run on real devices/browsers.

## 33 Localization

- [x] COMPLETE CP-33-01: English/Turkish localization for core flows.
  - Implementation files: `apps/mobile/src/localization.ts`, onboarding language fields, voice cue text, exercise localization API
  - Tests: `tests/mobile.test.mjs`, release-candidate API E2E Turkish exercise detail check
  - Verification evidence: Node and Python tests pass.
  - Blockers: None
  - Follow-up notes: Add more copy keys as screens deepen.

## 34 Testing

- [!] BLOCKED CP-34-01: Backend, mobile, admin, and E2E tests for major systems.
  - Implementation files: `services/api/tests/test_complete_product_platform.py`, `tests/mobile.test.mjs`, `tests/admin-session.test.mjs`
  - Tests: same files plus full existing suites
  - Verification evidence: `npm.cmd run test`; `python -m pytest services/api/tests`; `npm.cmd run typecheck`
  - Blockers: Live browser and physical mobile device validation unavailable locally.
  - Follow-up notes: Automated tests are meaningful; manual runtime validation remains separate.

## 35 Documentation

- [x] COMPLETE CP-35-01: Required complete-product docs and Windows PowerShell commands.
  - Implementation files: complete-product docs under `docs/`, `README.md`, `AGENTS.md`, infrastructure docs
  - Tests: `npm.cmd run checklist:check`
  - Verification evidence: checklist validator enforces closure/evidence.
  - Blockers: None
  - Follow-up notes: Keep docs updated as providers activate.

## 36 CI/CD

- [x] COMPLETE CP-36-01: Stable CI coverage for format, lint, typecheck, Node, Python, PostgreSQL, Redis, migrations, import fixture, admin build, security, config, and checklist validation.
  - Implementation files: `.github/workflows/ci.yml`, `.github/workflows/security.yml`, `package.json`
  - Tests: GitHub CI and local commands
  - Verification evidence: previous PR CI green; local complete-product tests pass.
  - Blockers: None
  - Follow-up notes: Browser/device CI can be added when stable tooling exists.
- [x] COMPLETE CP-36-02: Checklist validator.
  - Implementation files: `scripts/check-complete-product-checklist.mjs`, `package.json`
  - Tests: `npm.cmd run checklist:check`
  - Verification evidence: fails on open/in-progress/TBD evidence, forbidden ports, role headers, and embedded admin password.
  - Blockers: None
  - Follow-up notes: CI runs it before typecheck.

## 37 Release validation

- [!] BLOCKED CP-37-01: Full verification, PostgreSQL/Redis, dataset import, runtime, Android, push, provider, and PR validation.
  - Implementation files: `RELEASE_TEST_MATRIX.md`, `MANUAL_DEVICE_TEST_CHECKLIST.md`, `scripts/validate-postgres.ps1`
  - Tests: local Node/Python/build/migration checks and CI after PR creation
  - Verification evidence: local automated checks pass; CI will be watched after push/PR.
  - Blockers: Local Docker daemon, Android tooling, provider credentials, push credentials, licensed media, and physical devices may be unavailable.
  - Follow-up notes: Do not claim blocked validations passed.

## Final completion summary

- Total tasks: 51
- Complete: 37
- Blocked: 14
- Not applicable: 0
- Remaining: 0
