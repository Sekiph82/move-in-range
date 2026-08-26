# P-20260826-006 - Final Consolidation Readiness

Repository: `Sekiph82/move-in-range`
Authoritative control branch: `codex/main-consolidation`
GitHub branch root: `https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation`
Expected Codex log on GitHub: `https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`
Authoritative ChatGPT audits: `https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

## Critical source-of-truth rule

Do not treat an existing local `.hiveai` snapshot as the authoritative control state.

The authoritative prompt, audit, task tracker, handoff, and control protocol are the versions currently committed on GitHub branch `codex/main-consolidation`.

Read GitHub first. Use the local repository only as the execution checkout after the GitHub control state is known.

If local control files disagree with GitHub, the GitHub control-plane files govern the run. Do not destroy unrelated local uncommitted work; detect and report divergence before reconciliation.

## Read from GitHub first, in this exact order

1. Control protocol:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/INDEX.md`

2. Dashboard pointer:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/PROJECT_DASHBOARD.md`

3. Canonical task ledger:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/TASKS.md`

4. Current authoritative ChatGPT audit pointer:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/audits/CURRENT.md`

5. Current prompt pointer:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/CURRENT.md`

6. This active prompt:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/P-20260826-006-FINAL-CONSOLIDATION-READINESS.md`

7. Latest handoff:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/handoffs/LATEST.md`

8. Agent instructions:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/AGENTS.md`

9. Latest GitHub CI and Security workflow evidence for `codex/main-consolidation`.

## Local execution checkout

After reading the GitHub control plane, use the local repository only to execute the work.

Before modifying anything:

- `git fetch origin`
- confirm the local repository is the expected `Sekiph82/move-in-range` repository;
- confirm the active local branch is `codex/main-consolidation`;
- compare local HEAD with `origin/codex/main-consolidation`;
- inspect `git status` for uncommitted work;
- safely reconcile before execution if needed;
- do not blindly reset or overwrite uncommitted/divergent work.

## Objective

Perform the final consolidation-readiness review now that stale E2E contracts are aligned and the high/critical dependency security gate is green.

Do not change product behavior unless a real regression is found.
Do not weaken readiness/safety behavior.
Do not merge `main` automatically.
Do not delete historical branches or close stacked PRs.

## Required work

1. Reconfirm current branch ancestry and that `codex/main-consolidation` contains the intended release-rehearsal chain plus current H!veAI control files.
2. Re-run/inspect all merge gates:
   - GitHub CI
   - GitHub Security
   - format/lint/checklist/typecheck/tests/build
   - API tests and migration lineage
   - Docker profile; if Docker Desktop is stopped, start it, run validation, then stop it only if this run started it
   - Expo Doctor
   - iOS export
   - Android export
3. Confirm exactly one Alembic head.
4. Confirm no high/critical npm advisories and record the remaining moderate-only Expo tooling advisory family without suppressing it.
5. Verify no unexpected product behavior changes came from the Expo 57 / RN 0.86 / Next 16 modernization.
6. Verify the canonical seven-step onboarding and mandatory readiness-first workout flow remain intact.
7. Review open PRs/branches and prepare the exact consolidation PR plan.
8. If all automated merge gates are green, open or update ONE reviewable consolidation PR from `codex/main-consolidation` to `main` if repository policy permits. Do not merge it.
9. Do not close/delete old stacked branches/PRs yet. Record cleanup as post-merge work only.
10. Save only the matching Codex execution log and push it to GitHub.

## Codex output destination

Create the matching log:
`CR-20260826-006-FINAL-CONSOLIDATION-READINESS.md`

Commit and push it so it is visible under:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`

The ChatGPT audit layer will read the pushed CR and GitHub evidence from there.

Do not create or overwrite files under the authoritative ChatGPT audit directory:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

Do not create or replace ChatGPT-authored prompt history except when explicitly authorized:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/prompts`

## Acceptance criteria

- GitHub CI green.
- GitHub Security green.
- zero high/critical npm advisories.
- no stale E2E failures.
- one Alembic head.
- exports/builds pass where executable.
- Docker-backed validation executed rather than skipped merely because Docker Desktop was initially stopped.
- no safety/readiness regression.
- consolidation PR is ready for human review or the exact blocker is recorded.
- matching CR log is pushed to the GitHub codex-runs directory.

## Final report

Record:

1. GitHub control files read and their branch/ref;
2. local-vs-origin synchronization state before execution;
3. branch ancestry;
4. final gate matrix;
5. security state;
6. migration state;
7. Docker/native export evidence;
8. product/safety regression review;
9. consolidation PR state;
10. remaining external/manual acceptance work;
11. implementation/log commit SHA;
12. next ChatGPT audit action.
