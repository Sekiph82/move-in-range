# Stacked PR Merge Plan

Do not merge automatically. Do not retarget without manual approval. This plan models the stack only.

Current `origin/main`: `a0410a4aaf3512ee92abe9ce8fa8ef87f0dc8a07`.

| Order | PR | Current head SHA | Current base | Head branch | Retarget step | Tests after merge | Expected conflicts | Rollback point | Manual approval |
| ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | #1 | `4e54a6cdba47d5167623bdf2cc107f9c1dddd452` | `main` | `codex/initial-moveinrange-platform` | None | `npm.cmd run test`; `npm.cmd run build` | First platform merge may touch root package files | Revert PR #1 merge commit | Required |
| 2 | #2 | `a0ca7dc714505a5ba8e576cca9b473b699847956` | `codex/initial-moveinrange-platform` | `codex/functional-mobile-mvp` | Retarget to `main` after PR #1 lands | `npm.cmd run test`; `python -m pytest services/api/tests` | Mobile/API additions may overlap package lock | Revert PR #2 merge commit | Required |
| 3 | #3 | `9e87121d21b96df93be3578a37452662f4ecf5f9` | `codex/functional-mobile-mvp` | `codex/mvp-hardening` | Retarget to `main` after PR #2 lands | `npm.cmd run security:check`; `npm.cmd audit --audit-level=high`; `python -m pytest services/api/tests` | Security/env files and migrations | Revert PR #3 merge commit | Required |
| 4 | #4 | `3ef539678a4fde70922a3f89756baff3176d99b3` | `codex/mvp-hardening` | `codex/release-candidate-validation` | Retarget to `main` after PR #3 lands | Full host validation plus Docker PostgreSQL/Redis where available | Admin session and release validation files | Revert PR #4 merge commit | Required |
| 5 | #5 | `34c6eef9340c10af4d06f44ccd7e966975d88fcf` | `codex/release-candidate-validation` | `codex/complete-product-platform` | Retarget to `main` after PR #4 lands | `npm.cmd run checklist:check`; full host validation | Product platform docs, routes, migrations | Revert PR #5 merge commit | Required |
| 6 | #6 | `968a4bb182f4f5656daf5c661173e69445e94def` | `codex/complete-product-platform` | `codex/functional-product-experience` | Retarget to `main` after PR #5 lands | Product UI/browser tests; backend pytest | Product route files and shared API client | Revert PR #6 merge commit | Required |
| 7 | #7 | `c7fa93e42af55b709cf934377334049b5c520718` | `codex/functional-product-experience` | `codex/product-acceptance-completion` | Retarget to `main` after PR #6 lands | Product acceptance tests and checklist validator | E2E files and product checklist docs | Revert PR #7 merge commit | Required |
| 8 | #8 | `f0c66cb5aaf5995be43edba969b351a5963a1807` | `codex/product-acceptance-completion` | `codex/real-beta-completion` | Retarget to `main` after PR #7 lands | Real beta browser/API suite | Auth lifecycle and mobile UX files | Revert PR #8 merge commit | Required |
| 9 | #9 | `b5ffeb6d1b4ab65c04583ed48b3198feef4b50f3` | `codex/real-beta-completion` | `codex/closed-beta-readiness` | Retarget to `main` after PR #8 lands | Closed beta readiness suite | Admin mutations, Docker, product E2E | Revert PR #9 merge commit | Required |
| 10 | #10 | `657bd274f141e59cb828dc81308029469e477bf7` | `codex/closed-beta-readiness` | `codex/closed-beta-finalization` | Retarget to `main` after PR #9 lands | Docker acceptance and closed-beta final tests | Docker web/admin flows and docs | Revert PR #10 merge commit | Required |
| 11 | #11 | branch `codex/release-rehearsal`; latest pushed SHA recorded in PR | `codex/closed-beta-finalization` | `codex/release-rehearsal` | Retarget to `main` only after PR #10 lands | Full release-rehearsal suite, full PostgreSQL dataset import twice, migration rehearsal, backup/restore, Android EAS mobile-root archive/build review | RBAC migration, admin policy operation changes, EAS mobile root config, product UI E2E docs | Revert PR #11 merge commit | Required |

Required full release-rehearsal command set after PR #11 retarget:

```powershell
npm.cmd install
npm.cmd run format:check
npm.cmd run lint
npm.cmd run checklist:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run mobile:web:build
ruff check services/api
python -m pytest services/api/tests
npm.cmd run security:check
npm.cmd audit --audit-level=high
npm.cmd audit
docker compose --profile test down -v --remove-orphans
docker compose config
docker compose --profile test config
docker compose --profile test build
docker compose up -d --build
docker compose ps
docker compose --profile test run --rm tests
```

Manual approval requirements:

- Review every PR diff after retargeting.
- Confirm no duplicate Alembic heads.
- Confirm Docker compose config still uses canonical ports 5432, 6379, 1025, 8025, 3200, 3210, and 8200.
- Confirm Android installable artifact `ffa5f78e-d11b-4a42-8bf5-58e6d14e0b2f` remains accessible before native Android beta distribution.
- Confirm EAS Android build is run from `apps/mobile`, uses project ID `30719dd8-101e-4acd-8d2a-e5880d60b721`, and does not depend on a root `App.tsx`.
- Confirm dependency advisories have no high or critical findings.
