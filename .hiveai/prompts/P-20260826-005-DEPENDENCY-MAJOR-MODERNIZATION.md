# Prompt P-20260826-005 - Dependency Major Modernization

Repository: `Sekiph82/move-in-range`
Branch: `codex/main-consolidation`
Expected Codex log: `.hiveai/codex-runs/CR-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION.md`
Authoritative post-run audit: reserved for the ChatGPT audit layer.

## Read first

- `.hiveai/INDEX.md`
- `.hiveai/PROJECT_DASHBOARD.md`
- `TASKS.md`
- `.hiveai/audits/CURRENT.md`
- `.hiveai/audits/A-20260826-004-CHATGPT-POSTRUN-AUDIT.md`
- `.hiveai/handoffs/LATEST.md`
- `AGENTS.md`
- `.github/workflows/security.yml`
- `.github/workflows/ci.yml`
- root `package.json` and `package-lock.json`
- `apps/mobile/package.json`
- `apps/admin/package.json`
- Expo/Metro configuration
- current mobile web/export scripts

## Objective

Actually finish `MR-SEC-001` by removing the remaining high-severity npm advisories through a controlled dependency modernization, while preserving the current MoveInRange product behavior and passing the full regression suite.

The current GitHub Actions baseline is authoritative for this prompt:

- `20 vulnerabilities`
- `11 moderate`
- `9 high`
- `0 critical`
- Security workflow fails at `npm audit --audit-level=high`

The remaining high chains are centered on:

- Expo / Metro / image-size
- PostCSS through Expo Metro config and Next

GitHub's audit currently points toward breaking upgrades such as Expo `57.0.16` and Next `16.3.3`. Do not apply these blindly. First determine the supported target version matrix, then migrate deliberately.

## Non-negotiable rules

- Do not weaken `.github/workflows/security.yml`.
- Do not lower `audit-level`.
- Do not add `continue-on-error` to hide the audit failure.
- Do not suppress or ignore advisories just to make CI green.
- Do not use `npm audit fix --force` as the migration method.
- Do not pin incompatible Metro internals underneath an unsupported Expo SDK.
- Do not remove security tooling.
- Do not regress seven-step onboarding.
- Do not weaken mandatory readiness before every NEW guided workout.
- Do not change canonical plan/session behavior merely to satisfy tooling.
- Do not merge to `main`.
- Do not delete historical branches or PRs.

## Phase 1 - Dependency graph audit

Before editing versions, produce a precise graph for every remaining high advisory.

Run and inspect:

- `npm audit --json`
- `npm audit --audit-level=high`
- `npm ls --all`
- `npm explain image-size`
- `npm explain postcss`
- `npm explain metro`
- `npm explain metro-config`
- `npm explain metro-transform-worker`
- `npm explain @expo/metro`
- `npm explain @expo/metro-config`
- `npm explain expo`
- `npm explain next`

Record which package owns each vulnerable transitive dependency and which supported parent upgrade removes it.

## Phase 2 - Expo modernization

Current mobile baseline includes Expo 54 and React Native 0.81.x.

Determine the current stable supported Expo target that resolves the affected Metro/image-size chain. If Expo 57 is the appropriate stable target, migrate to Expo 57 using the official Expo package compatibility rules rather than only changing the `expo` version string.

Reconcile all Expo-managed dependencies, including as applicable:

- `expo`
- `react-native`
- `react`
- `react-dom`
- `expo-router`
- `@expo/metro-runtime`
- `expo-constants`
- `expo-haptics`
- `expo-keep-awake`
- `expo-linking`
- `expo-localization`
- `expo-notifications`
- `expo-secure-store`
- `expo-speech`
- `expo-sqlite`
- `react-native-safe-area-context`
- `react-native-screens`
- `react-native-svg`
- `react-native-web`
- compatible TypeScript and React type versions

Use Expo's dependency alignment tooling where appropriate, then inspect every resulting package change before committing.

Audit:

- Expo Router route compatibility
- Metro config compatibility
- `babel.config.cjs`
- `metro.config.cjs`
- Expo web export script
- EAS configuration
- iOS/Android export behavior
- notification/speech/secure-store APIs used by MoveInRange

Do not accept a migration if Expo Doctor reports mismatches.

## Phase 3 - Next modernization

Current admin direct dependency is `next ^15.5.24`.

Determine the minimum supported secure Next target that removes the current PostCSS high advisory. If Next 16 is required, migrate deliberately and inspect breaking changes affecting this repository.

