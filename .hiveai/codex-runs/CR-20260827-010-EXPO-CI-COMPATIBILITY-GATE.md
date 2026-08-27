# CR-20260827-010 - Expo CI Compatibility Gate

Date: 2026-08-27
Repository: https://github.com/Sekiph82/move-in-range
Authoritative branch: `main`
Execution branch: `codex/p010-ci-branch-protection`
Evidence branch: `codex/p010-evidence`

## Control-plane resources read

Read from GitHub main in the requested order:

1. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/INDEX.md
2. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/PROJECT_DASHBOARD.md
3. https://github.com/Sekiph82/move-in-range/blob/main/TASKS.md
4. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/CURRENT.md
5. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/CURRENT.md
6. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/P-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md
7. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/handoffs/LATEST.md
8. https://github.com/Sekiph82/move-in-range/blob/main/AGENTS.md
9. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/codex-runs/CR-20260827-009-EXPO57-PATCH-ALIGNMENT.md
10. https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/A-20260827-009-EXPO57-PATCH-ALIGNMENT.md
11. GitHub branch metadata was queried with `gh api repos/Sekiph82/move-in-range/branches/main` after the control-plane reads.

The INDEX and CURRENT pointers were stale relative to the explicitly selected P010 prompt; the GitHub P010 prompt and latest handoff established the active main-based execution state. No local hiveai file was treated as newer authority.

## Initial state and reconciliation

- Local checkout was clean on `main` at `8673368ec4728938285b676481b9e77ea1b80eda`.
- `git fetch origin` found authoritative `origin/main` at `1bf117ceb2e78005ec9e95e29d9327d1c9279e31`; local `main` was fast-forwarded without reset or discarded work.
- Initial GitHub API result: `protected: false`.
- Initial protection endpoint result: HTTP 404, `Branch not protected`.
- Initial exact check-run contexts on the post-P009 main commit were `validate` and `security`.

## Part A implementation

Implementation commit on `codex/p010-ci-branch-protection`: `77e786d596ae1abe76baa42704608109a33c5fac`.

Changed `.github/workflows/ci.yml` only by adding, after `npm ci` and before the existing validation gates:

```yaml
- name: Expo Doctor
  working-directory: apps/mobile
  run: npx expo-doctor
- name: Expo dependency check
  working-directory: apps/mobile
  run: npx expo install --check
```

Both are ordinary failing workflow steps. No `continue-on-error`, exit-code suppression, or existing CI/Security gate removal was introduced. `security.yml` was unchanged.

## Local validation

Passed:

- `npm.cmd ci`
- `npx.cmd expo-doctor` from `apps/mobile`: `21/21 checks passed`
- `npx.cmd expo install --check` from `apps/mobile`: `Dependencies are up to date`
- `npm.cmd run format:check`
- `npm.cmd run lint`
- `npm.cmd run checklist:check`
- `npm.cmd run typecheck`
- `npm.cmd run test`: 75 total, 65 passed, 0 failed, 10 skipped
- `npm.cmd run build`
- `npm.cmd run mobile:web:build`
- `npm.cmd audit --audit-level=high`: exit 0; 10 moderate advisories remain, no high/critical failure
- `npm.cmd run security:check`
- `ruff check services/api`
- `python -m pytest services/api/tests`: 36 collected, 34 passed, 0 failed, 2 skipped

Host-only failures and skips were not hidden:

- `npm.cmd run db:migrate` failed against the pre-existing local SQLite database because `users` already existed. This was a stale local database/schema condition, not a workflow or product change; GitHub CI migration passed against its clean PostgreSQL service.
- `npm.cmd run import:exercises -- tests/fixtures/exercises.sample.json` failed against that same stale SQLite schema because `users.auth_invalidated_at` was absent. GitHub CI import passed against clean PostgreSQL.
- Node test `Playwright live browser smoke can visit configured admin routes` skipped because `ADMIN_E2E_BASE_URL` was not set; legitimate until an admin server is started and configured.
- Node test `Playwright admin acceptance performs login, navigation, screenshots, logout, and CSRF rejection` skipped because `ADMIN_E2E_BASE_URL` was not set; legitimate until an admin server is started and configured.
- Node test `product web-compatible closed beta flow uses real mobile routes and API` skipped because `PRODUCT_E2E_API_BASE_URL` and `API_BASE_URL` were not set; legitimate external-service E2E prerequisite.
- Node test `product password reset sends an SMTP email and completes through visible reset screens` skipped because `PRODUCT_WEB_BASE_URL`, `MAILPIT_BASE_URL`, and `API_BASE_URL` were not set; legitimate email E2E prerequisite.
- Node test `product auth and route guards reject invalid, duplicate, and signed-out access` skipped because `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` were not set; legitimate deployed/local-service E2E prerequisite.
- Node test `product readiness and plans scenario uses visible controls` skipped because `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` were not set; legitimate deployed/local-service E2E prerequisite.
- Node test `product workout and feedback scenario uses visible controls` skipped because `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` were not set; legitimate deployed/local-service E2E prerequisite.
- Node test `product diabetes and calendar scenario uses visible controls` skipped because `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` were not set; legitimate deployed/local-service E2E prerequisite.
- Node test `product privacy logout and persistence scenario uses visible controls` skipped because `PRODUCT_WEB_BASE_URL` and `API_BASE_URL` were not set; legitimate deployed/local-service E2E prerequisite.
- Node test `product web UI closed beta flow uses visible controls and persisted API state` skipped because `PRODUCT_WEB_BASE_URL` was not set; legitimate deployed/local-service E2E prerequisite.
- API test `test_postgres_migrated_mvp_workflow` skipped because `TEST_DATABASE_URL` was not set in the host shell; legitimate on the host, and GitHub CI runs the PostgreSQL integration path.
- API test `test_redis_revocation_store_when_available` skipped because `REDIS_URL` was not set in the host shell; legitimate on the host, and GitHub CI provides Redis for the workflow services.

