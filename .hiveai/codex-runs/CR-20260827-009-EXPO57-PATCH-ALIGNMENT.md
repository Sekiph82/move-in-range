# CR-20260827-009 - Expo 57 Patch Alignment

## Scope

Executed the GitHub-authoritative P-20260827-009-EXPO57-PATCH-ALIGNMENT prompt on `main`. The bounded Expo SDK 57 and React Native patch drift was aligned with Expo compatibility tooling. No product behavior or architecture was changed. No authoritative ChatGPT audit was written or overwritten. No historical PR or branch cleanup was performed.

## Control Plane And Synchronization

The GitHub control-plane resources were read in the requested order on `main`: INDEX, PROJECT_DASHBOARD, TASKS, CURRENT audit, CURRENT prompt, exact P009 prompt, LATEST handoff, AGENTS, P008 CR, and P008 authoritative audit.

Repository: `Sekiph82/move-in-range`

- Starting authoritative main SHA: `ed4c24a7e65e7573988195f245fce439dab181b4`
- Local branch: `main`
- Remote: `https://github.com/Sekiph82/move-in-range.git`
- `git fetch origin` completed before local execution.
- Local checkout was clean and five commits behind `origin/main`; it was safely fast-forwarded to the GitHub control-plane state.
- The application/control-plane verification commit was `799cbb470a1b37e7421bd07bc51a67b0b7a45e9e`.

## Initial Expo Evidence

Fresh commands from `apps/mobile` before the dependency change:

- `npx.cmd expo-doctor`: `20/21 checks passed`; one package compatibility check failed.
- `npx.cmd expo install --check`: reported the same 11 patch mismatches.

Exact initial mismatches:

| package | expected | found |
| --- | --- | --- |
| `@expo/metro-runtime` | `~57.0.14` | `57.0.13` |
| `expo` | `~57.0.17` | `57.0.16` |
| `expo-constants` | `~57.0.15` | `57.0.14` |
| `expo-haptics` | `~57.0.2` | `57.0.1` |
| `expo-linking` | `~57.0.8` | `57.0.7` |
| `expo-notifications` | `~57.0.15` | `57.0.14` |
| `expo-router` | `~57.0.17` | `57.0.16` |
| `expo-secure-store` | `~57.0.2` | `57.0.1` |
| `expo-speech` | `~57.0.2` | `57.0.1` |
| `expo-sqlite` | `~57.0.2` | `57.0.1` |
| `react-native` | `0.86.3` | `0.86.2` |

## Dependency Change

Used the prescribed compatibility command from `apps/mobile`:

`npx.cmd expo install --fix`

The mobile manifest declarations changed for:

- `expo`: `~57.0.16` -> `~57.0.17`
- `expo-haptics`: `~57.0.1` -> `~57.0.2`
- `expo-linking`: `~57.0.7` -> `~57.0.8`
- `expo-notifications`: `~57.0.14` -> `~57.0.15`
- `expo-router`: `~57.0.16` -> `~57.0.17`
- `expo-secure-store`: `~57.0.1` -> `~57.0.2`
- `expo-speech`: `~57.0.1` -> `~57.0.2`
- `expo-sqlite`: `~57.0.1` -> `~57.0.2`
- `react-native`: `0.86.2` -> `0.86.3`

The existing compatible ranges for `@expo/metro-runtime` and `expo-constants` remained unchanged in the manifest; the lockfile resolved them to `57.0.14` and `57.0.15`, respectively. The root `package-lock.json` was updated normally by Expo/npm tooling. React and React DOM remain `19.2.3`; Expo remains SDK 57. No `npm audit fix --force` was used.

## Host Validation

Passed:

- `npm.cmd ci`
- `npm.cmd run format:check`
- `npm.cmd run lint`
- `npm.cmd run checklist:check`
- `npm.cmd run typecheck`
- `npm.cmd test`: `75 tests`, `65 passed`, `0 failed`, `10 skipped`
- `npm.cmd run build`
- `npm.cmd run mobile:web:build`
- `npm.cmd audit --audit-level=high`: exit success
- `npm.cmd run security:check`: no obvious committed secrets
- `ruff check services/api`
- `python -m pytest services/api/tests -q`: `34 passed`, `2 skipped`, `0 failed`
- `python -m alembic heads` from `services/api`: one head, `20260719_0010`
- `npx.cmd expo-doctor`: `21/21 checks passed`
- `npx.cmd expo install --check`: dependencies up to date
- `npx.cmd expo export --platform ios --clear`: passed
- `npx.cmd expo export --platform android --clear`: passed

