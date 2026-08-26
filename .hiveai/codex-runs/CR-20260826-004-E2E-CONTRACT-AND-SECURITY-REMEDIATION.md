# Codex Run Log CR-20260826-004

- Prompt: `P-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION`
- Repository: `Sekiph82/move-in-range`
- Branch: `codex/main-consolidation`
- Starting revision: `9b5aefcd221011c7e069f3ec7e894e7676cd30a5`
- Run date: 2026-08-26
- Role: Codex execution evidence only; not the authoritative audit

## Scope and E2E alignment

The current product source was checked against the stale contracts reported by
`CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION`:

- Legacy `Step 1 of 22` expectations were aligned with the canonical seven-step onboarding flow.
- The obsolete `Complete readiness check` expectation was aligned with the current readiness entry
  points (`Open readiness check` and `Check readiness & start`).
- The direct workout-session POST assumption was aligned with the mandatory readiness-first flow;
  readiness is still required for every new guided workout.
- The static readiness route assertion was aligned with the Expo Router `(tabs)/readiness` route.
- Plan/session context is preserved through readiness, same-day readiness does not bypass a new
  workout, and only the established same-active-workout resume exception remains.

These E2E test corrections were already present in the preceding implementation commit
`7b48e30` in `tests/product-e2e.test.mjs` and `tests/product-ui-e2e.test.mjs`. This run revalidated
them without reverting or weakening product safety behavior.

## Dependency baseline and remediation

Fresh baseline commands:

- `npm audit --json`: `24 total` vulnerabilities, `14 high`, `10 moderate`, `0 critical`.
- `npm audit --audit-level=high`: exit `1`.
- `npm ls --all`: exit `0`.
- `npm audit fix --dry-run` without legacy peer resolution reported an ERESOLVE involving the
  Expo 54 `@expo/metro-runtime` peer graph. The legacy-peer dry run identified compatible changes
  without selecting a major Expo or Next upgrade.

The non-force remediation applied with `npm audit fix --legacy-peer-deps` and a direct compatible
admin dependency update was:

| Package/path | Before | After | Reason |
| --- | --- | --- | --- |
| `apps/admin` direct `next` | `^15.3.2` | `^15.5.24` | Same Next 15 line; resolves the Next 15.5.21+ advisories without a major upgrade. |
| `next` resolved package | `15.5.20` | `15.5.24` | Lockfile refresh after the direct patch-line update. |
| `nanoid` | `3.3.16` | `3.3.18` | First version outside the reported `<3.3.18` high range. |
| nested `js-yaml` | `3.15.0` | `3.15.1` | First version outside the reported `<3.15.1` high range. |
| nested `brace-expansion` 1.x | `1.1.16` | `1.1.18` | First version outside the reported `<1.1.18` high range. |
| `sharp` | `0.34.5` | `0.35.4` | First resolved version outside the reported `<0.35.0` high range; build/runtime validation passed. |

The final committed root `overrides` remain type-only overrides already present in the project. No
functional security override was retained: attempted PostCSS/Metro scoped pins were not applied by
npm and were removed rather than recording an unverified override. The final lockfile is reproducible
with regular `npm ci` (exit `0`). `npm audit fix --force` was never run.

### Remaining high advisories and blockers

Final `npm audit --json` and `npm audit --audit-level=high` results:

- `20 total`: `9 high`, `11 moderate`, `0 critical`; high gate exit `1`.
- Remaining high packages and paths are `@expo/cli`, `@expo/metro`, `@expo/metro-config`, and
  `expo` through the Expo 54 toolchain; `image-size` through Metro; `metro`, `metro-config`, and
  `metro-transform-worker` through the Expo/React Native Metro graph; and `postcss` through both
  the root Expo Metro config and Next's nested dependency.
- The audit reports the Expo-chain fix as Expo `57.0.16`, a breaking Expo major upgrade. The
  PostCSS fix is reported through Next `16.3.3`, a breaking Next major upgrade. Current Expo 54
  native dependencies and current Next 15 admin compatibility were not replaced blindly.
- `image-size` is reported vulnerable through `2.0.2`; the current audit exposes no compatible
  patched release in this graph, and its parent Metro remediation also resolves through the Expo
  57 upgrade. This is an explicit dependency-modernization blocker, not a suppressed threshold.
- The GitHub security workflow remains unchanged and still runs `npm ci`,
  `npm audit --audit-level=high`, `npm run security:check`, and `pip-audit -r services/api/requirements.txt`.

## Python security

