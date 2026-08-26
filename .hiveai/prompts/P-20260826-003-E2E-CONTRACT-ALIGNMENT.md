# Prompt P-20260826-003 - E2E Contract Alignment

Repository: `Sekiph82/move-in-range`
Branch: `codex/main-consolidation`
Expected Codex log: `.hiveai/codex-runs/CR-20260826-003-E2E-CONTRACT-ALIGNMENT.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/A-20260826-003-E2E-CONTRACT-ALIGNMENT.md` or the next audit ID chosen by the audit layer.

## Read first

- `.hiveai/INDEX.md`
- `.hiveai/PROJECT_DASHBOARD.md`
- `TASKS.md`
- `.hiveai/audits/CURRENT.md`
- `.hiveai/handoffs/LATEST.md`
- `AGENTS.md`
- current onboarding/readiness/workout source
- current failing E2E tests

## Objective

Align stale product E2E contracts with the current canonical MoveInRange product behavior. Do **not** regress the product to obsolete behavior merely to satisfy old tests.

Canonical product rules for this task:

1. First-run onboarding is the current shortened 7-step flow, not the legacy 22-step flow.
2. Every NEW guided workout requires readiness before session start.
3. The exact selected plan/session context must survive readiness and reach the player.
4. Existing same-day readiness must not automatically bypass readiness for a new workout.
5. Resuming the same still-active workout may skip readiness only under the established resume exception.
6. Current visible button labels and route shapes should be tested semantically rather than by brittle obsolete implementation details.

## Required work

Audit each of the five Docker Node failures reported in `CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md` against the current product source.

Fix tests when the product is already correct. Fix product code only when a test reveals a real product defect.

At minimum address:

- `Step 1 of 22` expectations -> current 7-step onboarding contract.
- obsolete `Complete readiness check` expectation -> current visible readiness entry point.
- direct workout session POST expectation -> current mandatory readiness-first flow.
- stale static readiness route-shape assertion -> current Expo Router implementation.

Prefer stable accessibility roles, labels, route outcomes, and API side effects over fragile source-text matching.

Do not weaken safety/readiness requirements.
Do not remove tests just to make the suite green.
Do not mark a failing scenario skipped unless a genuine external prerequisite exists.
Do not change onboarding back to 22 steps.
Do not bypass readiness to satisfy E2E timing.
Do not merge to `main`.
Do not close or delete historical branches/PRs.

## Validation

If Docker Desktop is stopped, start it yourself, wait for the Linux engine, and run the full Docker-backed validation. If this run started Docker Desktop, shut it down after cleanup.

Run applicable checks including:

- `docker compose config -q`
- `docker compose --profile test config -q`
- `docker compose --profile test build`
- `docker compose up -d --build`
- `docker compose --profile test run --rm tests`
- host format/lint/checklist/typecheck/tests/build/mobile-web checks
- backend ruff/pytest
- Expo Doctor
- iOS export
- Android export
- security scan

Record exact test counts and any remaining failures in the Codex run log.

Dependency modernization is **not** part of this prompt. Record the current audit result if encountered, but do not use `npm audit fix --force` and do not perform a major Expo/Next upgrade here.

## H!veAI artifact rule

Codex writes only the execution log for this task:

`.hiveai/codex-runs/CR-20260826-003-E2E-CONTRACT-ALIGNMENT.md`

Codex may update task evidence/status conservatively, but must not create or overwrite the authoritative ChatGPT post-run audit for its own work.

Do not mark merge readiness DONE. Final task advancement is subject to the separate ChatGPT audit layer.

## Final Codex report

Record:

1. each stale E2E contract found;
2. whether test or product source was changed and why;
3. exact changed files;
4. Docker lifecycle;
5. exact host/Docker test counts;
6. remaining failures/skips;
7. dependency audit result only as an execution claim;
8. commit SHA;
9. next required audit action.