Host-only skips were legitimate configuration-gated skips, not test failures:

- Two admin Playwright tests skipped because `ADMIN_E2E_BASE_URL` was not set.
- Eight product Playwright tests skipped because the product/API/Mailpit E2E URLs were not set (`PRODUCT_E2E_API_BASE_URL`, `API_BASE_URL`, `PRODUCT_WEB_BASE_URL`, or `MAILPIT_BASE_URL`).
- `test_postgres_integration.py` skipped because `TEST_DATABASE_URL` was not set.
- `test_redis_revocation_integration.py` skipped because `REDIS_URL` was not set.

The Docker test profile below ran these live scenarios and integrations with zero skips.

## Docker Validation

Docker Desktop was started for this run. Passed:

- `docker info`
- `docker compose config -q`
- `docker compose --profile test config -q`
- `docker compose --profile test build`
- `docker compose up -d --build`
- `docker compose ps` and health checks
- HTTP checks: API `/api/v1/health` 200, API `/api/v1/ready` 200, admin `/login` 200, product web `/healthz` 200
- `docker compose --profile test run --rm tests`
- `docker compose --profile test down --remove-orphans`

Healthy runtime services and exposed ports:

- PostgreSQL: `5432`
- Redis: `6379`
- Mailpit SMTP/UI: `1025` / `8025`
- API: `8200`
- Product web: `3210`
- Admin: `3200`

Docker test results:

- Node/Playwright: `75 passed`, `0 failed`, `0 skipped`
- API: `36 passed`, `0 failed`, including PostgreSQL and Redis integration tests
- Migration check, exercise import, build, and security checks passed

Compose logs showed successful migration completion, API startup, admin readiness, and product web startup. No Docker service failure was observed.

## GitHub Exact-Commit Evidence

The dependency/task commit was pushed to `main` as `799cbb470a1b37e7421bd07bc51a67b0b7a45e9e`.

- Main CI run `33047333979`: success, validate job `98434309699`
  - https://github.com/Sekiph82/move-in-range/actions/runs/33047333979
- Main Security run `33047333940`: success, security job `98434308902`
  - https://github.com/Sekiph82/move-in-range/actions/runs/33047333940

GitHub CI independently passed install, format, lint, checklist, typecheck, Node tests, Python dependency installation, migration, exercise import, Ruff, API pytest, and build. GitHub Security independently passed high-severity npm audit, repository security scan, and pip-audit.

## Security And Residuals

- No obvious committed secrets were found by the repository security check.
- Zero high/critical npm advisories remain.
- The remaining `uuid`/Expo tooling advisory family is moderate-only; the available forced fix would downgrade Expo and was not applied.
- GitHub Security passed without workflow weakening.
- Physical Android/iPhone acceptance remains external/manual.
- Real public deployment/provider validation remains external/manual.

## Product And Safety Invariants

The patch-only dependency change preserved the seven-step onboarding and readiness-first workflow, readiness before every new workout, same-active-workout resume behavior, identity continuity, safety stop behavior, auth/RBAC protections, PostgreSQL authority, Redis revocation, and English/Turkish localization paths. No product source behavior was changed.

## Allowed Control-Plane Update

- `TASKS.md`: added `MR-EXPO-001` with `DONE` status and this CR reference.
- Matching CR artifact: this file under `.hiveai/codex-runs/`.
- The authoritative ChatGPT audit was not written or overwritten.
- Historical PRs and branches were not deleted or closed.

## Final Classification

`EXPO57_PATCH_ALIGNMENT_VERIFIED`

The final CR artifact commit SHA is reported in the execution result after push. The next action for ChatGPT is to independently audit this run and, if accepted, update the authoritative audit/control-plane pointers.