## GitHub Part A evidence

PR #14: https://github.com/Sekiph82/move-in-range/pull/14

- Exact PR head: `77e786d596ae1abe76baa42704608109a33c5fac`
- CI PR run: https://github.com/Sekiph82/move-in-range/actions/runs/33055556458, success; `validate` job passed.
- CI push run: https://github.com/Sekiph82/move-in-range/actions/runs/33055545321, success.
- `Expo Doctor` step: success.
- `Expo dependency check` step (`npx expo install --check`): success.
- Security PR run: https://github.com/Sekiph82/move-in-range/actions/runs/33055556422, success; `security` job passed.
- The PR run also visibly passed format, lint, checklist, typecheck, Node tests, PostgreSQL migration/import, ruff, pytest, and build.
- PR #14 merged by normal merge commit `558c6b38d7d11063d0b5877b4413021af480f4b3`.

Post-merge main evidence for `558c6b38d7d11063d0b5877b4413021af480f4b3`:

- CI run https://github.com/Sekiph82/move-in-range/actions/runs/33055743732: success; `validate` passed, including both Expo steps.
- Security run https://github.com/Sekiph82/move-in-range/actions/runs/33055743722: success.
- GitHub check-run contexts discovered from the exact main commit: `validate`, `security`.

## Part B branch protection

The first protection request was intentionally recorded rather than hidden. GitHub returned HTTP 422: `Only organization repositories can have users and team restrictions`, because the initial payload included empty restriction objects. It did not change protection.

The successful operation used authenticated GitHub CLI/API with the token omitted from this log:

```text
gh api repos/Sekiph82/move-in-range/branches/main/protection --method PUT --input -
```

The JSON body configured:

- required status checks: `validate`, `security`
- `strict: true`
- pull-request reviews enabled with `required_approving_review_count: 0`
- `enforce_admins: true`
- `allow_force_pushes: false`
- `allow_deletions: false`
- signed commits disabled
- linear history disabled

Independent re-fetch after the successful operation:

```json
{
  "name": "main",
  "protected": true,
  "strict": true,
  "contexts": ["validate", "security"],
  "checks": [
    {"context": "validate", "app_id": 15368},
    {"context": "security", "app_id": 15368}
  ],
  "required_approving_review_count": 0,
  "enforce_admins": true,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

GitHub reports `main` as protected. The PR path and strict exact checks are enabled. Force pushes and branch deletion are disabled. No destructive force-push/delete probe was attempted.

## Protected evidence PR

PR #15: https://github.com/Sekiph82/move-in-range/pull/15

- Evidence branch: `codex/p010-evidence`.
- Exact pre-CR evidence head: `c22b14de2f59aaa6fc13fd358873a2dd009d52fc`.
- Exact-head CI PR run: https://github.com/Sekiph82/move-in-range/actions/runs/33056070117, success; `validate` passed and visibly included successful `Expo Doctor` and `Expo dependency check` steps.
- Exact-head Security PR run: https://github.com/Sekiph82/move-in-range/actions/runs/33056070124, success; `security` passed.
- Duplicate push-triggered runs were also successful: CI `33056060017`, Security `33056060029`.
- This protected PR contains the matching CR file and final task evidence/status updates; merge result is recorded in the final report after GitHub completes the protected merge.

## Task/control-plane updates

- `MR-CI-EXPO-001`: added to `TASKS.md`, then marked `DONE` after exact PR and main CI visibly passed both Expo steps.
- `MR-BRANCH-001`: added to `TASKS.md`, then marked `DONE` after GitHub independently reported the required protected state.
- No authoritative ChatGPT audit was created or overwritten.
- No historical PR or branch was closed or deleted.
- No existing CI or Security gate was weakened.

## Final classification

`EXPO_CI_AND_MAIN_PROTECTION_VERIFIED`

## Next audit action

ChatGPT should independently audit PR #14, protected evidence PR #15, the exact main protection API response, and the resulting main CI/Security run after the evidence PR merge. The remaining host-only skips and stale local SQLite failures should remain classified as environment evidence, not silently promoted to product failures.