Audit and update as required:

- app router behavior
- route handlers
- cookies/session APIs
- server/client component boundaries
- build configuration
- TypeScript expectations
- Docker admin image
- admin E2E tests
- React compatibility

Do not update Next independently to a version incompatible with the repo's React/runtime constraints.

## Phase 4 - Lockfile hygiene

After explicit version selection:

1. remove stale install state as appropriate;
2. perform a clean normal install;
3. ensure `npm ci` succeeds without legacy peer workarounds;
4. inspect `package-lock.json` for the resolved versions;
5. ensure `npm ls --all` exits cleanly with no invalid peer graph.

Avoid retaining temporary overrides unless each override is proven necessary, compatible, and documented.

## Phase 5 - Security gate

The target outcome is:

`npm audit --audit-level=high` -> exit `0`

Run both:

- `npm audit`
- `npm audit --audit-level=high`

Record exact remaining vulnerability counts.

Moderate advisories may remain only if no compatible remediation exists, but every remaining advisory must be individually explained. High and critical advisories must be zero for `MR-SEC-001` to be considered satisfied.

Run Python security independently regardless of npm outcome:

- `python -m pip install pip-audit`
- `pip-audit -r services/api/requirements.txt`

If Python audit identifies vulnerabilities, remediate compatible ones in the same security task and rerun backend tests.

## Phase 6 - Full regression validation

If Docker Desktop is stopped, start it yourself, wait for the Linux engine, and use it. If this run started Docker Desktop, shut it down after cleanup.

Run at minimum:

### Host

- `npm.cmd ci`
- `npm.cmd run format:check`
- `npm.cmd run lint`
- `npm.cmd run checklist:check`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run mobile:web:build`
- `npm.cmd run security:check`
- `ruff check services/api`
- `python -m pytest services/api/tests -q`
- `npx.cmd expo-doctor`
- `npx.cmd expo export --platform ios --clear`
- `npx.cmd expo export --platform android --clear`
- `npm.cmd audit`
- `npm.cmd audit --audit-level=high`
- `pip-audit -r services/api/requirements.txt`

### Docker

- `docker compose config -q`
- `docker compose --profile test config -q`
- `docker compose --profile test build`
- `docker compose up -d --build`
- verify service health
- `docker compose --profile test run --rm tests`
- inspect Postgres/Redis/API/admin/product-web/Mailpit logs
- verify one Alembic head
- run PostgreSQL and Redis integration tests with zero service-gated skips

### Product regression

Specifically verify that dependency migration does not regress:

- seven-step onboarding
- readiness body-area isolation
- readiness required before every new guided workout
- same-session resume exception
- plan generation wizard
- Workout Preview
- Preview/Player canonical plan parity
- voice guidance
- feedback flow
- General Information / Movement Profile editors
- integrations screens
- root-tab navigation and safe-area layout

Do not mark these as passed only because TypeScript compiles. Use existing automated E2E coverage and add focused compatibility tests when migration causes framework-level changes.

## Phase 7 - GitHub Actions verification

Push the implementation to `codex/main-consolidation` and wait for the resulting GitHub Actions runs.

Inspect both:

- CI
- Security

The Security workflow must be green. A local zero-high audit is not sufficient if GitHub Actions still fails.

If the workflow fails because of a real dependency issue, continue remediation in this task. If it fails because of an environment/workflow compatibility issue introduced by the framework upgrade, fix that issue without weakening the security gate.

## H!veAI artifact rule

Codex writes only:

`.hiveai/codex-runs/CR-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION.md`

Do not write the authoritative audit.
Do not mark `MR-SEC-001` DONE yourself.
The ChatGPT audit layer will inspect the committed dependency graph and GitHub Actions evidence afterward.

## Final Codex report

Record:

1. pre-migration high-advisory graph;
2. selected Expo target and why;
3. selected Next target and why;
4. exact dependency changes;
5. framework/config/source compatibility changes;
6. final npm audit counts and exit codes;
7. Python audit result;
8. exact host test counts;
9. exact Docker test counts;
10. Expo Doctor result;
11. iOS export result;
12. Android export result;
13. GitHub CI workflow result;
14. GitHub Security workflow result;
15. remaining advisories/blockers;
16. changed files;
17. commit SHA;
18. next required ChatGPT audit action.

Do not claim `MR-SEC-001` complete unless the GitHub Security workflow is green with zero high/critical npm advisories.