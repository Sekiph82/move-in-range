# Functional MVP Gap Analysis

## Dataset Inspection

- Exercise dataset: the local import source contains 1,324 JSON records, 10 instruction locales, image/GIF paths, schema, attribution fields, and media files that must not be committed to Git.

## Audit Table

| Area | Previous state | MVP state |
|---|---|---|
| Mobile navigation | PARTIAL | COMPLETE for five primary tabs |
| Onboarding | MOCK_ONLY | PARTIAL: persisted profile/disclosure flow via API |
| Local auth | PLACEHOLDER | COMPLETE for local register/login/refresh/me |
| API client | MISSING | COMPLETE for primary mobile workflows |
| API routes | PARTIAL | COMPLETE for MVP auth/profile/readiness/exercises/plans/sessions/glucose/insights |
| Database persistence | PARTIAL | PARTIAL: SQLAlchemy tables and Alembic migration; clean migration covered |
| Readiness checks | PARTIAL | COMPLETE: backend safety decision persisted |
| Exercise search/detail | PLACEHOLDER | COMPLETE: importer-backed DB search/detail with Turkish/English fallback |
| Daily plan | PARTIAL | COMPLETE: persisted deterministic plan and duration validation |
| Weekly plan | MISSING | PARTIAL: persisted seven-day conservative plan |
| Monthly plan | MISSING | PARTIAL: persisted four-week progression model |
| Guided workout | PARTIAL | PARTIAL: session start/progress/complete and mobile action flow |
| Pain/symptom reporting | PARTIAL | COMPLETE for API persistence and safety stop action |
| Glucose logging | PLACEHOLDER | COMPLETE for optional context and canonical mg/dL conversion |
| Insights | PLACEHOLDER | PARTIAL: stored session/glucose aggregate metrics |
| Offline outbox | PARTIAL | PARTIAL: persistent client queue helpers and server idempotent event endpoint |
| Localization | PARTIAL | PARTIAL: mobile language toggle and dataset instruction locale selection |
| Accessibility | PARTIAL | PARTIAL: labels, touch targets, non-color status text |
| Admin | PLACEHOLDER | PARTIAL: API-backed primary dashboard surfaces |
| Tests | INSUFFICIENT | PARTIAL: expanded backend workflow/isolation and config guard tests |
| Docker/Windows setup | PARTIAL | PARTIAL: canonical ports and docs updated |

## Remaining Items

- Native real-device validation was not performed.
- Full production-grade offline reconciliation, conflict resolution, and push notification delivery remain future work.
- Clinical policy editing and publication workflows remain draft and role protected.
- External auth providers, HealthKit, Health Connect, FCM, and production infrastructure remain mock/adapter-only.
