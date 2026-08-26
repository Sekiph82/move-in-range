# Prompt P-20260826-004 - E2E Contract + Security Remediation

Repository: `Sekiph82/move-in-range`
Branch: `codex/main-consolidation`
Expected Codex log: `.hiveai/codex-runs/CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/A-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION.md` or the next audit ID chosen by the audit layer.

## Read first

- `.hiveai/INDEX.md`
- `.hiveai/PROJECT_DASHBOARD.md`
- `TASKS.md`
- `.hiveai/audits/CURRENT.md`
- `.hiveai/handoffs/LATEST.md`
- `AGENTS.md`
- current onboarding/readiness/workout source
- current failing E2E tests
- `.github/workflows/security.yml`
- `package.json`
- `package-lock.json`
- all workspace `package.json` files
- `services/api/requirements.txt`
- current dependency/security review docs

## Objective

Complete two P0/P1 blockers in one controlled remediation run:

1. Align stale E2E contracts with the current canonical MoveInRange product behavior.
2. Execute MR-SEC-001 for real: identify and remediate the current high-severity npm dependency advisories without blindly forcing breaking upgrades.

Do not regress the product to obsolete behavior merely to satisfy old tests. Do not silence the security gate by weakening or removing it.

## Canonical product rules

1. First-run onboarding is the current shortened 7-step flow, not the legacy 22-step flow.
2. Every NEW guided workout requires readiness before session start.
3. Exact selected plan/session context must survive readiness and reach the player.
4. Existing same-day readiness must not automatically bypass readiness for a new workout.
5. Resuming the same still-active workout may skip readiness only under the established resume exception.
6. Tests should prefer stable accessibility roles, labels, route outcomes, and API side effects over brittle source-text matching.

## Part A - E2E contract alignment

Audit each stale Docker Node failure reported in `CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md` against current source.

At minimum address:

- `Step 1 of 22` -> current 7-step onboarding contract.
- obsolete `Complete readiness check` expectation -> current readiness entry point.
- direct workout session POST assumption -> current mandatory readiness-first flow.
- stale static readiness route-shape assertion -> current Expo Router implementation.

Fix tests when product behavior is already correct. Fix product code only when a test reveals a real defect.

Do not remove tests merely to get green.
Do not mark these scenarios skipped unless a genuine external prerequisite exists.
Do not change onboarding back to 22 steps.
Do not bypass readiness.

## Part B - MR-SEC-001 dependency remediation

Treat this as a real dependency modernization task, not just an audit report.

First establish a fresh authoritative baseline by running:

- `npm audit --json`
- `npm audit --audit-level=high`
- `npm ls --all`

Identify every high advisory path, direct owner package, transitive chain, patched version range, and whether remediation is available through:

- patch/minor direct dependency update
- compatible workspace dependency update
- package-lock refresh
- npm overrides/resolutions where technically safe
- transitive parent update
- Next.js patch/minor update
- Expo SDK-compatible patch/minor package alignment

Do not run `npm audit fix --force`.
Do not blindly upgrade Expo to a new major SDK.
Do not blindly upgrade Next across a breaking major.
Do not suppress advisories by changing CI thresholds.
Do not remove `npm audit --audit-level=high` from the Security workflow.

For each high advisory, document:

- advisory/package
- dependency path
- current version
- first patched version
- chosen remediation
- compatibility risk
- validation performed

Prefer the smallest compatible upgrade set that makes the HIGH gate pass.

If a high advisory cannot be removed without a breaking major upgrade, prove that with the current dependency graph and document the exact blocker. In that case, reduce all safely removable high advisories and leave only genuinely incompatible blockers.

Check whether `overrides` in root `package.json` can safely pin vulnerable transitive dependencies without violating peer/runtime constraints. Validate any override with install, typecheck, builds, Expo Doctor, exports, and Docker tests.

Python security is also in scope for verification:

- `python -m pip install pip-audit`
- `pip-audit -r services/api/requirements.txt`

If Python advisories are present, remediate compatible patches/minors and rerun backend tests.

## Security workflow rule

Keep `.github/workflows/security.yml` active.

It must continue to run at least:

- `npm ci`
- `npm audit --audit-level=high`
- `npm run security:check`
- `pip-audit -r services/api/requirements.txt`

Do not weaken the workflow to make GitHub green.

## Docker lifecycle

If Docker Desktop is stopped:

1. detect that state with `docker info`;
2. start Docker Desktop yourself;
3. wait for the Linux engine within a bounded window;
4. run the full Docker-backed validation;
5. clean repository containers;
6. stop Docker Desktop only if this run started it.

A stopped Docker engine is not itself a blocker.

## Required validation

Run all applicable checks after remediation:

- `npm.cmd install` or `npm ci` as appropriate
- `npm.cmd run format:check`
- `npm.cmd run lint`
- `npm.cmd run checklist:check`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run mobile:web:build`
- `npm.cmd run security:check`
- `npm.cmd audit`
- `npm.cmd audit --audit-level=high`
- `ruff check services/api`
- `python -m pytest services/api/tests -q`
- `python -m pip install pip-audit`
- `pip-audit -r services/api/requirements.txt`
- `npx.cmd expo-doctor`
- `npx.cmd expo export --platform ios --clear`
- `npx.cmd expo export --platform android --clear`
- `docker compose config -q`
- `docker compose --profile test config -q`
- `docker compose --profile test build`
- `docker compose up -d --build`
- `docker compose --profile test run --rm tests`

Verify PostgreSQL/Redis integration paths run in Docker with zero environment skips.

Inspect Alembic heads and confirm exactly one head remains.

## Acceptance criteria

MR-E2E-001 may advance only if:

- stale 22-step expectations are gone;
- readiness-first workout flow is represented correctly;
- full Docker Node suite has zero stale-contract failures;
- no safety behavior is weakened.

MR-SEC-001 may advance only if:

- a fresh dependency baseline is recorded;
- all safely remediable high advisories are actually remediated;
- `npm audit --audit-level=high` exits 0, OR any remaining high advisory is proven to require an explicitly breaking upgrade that is not safe in this run;
- no security workflow threshold is weakened;
- builds, Expo Doctor, iOS/Android export, Docker tests, and relevant host tests remain green after dependency changes;
- Python dependency audit is run and any compatible fixes are applied.

Do not claim consolidation is merge-ready unless both the E2E and security gates are genuinely green. Final advancement still requires the separate ChatGPT audit layer.

## H!veAI artifact rule

Codex writes only the execution log:

`.hiveai/codex-runs/CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION.md`

Codex may conservatively update `TASKS.md` evidence/status, but must not create or overwrite the authoritative ChatGPT post-run audit.

Do not merge `main`.
Do not close or delete historical branches/PRs.

## Final Codex report

Record:

1. each stale E2E contract and its fix;
2. each high npm advisory and dependency path;
3. exact dependency version changes and why;
4. whether overrides were used and why they are safe;
5. Python audit result and any fixes;
6. exact changed files;
7. Docker lifecycle;
8. exact host/Docker test counts;
9. exact `npm audit` and `npm audit --audit-level=high` results;
10. Expo Doctor and iOS/Android export results;
11. remaining failures/skips/blockers;
12. commit SHA;
13. next required ChatGPT audit action.
