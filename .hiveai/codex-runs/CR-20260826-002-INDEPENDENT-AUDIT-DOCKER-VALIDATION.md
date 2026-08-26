# Codex Run CR-20260826-002 - Independent Audit + Docker Validation

Date: `2026-08-26`
Prompt: `P-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION`
Audit: `A-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION`
Repository: `Sekiph82/move-in-range`
Branch: `codex/main-consolidation`
Starting revision: `c08014027d09f4a7cd4a379e16830e0c23fe32b4`

## Run policy

This is a fresh execution against the current branch. Historical Codex run claims were not used as proof. No merge, branch deletion, stacked PR closure, or force dependency upgrade was performed.

## Repository and branch verification

- The required H!veAI files, canonical `TASKS.md`, current prompt/audit pointers, handoff, decisions, and run-log protocol were present.
- `git status`, branch name, recent history, and diff were inspected before changes.
- No unexpected product files, committed secrets, or local-only paths were introduced by this run.
- `git diff --check` passed after the implementation changes.

## Changes made during validation

- Added `.pytest-tmp` and `.uv-cache` to `.dockerignore` so transient host test data cannot enter Docker build context.
- Added accessible heading semantics to the Today, onboarding, and workout player mobile surfaces.
- Updated the product UI reset-link assertion to accept the current secure fragment form as well as query links.
- Disabled Uvicorn access logs in the API image so one-time token query values cannot be written to routine container logs.

## Docker lifecycle and Compose evidence

Initial `docker info` failed because the engine was unavailable. Docker Desktop was not running. The required executable was found at `C:\Program Files\Docker\Docker\Docker Desktop.exe`, started by this run, and the Linux engine became ready within the allowed five-minute window. Docker server version observed: `29.5.3`.

Commands and results:

- `docker compose config -q`: exit `0`.
- `docker compose --profile test config -q`: exit `0`.
- `docker compose --profile test build`: exit `0` after excluding transient test/cache directories.
- `docker compose build`: exit `0`.
- `docker compose up -d --build`: exit `0`.
- `docker compose ps`: Postgres, Redis, Mailpit, API, admin, and product web were `healthy`; one-shot `db-init` and `migrate` completed successfully.
- `docker compose logs --no-color --tail=120 api admin product-web postgres redis mailpit`: startup logs were inspected; no service startup errors were present. After the API image hardening rebuild, API logs contained startup lines without request access-log query values.

Compose services and exposed ports:

| Service | Purpose | Port |
| --- | --- | --- |
| `postgres` | PostgreSQL authoritative integration database | `5432` |
| `redis` | Revocation/cache integration service | `6379` |
| `mailpit` | Local SMTP and mailbox inspection | `1025`, `8025` |
| `api` | FastAPI backend | `8200` |
| `admin` | Next.js admin console | `3200` |
| `product-web` | Expo web product surface | `3210` |
| `db-init`, `migrate` | Database initialization and migration jobs | none |
| `tests` | Test profile runner | none |

Health endpoints returned HTTP `200`:

- `http://localhost:8200/api/v1/health`
- `http://localhost:8200/api/v1/ready`
- `http://localhost:3200/login`
- `http://localhost:3210/healthz`
- `http://localhost:8025/api/v1/info`

The test profile uses dependency health conditions and PostgreSQL/Redis tests executed against Compose services rather than being skipped.

## Fresh test results

### Docker test profile

Command: `docker compose --profile test run --rm tests`

- Node suite: `75 tests`, `70 passed`, `5 failed`, `0 skipped`.
- API pytest separately executed in Docker: `36 passed`, `0 skipped`, `65 warnings`.
- `ruff check services/api`: passed.
- Alembic heads: exactly one head, `20260719_0010 (head)`.
- Clean test PostgreSQL migration: passed.
- Docker exercise fixture import: `2 imported`, `0 failed rows`, `2 locales`, `media_committed=false` as expected for the local fixture.
- Admin production build: passed.
- Security scan: passed, `399 files`, no obvious committed secrets.
- `npm audit`: failed with `24 vulnerabilities (10 moderate, 14 high)`.
- `npm audit --audit-level=high`: failed with the same current count.

The five remaining Docker Node test failures are not Docker startup or dependency failures:

1. `tests/product-e2e.test.mjs` / `product web-compatible closed beta flow uses real mobile routes and API`: static assertion at `apps/mobile/app/readiness.tsx` expects an older route shape; the current readiness route is implemented differently.
2. `tests/product-ui-e2e.test.mjs` / `product auth and route guards reject invalid, duplicate, and signed-out access`: expects `Step 1 of 22`, while the current product onboarding flow renders `Step 1 of 7`.
3. `tests/product-ui-e2e.test.mjs` / `product readiness and plans scenario uses visible controls`: expects the obsolete label `Complete readiness check`; the current control is `Check readiness`.
4. `tests/product-ui-e2e.test.mjs` / `product workout and feedback scenario uses visible controls`: waits for a sessions POST before the current readiness-gated start flow reaches that operation; the current control is `Check readiness & start`.
5. `tests/product-ui-e2e.test.mjs` / `product web UI closed beta flow uses visible controls and persisted API state`: expects `Step 1 of 22`, while the current product onboarding flow renders `Step 1 of 7`.

