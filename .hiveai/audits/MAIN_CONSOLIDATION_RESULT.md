# Main Consolidation Result

Run: `CR-20260826-001`
Date: 2026-08-26
Branch: `codex/main-consolidation`
Base: `origin/main` at `ccc91af`
Integrated branch: `origin/codex/release-rehearsal` at `26ec74e`
Merge commit: `1acca94`
Pushed control-system commit: `0decf16`

## Branches and PRs Inspected

Inspected `origin/main`, all 11 `origin/codex/*` branches, and `origin/hiveai/project-dashboard-v1`; 13 remote branches are present in total. Inspected GitHub PRs #1 through #12. PRs #1-#11 remain open draft stacked PRs; PR #12 (`hiveai/project-dashboard-v1 -> main`) is merged. No PR was closed or retargeted.

## Ancestry and Unique Content

All feature branches share common base `a0410a4`. PRs #2-#11 contain their immediate parent branch. The release chain contains 52 unique feature/release commits over the old base, grouped in detail in `BRANCH_CONSOLIDATION_AUDIT.md`. Current main contributes one independent manifest commit, `ccc91af`.

The consolidation branch is `origin/main` plus a no-conflict merge of `origin/codex/release-rehearsal`. All intended release-rehearsal files and commits are contained, and the main dashboard manifest is retained and updated to point to `TASKS.md` and the H!veAI control sources.

## Conflicts and Resolutions

Three-way simulation and the actual `ort` merge reported no conflicts. No manual file resolution was necessary. The only consolidation-specific source update after the merge is the H!veAI pointer manifest; the mobile Expo and lockfile patch update was applied after Expo Doctor identified two compatible patch mismatches.

## Validation

| check | result | evidence or blocker |
| --- | --- | --- |
| `npm.cmd run format:check` | PASS | repository format check passed |
| `npm.cmd run lint` | PASS | 313 files checked |
| `npm.cmd run checklist:check` | PASS | complete product checklists closed/evidence-backed |
| `npm.cmd run typecheck` | PASS | admin, mobile, and all shared packages |
| `npm.cmd test` | PASS WITH SKIPS | 75 total, 65 passed, 0 failed, 10 skipped by missing live service URLs |
| `npm.cmd run build` | PASS | Next admin production build, 21 routes |
| `npm.cmd run mobile:web:build` | PASS | Expo web export completed |
| `ruff check services/api` | PASS | no findings |
| `python -m pytest services/api/tests -q` | PASS WITH SKIPS | 34 passed, 2 skipped, 63 warnings |
| `npm.cmd run security:check` | PASS | no obvious committed secrets |
| `npm.cmd audit --audit-level=high` | BLOCKED | current graph reports 14 high and 10 moderate; force fix proposes breaking Expo upgrade |
| `npx.cmd expo-doctor` | PASS | 18/18 after Expo patch update |
| iOS export | PASS | `npx.cmd expo export --platform ios --clear` |
| Android export | PASS | `npx.cmd expo export --platform android --clear` |
| `npm.cmd run db:migrate` | PASS (clean temp SQLite) | existing local SQLite has prior schema; clean temp database reached head |
| Alembic heads | PASS | exactly one head: `20260719_0010` |
| `docker compose config` | PASS | base and test profile configs render |
| Docker build/up/ps/logs | BLOCKED | Docker CLI cannot connect to `desktop-linux` engine pipe |

## Remaining Skips and Exact Conditions

Node live tests skip because their environment-gated URLs are unset:

- `tests/browser-e2e.test.mjs`: two admin browser tests require `ADMIN_E2E_BASE_URL` and a running admin server.
- `tests/product-e2e.test.mjs`: product API flow requires `PRODUCT_E2E_API_BASE_URL` or `API_BASE_URL`.
- `tests/product-ui-e2e.test.mjs`: password reset requires `PRODUCT_WEB_BASE_URL`, `MAILPIT_BASE_URL`, and `API_BASE_URL`; auth, readiness/plans, workout/feedback, diabetes/calendar, and privacy scenarios require `PRODUCT_WEB_BASE_URL` and `API_BASE_URL`; the full browser flow requires `PRODUCT_WEB_BASE_URL`.

Python integration skips are legitimate environment gates:

- `services/api/tests/test_postgres_integration.py::test_postgres_migrated_mvp_workflow` requires `TEST_DATABASE_URL` beginning with `postgresql`.
- `services/api/tests/test_redis_revocation_integration.py::test_redis_revocation_store_when_available` requires `REDIS_URL` and a reachable Redis service.

These tests require the Docker test profile or equivalent reachable services. They were not silently converted to passes.

## Files Added, Modified, Removed

Added: `TASKS.md`; `.hiveai/INDEX.md`; `.hiveai/PROJECT_DASHBOARD.md` update is tracked as a modification; `.hiveai/prompts/CURRENT.md`; `.hiveai/audits/CURRENT.md`; `.hiveai/audits/BRANCH_CONSOLIDATION_AUDIT.md`; `.hiveai/audits/MAIN_CONSOLIDATION_RESULT.md`; `.hiveai/handoffs/LATEST.md`; `.hiveai/decisions/DECISIONS.md`; `.hiveai/codex-runs/README.md`.

Modified: `.hiveai/PROJECT_DASHBOARD.md`, `apps/mobile/package.json`, and `package-lock.json`. No product source, database migration, or deployment behavior was changed by the control-system work. No files were removed.

## Residual Risk and Decision

The branch is structurally consolidated and host-validated but is not fully green because Docker-dependent tests were unavailable and the dependency audit has high findings. The branch was pushed as `origin/codex/main-consolidation` at `0decf16`; no automatic merge was performed and no consolidation PR was opened in this run. Open the one consolidation PR only after those gates are rerun and resolved; preserve all stacked branches and PRs meanwhile.
