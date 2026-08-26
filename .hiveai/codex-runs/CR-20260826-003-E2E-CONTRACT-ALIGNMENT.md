# CR-20260826-003 - E2E Contract Alignment

## Run identity

- Prompt: `P-20260826-003-E2E-CONTRACT-ALIGNMENT`
- Repository: `Sekiph82/move-in-range`
- Branch: `codex/main-consolidation`
- Starting revision: `de42c60b02667e98fcd8a7804551ac2d1cb19488`
- Run date: `2026-08-26`
- Execution role: Codex implementation and verification layer

## Scope decision

The current product source implements the canonical shortened seven-step onboarding flow,
readiness-gated new workout starts, plan/session context through readiness, and the current
Expo Router tab-shell routes. The five stale Docker Node contracts were therefore corrected in
the tests. No product source behavior was changed.

Stale contracts found and corrected:

1. Onboarding assertions expected `Step N of 22`; assertions now follow `Step N of 7` and the
   current seven-step choices and final `Create my plan` action.
2. Readiness tests expected the obsolete `Complete readiness check` label; they now enter via
   the current `Open readiness check` accessibility label and complete the visible six-question
   readiness flow.
3. Workout tests assumed a direct session POST after `Start guided workout`; they now assert
   the current `Check readiness & start` path, complete readiness, then observe the session POST.
4. Static route inventory used root-level readiness, daily-plan, and privacy paths that do not
   exist in the current Expo Router tree; it now uses the actual `(tabs)` route files.
5. Plan tests assumed immediate generation and obsolete labels; they now complete the current
   four-step plan wizard, use current daily/weekly/monthly labels, wait for the generation
   response where required, and assert the `Workout preview` outcome.
6. Workout controls were matched to obsolete verbose labels; tests now use the current `Pause`
   and `Resume` controls and navigate to feedback through the current session route.

These changes preserve the readiness requirement. Same-day readiness is not used to bypass the
new-workout readiness flow; the same active-workout resume behavior remains a product concern
covered by the existing source and unit contracts.

## Changed files

- `tests/product-e2e.test.mjs`
- `tests/product-ui-e2e.test.mjs`
- `.hiveai/codex-runs/CR-20260826-003-E2E-CONTRACT-ALIGNMENT.md`

No application source, authoritative audit, task board, pointer, or handoff file was changed.

## Docker validation

Commands executed:

- `docker compose config -q` - passed.
- `docker compose --profile test config -q` - passed.
- `docker compose --profile test build` - passed.
- `docker compose up -d --build` - passed.
- `docker compose ps` - all runtime services healthy before cleanup.
- Endpoint checks for API health/readiness, admin login, product web health, and Mailpit info -
  all HTTP 200.
- `docker compose logs --no-color --tail=100 postgres redis mailpit api admin product-web` -
  clean startup/readiness logs; no service errors observed.
- `docker compose --profile test run --rm tests` - product/test checks completed; command exit
  was 1 only at the final dependency audit gate described below.
- `docker compose --profile test down --remove-orphans` - passed.
- Docker Desktop was started for this run and stopped after cleanup. Final `docker info`
  confirmed that the daemon was stopped.

Compose services used:

- `postgres`
- `db-init`
- `redis`
- `mailpit`
- `migrate`
- `api`
- `admin`
- `product-web`
- `tests` (test profile)

Exposed local ports: PostgreSQL `5432`, Redis `6379`, SMTP `1025`, Mailpit UI/API `8025`, API
`8200`, admin `3200`, product web `3210`.

Health evidence: PostgreSQL, Redis, Mailpit, API, admin, and product web were all reported
`healthy`. `db-init` and `migrate` completed successfully as one-shot services.

## Test results

### Docker

- Root Node suite (`npm run test`): `75 passed, 0 failed, 0 skipped`.
- Backend pytest (`python -m pytest services/api/tests`): `36 passed, 0 failed, 0 skipped`.
- Ruff (`cd services/api && ruff check .`): passed.
- Root migration check (`npm run db:migrate`): passed.
- Test-database migration check (`DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate`):
  passed.
