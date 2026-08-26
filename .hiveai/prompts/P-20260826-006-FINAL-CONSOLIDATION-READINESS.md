# P-20260826-006 - Final Consolidation Readiness

Repository: `Sekiph82/move-in-range`
Branch: `codex/main-consolidation`
Expected Codex log: `.hiveai/codex-runs/CR-20260826-006-FINAL-CONSOLIDATION-READINESS.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/`.

## Read first

- `.hiveai/INDEX.md`
- `.hiveai/PROJECT_DASHBOARD.md`
- `TASKS.md`
- `.hiveai/audits/CURRENT.md`
- `.hiveai/handoffs/LATEST.md`
- `AGENTS.md`
- latest CI/Security workflow evidence

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
   - Docker profile if local runtime is available
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
10. Save only the matching Codex run log. Do not write the authoritative ChatGPT audit.

## Acceptance criteria

- GitHub CI green.
- GitHub Security green.
- zero high/critical npm advisories.
- no stale E2E failures.
- one Alembic head.
- exports/builds pass where executable.
- no safety/readiness regression.
- consolidation PR is ready for human review or the exact blocker is recorded.

## Final report

Record:

1. branch ancestry;
2. final gate matrix;
3. security state;
4. migration state;
5. Docker/native export evidence;
6. product/safety regression review;
7. consolidation PR state;
8. remaining external/manual acceptance work;
9. commit SHA;
10. next ChatGPT audit action.
