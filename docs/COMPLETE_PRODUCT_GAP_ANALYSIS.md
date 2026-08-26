# MoveInRange Complete Product Gap Analysis

This audit reflects the repository state at the start of `codex/complete-product-platform`, stacked on `codex/release-candidate-validation`.

Classification values:

```text
COMPLETE
PARTIAL
PLACEHOLDER
MOCK_ONLY
DEVELOPMENT_ONLY
UNVALIDATED
BLOCKED
MISSING
BROKEN
```

## Product Areas

| Area | Classification | Evidence | Required closure |
| --- | --- | --- | --- |
| 01 Consumer mobile experience | PARTIAL | Expo tab screens, token store, outbox, basic plan/profile/workout flows exist. | Add onboarding, quick session, expanded workout/media/voice/offline flows. |
| 02 Professional onboarding | MISSING | No multi-step persisted onboarding wizard. | Add API, mobile wizard, validation, resume, consent history. |
| 03 Advanced health profile | PARTIAL | Profile stores JSON health payload and selected conditions. | Normalize and expand identity, physiological context, capacity, goals, restrictions. |
| 04 Goals and target muscles | MISSING | Existing planning supports broad request fields only. | Add structured goals, target muscles, and safe intent mapping. |
| 05 Activity and capacity | MISSING | No derived capacity profile or assessment result model. | Add capacity fields, assessment APIs, conservative planner use. |
| 06 Daily, weekly, monthly programming | PARTIAL | Daily/weekly/monthly plan endpoints exist. | Add advanced generator, variants, calendar, progression, stored decision evidence. |
| 07 Workout execution | PARTIAL | Workout state machine supports pause/resume/stop/snapshot. | Add richer player model, voice/media hooks, feedback, tests. |
| 08 Exercise media and silhouette | PARTIAL | Exercise media metadata imports with license state. | Add media resolver, silhouette metadata, fallback renderer, admin approval workflow. |
| 09 Voice guidance | MISSING | No cue scheduler or voice adapter. | Add adapters, modes, scheduler, tests. |
| 10 Diabetes and CGM context | PARTIAL | Glucose entries and basic insights exist. | Add delayed checks, CGM trends, provider architecture, stronger no-treatment guards. |
| 11 Wearable and health-platform adapters | MISSING | No provider abstraction. | Add mock adapters and blocked real-provider activation docs. |
| 12 Engagement and progress systems | MISSING | No achievements or progression engine. | Add progression reasons, feedback learning, safe achievements. |
| 13 Program calendar | MISSING | No calendar event model or UI. | Add calendar APIs and mobile/admin visibility. |
| 14 Full admin console | PARTIAL | Manual login, dashboard, audit, simulator, flags, imports exist. | Add management APIs/screens for users, exercises, policies, systems, privacy jobs. |
| 15 Notifications | MISSING | Documentation only. | Add preferences, local/mock providers, push adapter interfaces, history. |
| 16 Privacy and data rights | PARTIAL | Privacy docs and some audit concepts exist. | Add export/deletion jobs, consent history, deletion workflows, admin processing. |
| 17 Production infrastructure | PARTIAL | Docker compose, health/ready, deployment docs, security checks exist. | Add production templates, backup/restore, worker, monitoring, release checklist. |
| 18 Camera-assisted form analysis | MISSING | No camera provider or mock estimator. | Add feature-flagged privacy-first interface, mock estimator, overlay model, tests. |
| 19 Caregiver mode | MISSING | No caregiver relationships. | Add invite/accept/revoke/share/audit model and APIs. |
| 20 Professional portal | MISSING | Admin roles exist but no separate professional access. | Add professional relationships, restrictions, notes, consent, audit. |
| 21 Dynamic safety engine | PARTIAL | Deterministic safety service and admin simulator exist. | Expand rule contexts and persisted safety decisions. |
| 22 Natural plan modification | MISSING | Session substitution exists, but no structured modification engine. | Add plan modification model/API/parser/tests. |
| 23 Program variants | PARTIAL | Daily/weekly/monthly and basic durations exist. | Add all requested deterministic variants with tests. |
| 24 Offline and sync | PARTIAL | Account-scoped outbox and token storage exist. | Add draft caches, conflicts, secure storage guards, workflow-specific queues. |
| 25 Accessibility | UNVALIDATED | Some labels/styles exist, no systematic checks. | Add static tests/docs and manual checklist. |
| 26 Localization | PARTIAL | Mobile localization exists and exercise Turkish import exists. | Expand core flow translations and fallback tests. |
| 27 CI/CD and release validation | PARTIAL | CI validates Node/Python/security; PR #4 was green. | Add checklist validation, localization checks, import fixture, mobile static build, browser E2E when stable. |

## External Blockers Known Up Front

- Dexcom, FreeStyle Libre, Tidepool, Garmin, Fitbit, FCM, APNs: provider credentials/developer accounts are not available.
- Apple Health, Apple Watch, HealthKit: iOS entitlement and device validation are unavailable from this Windows environment.
- Android Health Connect, Wear OS, Android emulator/device validation: Android tooling was unavailable in the previous validation run.
- Bluetooth heart-rate sensors: physical hardware is unavailable.
- Camera pose estimation: native dependency and device validation are unavailable.
- Licensed exercise media: third-party media cannot be copied or committed without explicit authorization.
- Paid production infrastructure: deployment credentials and authorization are unavailable.

## Initial Implementation Strategy

1. Add normalized platform models and migrations for user-controlled product data.
2. Add deterministic services and provider interfaces with mock adapters where real providers are blocked.
3. Add API endpoints that enforce user isolation and auditability.
4. Add mobile/admin UI surfaces that call real local APIs instead of placeholders where possible.
5. Add tests and docs for each group, then update the master checklist with evidence.