- Exercise import (`npm run import:exercises -- tests/fixtures/exercises.sample.json`): passed;
  two fixture rows imported.
- Workspace build (`npm run build`): passed.
- Security scan (`npm run security:check`): passed; no obvious committed secrets found.

### Host

- `npm.cmd run format:check`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run checklist:check`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: `75 total, 65 passed, 0 failed, 10 skipped`.
- `npm.cmd run build`: passed.
- `npm.cmd run mobile:web:build`: passed.
- `npm.cmd run security:check`: passed; no obvious committed secrets found.
- `ruff.exe check services/api`: passed.
- `python -m pytest services/api/tests -q --basetemp=$env:TEMP\\moveinrange-cr-20260826-003-host`:
  `34 passed, 0 failed, 2 skipped`.
- `python -m alembic heads`: one expected head, `20260719_0010`.
- Clean SQLite migration check with `DATABASE_URL=sqlite:///./cr-20260826-003-migration.db`:
  passed.
- App-root `npx.cmd expo-doctor`: `18/18 checks passed`.
- App-root iOS Expo export: passed.
- App-root Android Expo export: passed.

## Remaining skips and failures

There were no Docker test skips and no Docker product/test failures. The Compose test command
returned exit 1 only because its final `npm audit --audit-level=high` step found the existing
dependency state: `24 vulnerabilities (10 moderate, 14 high)`. Some remediation paths require
`npm audit fix --force` and a breaking Expo upgrade. Dependency modernization is outside this
prompt, so no dependency files were changed and no force fix was run.

Host-only Node skips are legitimate because the host command was intentionally run without the
Docker service URLs. The exact tests and conditions were:

- `Playwright live browser smoke can visit configured admin routes` - skipped when
  `ADMIN_E2E_BASE_URL` is unset.
- `Playwright admin acceptance performs login, navigation, screenshots, logout, and CSRF
  rejection` - skipped when `ADMIN_E2E_BASE_URL` is unset.
- `product web-compatible closed beta flow uses real mobile routes and API` - skipped when
  `PRODUCT_E2E_API_BASE_URL` and `API_BASE_URL` are unset.
- `product password reset sends an SMTP email and completes through visible reset screens` -
  skipped when `PRODUCT_WEB_BASE_URL`, `MAILPIT_BASE_URL`, and `API_BASE_URL` are unset.
- `product auth and route guards reject invalid, duplicate, and signed-out access` - skipped
  when `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` are unset.
- `product readiness and plans scenario uses visible controls` - skipped when
  `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` are unset.
- `product workout and feedback scenario uses visible controls` - skipped when
  `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` are unset.
- `product diabetes and calendar scenario uses visible controls` - skipped when
  `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` are unset.
- `product privacy logout and persistence scenario uses visible controls` - skipped when
  `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` are unset.
- `product web UI closed beta flow uses visible controls and persisted API state` - skipped
  when `PRODUCT_WEB_BASE_URL` is unset.

Host-only Python skips are legitimate dependency precondition skips:

- `test_postgres_migrated_mvp_workflow` - exact condition `TEST_DATABASE_URL` is not set.
- `test_redis_revocation_store_when_available` - exact condition `REDIS_URL` is not set.

Both host-only infrastructure skips ran successfully in Docker because the test profile supplied
PostgreSQL and Redis service URLs.

Observed non-failing warnings were dependency/framework deprecations from FastAPI/Starlette and
Expo bundling. They did not fail validation.

## Dependency audit claim

The current npm audit result is recorded only as an execution result: `24 vulnerabilities`,
including `14 high` and `10 moderate`. No audit remediation or major framework upgrade was
performed in this prompt.

## Commit and next action

- Final commit SHA: to be recorded after committing this run log and the two test changes.
- Next required action: ChatGPT audit layer must independently inspect this CR and write the
  authoritative post-run audit under the audit-layer path. Do not mark merge readiness DONE from
  this Codex run.
