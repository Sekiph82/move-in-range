# CR-20260827-008 - PR13 Merge And Post-Merge Verify

## Scope

Executed the GitHub-authoritative P-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY prompt.
PR #13 was merged only after the final exact-head gates were green. Post-merge
validation was run against `main`. No authoritative ChatGPT audit was created
or overwritten. Historical PRs and branches were not deleted or closed.

## Control Plane And Synchronization

The GitHub control-plane resources were read in the requested order:

1. [INDEX](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/INDEX.md)
2. [PROJECT_DASHBOARD](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/PROJECT_DASHBOARD.md)
3. [TASKS](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/TASKS.md)
4. [CURRENT audit](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/audits/CURRENT.md)
5. [CURRENT prompt](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/CURRENT.md)
6. [P-20260827-008 prompt](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/P-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md)
7. [LATEST handoff](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/handoffs/LATEST.md)
8. [AGENTS](https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/AGENTS.md)
9. [PR #13](https://github.com/Sekiph82/move-in-range/pull/13)

Some GitHub HTML file views were stale during the run. Raw GitHub branch
content was used to confirm the current P008 pointer, prompt, handoff, and
agent instructions before local execution.

Repository: `Sekiph82/move-in-range`

- Initial local branch: `codex/main-consolidation`
- Remote: `https://github.com/Sekiph82/move-in-range.git`
- `git fetch origin` completed before local execution.
- Local consolidation checkout was clean and safely fast-forwarded through the
  latest control-plane commits.
- After merge, local `main` was created/switched and fast-forwarded to
  `origin/main`.
- Merge commit and final pre-log main verification SHA:
  `d18ce2a06d7dda83f6df7c03fedba119b3e61a88`

## Pre-Merge Gate And Merge

Final pre-merge PR head:
`0b4349fd34d01bf72fb37935e2509f40eaa719af`

Exact base SHA:
`ccc91af1bafbe65a99cc9913a4989adbf8b4be4b`

- PR #13: `OPEN`, non-draft, unmerged, and `MERGEABLE`.
- Exact-head CI pull-request run [33019767783](https://github.com/Sekiph82/move-in-range/actions/runs/33019767783): `success`.
- Exact-head Security pull-request run [33019767760](https://github.com/Sekiph82/move-in-range/actions/runs/33019767760): `success`.
- Exact-head Security steps passed `npm audit --audit-level=high`, repository
  security scan, and Python `pip-audit`.
- No merge conflict was reported.
- The final PR inventory contained only the intended consolidation and
  control-plane scope. No new product behavior was introduced after the
  authoritative pre-merge audit.

PR #13 was merged with the normal GitHub merge strategy, preserving the
consolidation history:

- Merge commit: `d18ce2a06d7dda83f6df7c03fedba119b3e61a88`
- Resulting `main` SHA: `d18ce2a06d7dda83f6df7c03fedba119b3e61a88`
- PR state after merge: `MERGED`
- `codex/main-consolidation` was not deleted.

## Post-Merge GitHub Evidence

Both workflows completed successfully on the merge commit:

- Main CI run [33019888249](https://github.com/Sekiph82/move-in-range/actions/runs/33019888249), job `98347387936`: `success`.
- Main Security run [33019888237](https://github.com/Sekiph82/move-in-range/actions/runs/33019888237), job `98347387956`: `success`.

Main CI passed install, format, lint, checklist, typecheck, Node tests,
Python dependency installation, migration, exercise import, Ruff, API pytest,
and build. Main Security passed high-severity npm audit, repository security
scan, and pip-audit.

## Local Host Validation On Main

Passed:

- `npm.cmd ci`
- `npm.cmd run format:check`
- `npm.cmd run lint`
- `npm.cmd run checklist:check`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run mobile:web:build`
- `npm.cmd audit --audit-level=high` (exit success; moderate-only findings)
- `npm.cmd run security:check`
- `ruff check services/api`
- `python -m pytest services/api/tests -q`: `34 passed, 2 skipped`
- `python -m alembic heads` from `services/api`: exactly one head,
  `20260719_0010`
- `npx.cmd expo export --platform ios --clear`
- `npx.cmd expo export --platform android --clear`

The root-directory attempt at `python -m alembic heads` failed because the
repository config is under `services/api/alembic.ini`; rerunning from the API
directory passed and confirmed one migration head.

Host-only skips were exact and legitimate for an unconfigured host run:

- `services/api/tests/test_postgres_integration.py`: `TEST_DATABASE_URL is not set`.
- `services/api/tests/test_redis_revocation_integration.py`:
  `REDIS_URL is not set`.

The host Node suite reported `65 passed, 10 skipped`. The ten skips were live
admin/product Playwright scenarios gated by missing `ADMIN_E2E_BASE_URL`,
`PRODUCT_E2E_API_BASE_URL`, `API_BASE_URL`, `PRODUCT_WEB_BASE_URL`, or
`MAILPIT_BASE_URL`. They were not accepted as complete until the Docker test
profile ran them with live services.

Expo Doctor result: `20/21` checks passed. The one failed check reported
patch-level Expo SDK/RN package mismatches, including Expo packages expected at
the next patch release and React Native expected at `0.86.3` while the checkout
has `0.86.2`. No dependency change was made in this merge verification.

## Docker Validation On Main

Passed:

- `docker info` after starting Docker Desktop: engine ready.
- `docker compose config -q`.
- `docker compose --profile test config -q`.
- `docker compose --profile test build`.
- `docker compose up -d --build`.
- `docker compose ps` and container health checks.
- `docker compose --profile test run --rm tests`.
- `docker compose --profile test down --remove-orphans`.

Healthy services and exposed ports during validation:

- PostgreSQL: `5432`
- Redis: `6379`
- Mailpit SMTP/UI: `1025` / `8025`
- API: `8200`
- Product web: `3210`
- Admin: `3200`

The test container passed `75/75` Node/Playwright tests with `0` skips and
`36/36` API tests. PostgreSQL integration and Redis revocation tests both
passed in Docker. The test container also passed migration, exercise import,
build, and security checks.

Runtime endpoint checks returned HTTP 200 for API `/api/v1/health`, API
`/api/v1/ready`, admin `/login`, and product web `/healthz`. Compose logs showed
successful migration completion, API startup, admin readiness, and product web
startup. Docker Desktop was started by this run and stopped after Compose
cleanup.

## Security And Residuals

- No obvious committed secrets were found by `npm.cmd run security:check`.
- Zero high/critical npm advisories remain.
- The remaining `uuid`/Expo tooling advisory family is moderate-only; the
  available forced fix would downgrade Expo and was not applied.
- Physical Android/iPhone acceptance remains external/manual.
- Real public deployment/provider validation remains external/manual.
- Historical PR/branch cleanup remains intentionally deferred.

## Product And Safety Invariants

The merged main state retained the seven-step onboarding/readiness-first
workflow, the readiness gate before new workouts, active-workout resume
behavior, session continuity, safety stop behavior, auth/RBAC protections,
PostgreSQL authority, Redis revocation, and English/Turkish localization paths.
Relevant source-contract, safety, auth, offline, API, admin, Playwright, and
integration tests passed. No merge-only product behavior change was observed.

## Allowed Control-Plane Updates

After successful merge and verification, this run updated only the allowed
control-plane state on `main`:

- `TASKS.md`: `MR-MERGE-001` moved to `DONE`; `MR-CLEAN-001` moved to `READY`.
- `.hiveai/handoffs/LATEST.md`: `main` is now authoritative.
- `.hiveai/prompts/CURRENT.md`: P008 is complete; next prompt is pending
  ChatGPT post-run audit.
- This matching CR log was added under `.hiveai/codex-runs/`.

The authoritative ChatGPT audit was not written or overwritten.

## Final Classification

`MERGED_AND_POSTMERGE_VERIFIED`

The CR artifact commit SHA and GitHub URL are reported in the final execution
result. The final main branch remains clean and no historical cleanup was
performed.
