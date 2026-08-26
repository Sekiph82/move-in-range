# Audit A-20260826-003 - ChatGPT Post-Run Audit

Audit date: `2026-08-26`
Repository: `Sekiph82/move-in-range`
Branch: `codex/main-consolidation`
Audited Codex run: `CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION`
Audited branch head: `de739f9a051338d1c0790f061d5ec8ddba0415f3`
Auditor: ChatGPT independent review layer

## Audit rule

This audit does **not** accept the Codex run's own PASS/FAIL/BLOCKED statements as authoritative proof. The Codex run and the Codex-authored `A-20260826-002...` file are treated as execution claims. This review independently inspects GitHub repository state, commit ancestry, changed files, control-system state, and source/test consistency. Runtime claims that cannot be reproduced by this audit environment remain unverified unless independently corroborated by GitHub-hosted evidence.

## Repository facts independently verified

- `codex/main-consolidation` currently points to commit `de739f9a051338d1c0790f061d5ec8ddba0415f3` with parent `c08014027d09f4a7cd4a379e16830e0c23fe32b4`.
- The audited run is a single commit over the prior H!veAI control-system state.
- The commit changes 11 files: `.dockerignore`, H!veAI audit/current/handoff/task artifacts, three mobile source files, `services/api/Dockerfile`, and `tests/product-ui-e2e.test.mjs`.
- The commit does not add database migrations.
- `services/api/Dockerfile` now runs Uvicorn with `--no-access-log`.
- `tests/product-ui-e2e.test.mjs` still contains stale 22-step onboarding expectations and stale readiness/workout interaction expectations in the current branch.
- `TASKS.md` currently marks `MR-AUDIT-001` as `DONE` based on `CR-20260826-002` and its same-run audit artifact.

## Important control-system finding

The current protocol says a Codex run log is not authoritative proof and requires an independent audit. However, run `CR-20260826-002` also rewrote its matching audit artifact in the same Codex execution and then used that artifact to advance `MR-AUDIT-001` to `DONE`.

That is not sufficiently independent for the user's intended control model.

Required permanent separation:

- **Codex** writes the `CR-...` execution log and evidence references.
- **ChatGPT audit layer** writes the authoritative `A-...` post-run audit after reviewing the Codex run.
- Codex must not self-author the final authoritative audit verdict for its own run.
- A task must not become `DONE` solely because the same Codex execution wrote both CR and A artifacts.

## Source-change review

### `.dockerignore`

Adding `.pytest-tmp` and `.uv-cache` to Docker ignore is low-risk and consistent with preventing transient local test/cache material from entering build context.

Classification: `ACCEPTABLE`.

### `services/api/Dockerfile`

Adding `--no-access-log` reduces accidental logging of query-string values. This is security-hardening, but it also removes routine request access logs entirely from the API container. Before production, structured application/request logging should provide safe request observability without sensitive query values.

Classification: `ACCEPTABLE WITH FOLLOW-UP`.

### Accessibility heading changes

The Today, onboarding, and workout-player heading semantics are small accessibility-oriented changes. No evidence from the diff indicates they alter core product logic.

Classification: `ACCEPTABLE`.

### Product E2E reset-link assertion

The reset-link matcher was broadened to accept query or fragment token form. That is reasonable only if both URL shapes are intentionally supported by the product. The change is narrow and does not weaken authentication itself.

Classification: `ACCEPTABLE WITH CONTRACT DOCUMENTATION`.

## E2E contract finding

The current product test file itself proves that several E2E expectations remain aligned to an older product contract:

- helper `expectStep()` still requires `Step <n> of 22`;
- readiness scenario still searches for `Complete readiness check`;
- workout scenario still expects direct session creation immediately after `start guided workout` instead of following the current mandatory readiness gate.

The current product requirement is the shortened seven-step onboarding and mandatory readiness-before-new-workout flow. Therefore the correct next action is to update the E2E tests to the current product contract, **not** regress the product back to 22 onboarding steps or bypass readiness.

Classification: `VERIFIED STALE TEST CONTRACTS`.

## Runtime and Docker claims

The Codex log claims successful Docker Desktop startup, healthy Compose services, Docker API tests, exports, and other runtime commands. This ChatGPT audit cannot independently execute the user's local Docker Desktop or local PowerShell environment through the GitHub connector.

No pull-request-triggered GitHub Actions evidence for this exact branch-head run is available in the evidence reviewed here.

Therefore these specific runtime claims are classified as:

`UNVERIFIED BY CHATGPT AUDIT`.

They remain useful execution evidence, but they are not treated as independently reproduced facts by this audit.

## Dependency-security claim

The Codex run reports `24 vulnerabilities (10 moderate, 14 high)`. This audit does not accept that number as independently verified because it cannot rerun `npm audit` in the user's local repository through the GitHub connector and no separate CI artifact was available for the exact audited head.

Classification: `UNVERIFIED CURRENT CLAIM`.

The security task must remain open until a separately reviewed dependency-remediation run and independent post-run audit exist.

## Task-status correction

`MR-AUDIT-001` should not be considered independently `DONE` merely from a Codex-authored CR/A pair. It should remain `REVIEW` until the external audit layer records its verdict.

`MR-VAL-001` must remain `REVIEW` because the repository still contains five stale product E2E contract failures according to the current run evidence and the test source confirms stale expectations.

`MR-CONS-001` must remain `REVIEW` and consolidation must not merge to `main` yet.

`MR-SEC-001` must remain open.

## Verdict

`REVIEW_REQUIRED`

### Independently verified

- branch head and ancestry for the audited commit;
- file-change scope;
- H!veAI task/control files exist;
- stale 22-step onboarding and old readiness/workout assumptions are present in current E2E source;
- no new database migration was introduced by the audited commit;
- Dockerfile access logging was disabled.

### Not independently verified here

- local Docker Desktop lifecycle;
- local Docker service health;
- local test counts;
- local Expo export execution;
- current npm vulnerability counts.

## Required next work

1. Enforce CR/A authorship separation in `.hiveai/INDEX.md`: Codex produces CR, ChatGPT produces authoritative A.
2. Update stale E2E contracts to the canonical seven-step onboarding and mandatory readiness-first workout flow.
3. Re-run full host + Docker validation in Codex and record only the CR evidence.
4. Perform a new ChatGPT post-run audit before advancing validation or consolidation tasks to DONE.
5. Keep dependency modernization separate from E2E contract repair; do not use force upgrades.
