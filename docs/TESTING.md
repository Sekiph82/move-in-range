# Testing

Run from `<repo-root>`.

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run checklist:check
npm.cmd run typecheck
npm.cmd run test
ruff check services/api
python -m pytest services/api/tests
npm.cmd run build
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
npm.cmd run security:check
npm.cmd audit --audit-level=high
npm.cmd audit
```

Clean PostgreSQL validation:

```powershell
docker compose down -v
docker compose up -d postgres redis
$env:DATABASE_URL="postgresql+psycopg://moveinrange:moveinrange@localhost:5432/moveinrange"
$env:TEST_DATABASE_URL="postgresql+psycopg://moveinrange:moveinrange@localhost:5432/moveinrange"
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
python -m pytest services/api/tests
```

GitHub Actions uses `moveinrange_test` as a disposable PostgreSQL database. `services/api/tests/test_postgres_integration.py` asserts that `TEST_DATABASE_URL` starts with `postgresql`, so CI cannot silently claim PostgreSQL coverage while using SQLite.

Release-candidate PostgreSQL/Redis validation:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-postgres.ps1
```

The script fails if Docker/PostgreSQL is unavailable or if `DATABASE_URL` and `TEST_DATABASE_URL` are not separate PostgreSQL databases.

Current expanded coverage includes:

- Local auth registration/login and token use.
- Access-token issuer/audience/expiration/signature checks.
- Refresh-token rotation, replay rejection, and logout invalidation.
- Admin login and backend role enforcement without `x-admin-role`.
- Admin HttpOnly cookie session contract, logout CSRF guard, and no embedded browser password.
- User isolation for sessions and plans.
- Onboarding/profile persistence.
- Readiness persistence and deterministic safety result.
- Daily plan duration validation.
- Weekly and monthly plan generation.
- Weekly recovery spacing and monthly progression holds.
- Exercise search/detail localization.
- Session event idempotency, pain reporting, completion.
- Symptom stop behavior and blocked normal completion.
- Glucose conversion and no-insulin-recommendation response.
- Offline event duplicate handling, retry count, and failed state.
- Stored insights aggregation.
- PostgreSQL migration/import/API integration guard.
- Redis token revocation integration when Redis is available.
- Full API E2E release-candidate flow.
- Complete-product onboarding, consent, capacity, baseline safety, target muscles, advanced plans, plan modification, quick-session, media fallback, voice cues, diabetes context, mock provider sync, wearable provenance, notification preferences/jobs, privacy jobs, caregiver revoke, professional restrictions/notes, camera consent, and admin system/privacy/user surfaces.
- Mobile onboarding draft validation, media fallback, voice scheduler, and provider blocked-state honesty.
- Timestamp-based workout timer pause/resume/invalidation.
- Workout snapshot restore and offline outbox account isolation.
- Canonical local port guard for `8200` and `3200`.