- `python -m pip install pip-audit`: exit `0` (already installed at `2.9.0`).
- `pip-audit -r services/api/requirements.txt`: attempted twice; the advisory index request
  produced no result within the bounded local wait and was stopped. No Python dependency change was
  made. The result is `UNVERIFIED` for this local run, not a pass claim.

## Validation evidence

### Host

- `npm.cmd ci`: passed.
- `npm.cmd run format:check`: passed.
- `npm.cmd run lint`: passed; 314 files checked.
- `npm.cmd run checklist:check`: passed.
- `npm.cmd run typecheck`: passed for all workspaces.
- `npm.cmd test`: `75 total`, `65 passed`, `0 failed`, `10 skipped`.
- The ten host Node skips were legitimate live-service preconditions: two admin browser tests
  require `ADMIN_E2E_BASE_URL`; product API/UI tests require combinations of `PRODUCT_E2E_API_BASE_URL`,
  `PRODUCT_WEB_BASE_URL`, `API_BASE_URL`, and `MAILPIT_BASE_URL`. Docker executed all ten.
- `npm.cmd run build`: passed with Next `15.5.24`.
- `npm.cmd run mobile:web:build`: passed.
- `npm.cmd run security:check`: passed; no obvious committed secrets found.
- `ruff.exe check services/api`: passed.
- `python -m pytest services/api/tests -q`: `34 passed`, `0 failed`, `2 skipped`.
- The two host Python skips were legitimate service URL preconditions: PostgreSQL integration
  requires `TEST_DATABASE_URL`, and Redis revocation integration requires `REDIS_URL`. Docker
  executed both.
- `npx.cmd expo-doctor`: `18/18 checks passed`.
- `npx.cmd expo export --platform ios --clear`: passed.
- `npx.cmd expo export --platform android --clear`: passed.
- `npm.cmd audit`: exit `1`, final `20 vulnerabilities (9 high, 11 moderate)`.
- `npm.cmd audit --audit-level=high`: exit `1` for the remaining explicit Expo/Metro/image-size and
  PostCSS blockers described above.

### Docker

Docker was detected stopped with `docker info` exit `1`, started by this run, and became ready at
server version `29.5.3`.

- `docker compose config -q`: passed.
- `docker compose --profile test config -q`: passed.
- `docker compose --profile test build`: passed.
- `docker compose up -d --build`: passed.
- Runtime services were healthy: `postgres`, `redis`, `mailpit`, `api`, `admin`, and `product-web`.
- API `/api/v1/health`, API `/api/v1/ready`, admin `/login`, product web `/healthz`, and Mailpit
  `/api/v1/info` each returned HTTP `200`.
- One-shot `db-init` and `migrate` containers exited successfully.
- Corrected Alembic command, `docker compose exec -T api sh -lc 'cd /app/services/api && python
  -m alembic heads'`, returned exactly one head: `20260719_0010`.
- `docker compose --profile test run --rm tests`: Node suite `75 passed`, `0 failed`, `0 skipped`;
  API suite `36 passed`, `0 failed`, `0 skipped`; PostgreSQL and Redis integration paths both ran.
  Format, lint, checklist, typecheck, migrations, exercise import, workspace build, and security
  scan passed. The aggregate container exited `1` only at the final npm audit gate for the nine
  remaining high advisories.
- `docker compose logs --no-color --tail=100 postgres redis mailpit api admin product-web`: normal
  startup/readiness output only; no service errors observed.
- `docker compose --profile test down --remove-orphans`: passed.
- Docker Desktop was stopped after validation because this run started it. Final `docker info` exit
  was `1`.

## Changed files

Files changed by this P004 run:

- `apps/admin/package.json`
- `package-lock.json`
- `.hiveai/codex-runs/CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION.md`

The preceding E2E implementation remains in `tests/product-e2e.test.mjs` and
`tests/product-ui-e2e.test.mjs` from commit `7b48e30`; no product safety source was changed in this
run. No authoritative audit, current pointer, dashboard, task ledger, or handoff file was written.

## Status and next action

- E2E contract acceptance is satisfied by source alignment and zero Docker stale-contract failures.
- Security acceptance is partially satisfied: all safely removable high advisories were reduced,
  but the npm high gate remains blocked by major Expo/Next upgrade requirements, and the local
  Python audit is unverified because the advisory index did not respond within the bounded wait.
- This CR does not claim consolidation or merge readiness.
- Next action: the separate ChatGPT audit layer must inspect this CR and current GitHub state, classify
  the local runtime and Python evidence independently, and write the authoritative post-run audit.