A direct Playwright diagnostic in the test container confirmed the running product flow and network path: registration returned `201`, profile returned `200`, browser API requests to the Compose API returned `200`, and the browser rendered the product Home route and onboarding route. These failures therefore remain stale contract/product-flow alignment items, not legitimate Docker skips.

### Host verification

Fresh host commands and results:

- `npm.cmd run format:check`: passed.
- `npm.cmd run lint`: passed, `313 files` checked for prohibited safety language.
- `npm.cmd run checklist:check`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: `75 tests`, `65 passed`, `0 failed`, `10 skipped`.
- `npm.cmd run build`: passed.
- `npm.cmd run mobile:web:build`: passed.
- `npm.cmd run security:check`: passed, `5032 files`, no obvious committed secrets.
- `ruff.exe check services/api`: passed.
- `python -m pytest services/api/tests -q --basetemp=$TEMP\\moveinrange-pytest-cr-20260826-002-host`: `34 passed`, `2 skipped`, `63 warnings`.
- `python -m alembic heads`: exactly one head, `20260719_0010 (head)`.
- `npm.cmd run db:migrate` against a clean temporary SQLite database: passed.
- `npx.cmd expo-doctor`: `18/18 checks passed`.
- `npx.cmd expo export --platform ios --clear`: passed.
- `npx.cmd expo export --platform android --clear`: passed.
- Host `npm.cmd audit` and `npm.cmd audit --audit-level=high`: each failed with `24 vulnerabilities (10 moderate, 14 high)`.

The ten host Node skips are legitimate precondition skips because host E2E environment variables were not set. The exact conditions are:

- `tests/browser-e2e.test.mjs`: admin live tests require `ADMIN_E2E_BASE_URL` and the admin service.
- `tests/product-e2e.test.mjs`: product flow requires `PRODUCT_E2E_API_BASE_URL` or `API_BASE_URL`.
- `tests/product-ui-e2e.test.mjs`: reset requires `PRODUCT_WEB_BASE_URL`, `MAILPIT_BASE_URL`, and `API_BASE_URL`; the other product UI scenarios require the product web and API URLs.

The two host API pytest skips are legitimate precondition skips:

- `test_postgres_migrated_mvp_workflow` skips when `TEST_DATABASE_URL` is absent.
- `test_redis_revocation_store_when_available` skips when `REDIS_URL` is absent or unreachable.

PostgreSQL and Redis integration tests were independently executed in Docker with `0` skips, so these host skips do not conceal an untested Docker path.

## Dependency and security baseline

The authoritative fresh baseline is `24 vulnerabilities (10 moderate, 14 high)` from both audit commands. Affected dependency paths reported by npm include `brace-expansion`, `image-size` through Metro/Expo, `js-yaml`, `nanoid`, `next`, `postcss`, `sharp`, and related transitive packages. `uuid` is present in a moderate advisory chain. `npm audit fix --force` was not run; its proposed Expo major upgrade would be breaking and is outside this prompt.

Local Compose credentials are development placeholders supplied through repository environment conventions. No production credentials, tokens, refresh tokens, exact health values, or raw sensitive request values were copied into Docker files or artifacts.

## Classification and verdict

- H!veAI control-system structure: `VERIFIED`.
- Compose configuration/build/startup/health/networking: `VERIFIED`.
- PostgreSQL, Redis, migration, import, API, admin build, and security scan Docker checks: `VERIFIED`.
- Host format/lint/checklist/typecheck/build/mobile/export/migration checks: `VERIFIED`.
- Full Docker Node suite: `REGRESSED` against the expected green gate, with 5 stale product E2E contract failures.
- Host E2E/API integration skips: `UNVERIFIED` on host only, with exact preconditions recorded above; Docker equivalents ran.
- Dependency security gate: `BLOCKED` by 14 high and 10 moderate npm advisories.
- Native device/provider/deployment acceptance: `UNVERIFIED`; no hardware, real provider credentials, or public deployment was claimed.

Final verdict: `VERIFIED_WITH_BLOCKERS`.

The requested validation and evidence work is complete, but consolidation is not ready for a main merge. Remaining work is to align or deliberately revise the stale product E2E contracts, remediate dependency advisories through a compatible non-force upgrade plan, and rerun the full gates.

## Cleanup and repository safety

The Compose project was cleaned with `docker compose --profile test down --remove-orphans` after evidence capture. Because Docker Desktop was started by this run, its supported shutdown command was checked and Docker Desktop was stopped after validation. Historical stacked PRs and branches were left untouched.
