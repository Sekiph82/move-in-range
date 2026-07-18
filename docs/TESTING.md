# Testing

Run from `C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range`.

```powershell
npm.cmd run format:check
npm.cmd run lint
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

Current expanded coverage includes:

- Local auth registration/login and token use.
- Access-token issuer/audience/expiration/signature checks.
- Refresh-token rotation, replay rejection, and logout invalidation.
- Admin login and backend role enforcement without `x-admin-role`.
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
- Timestamp-based workout timer pause/resume/invalidation.
- Canonical local port guard for `8200` and `3200`.
