# P-20260827-009 - Expo 57 Patch Alignment

Repository: `Sekiph82/move-in-range`
Authoritative branch: `main`
Expected Codex log: `CR-20260827-009-EXPO57-PATCH-ALIGNMENT.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/`.

## GitHub is the authoritative control plane

Before doing anything locally, read these GitHub resources in this exact order:

1. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/INDEX.md`
2. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/PROJECT_DASHBOARD.md`
3. `https://github.com/Sekiph82/move-in-range/blob/main/TASKS.md`
4. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/CURRENT.md`
5. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/CURRENT.md`
6. This prompt: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/P-20260827-009-EXPO57-PATCH-ALIGNMENT.md`
7. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/handoffs/LATEST.md`
8. `https://github.com/Sekiph82/move-in-range/blob/main/AGENTS.md`
9. P008 execution log: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/codex-runs/CR-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md`
10. A008 audit: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/A-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md`

Only after reading the GitHub control plane may you use the local checkout for execution.

## Objective

Repair the one real post-merge validation defect from P008: Expo Doctor reports `20/21` because the Expo SDK 57 / React Native package graph is patch-level misaligned with the current supported SDK 57 expectations.

This is a narrow compatibility-alignment task. Do not redesign product behavior, onboarding, readiness, workout flows, APIs, migrations, or architecture.

## Required work

### 1. Establish exact current mismatch

On current `main`, run from `apps/mobile`:

- `npx.cmd expo-doctor`
- `npx.cmd expo install --check`
- inspect the exact package versions Expo expects;
- inspect current `apps/mobile/package.json` and root lockfile;
- record every mismatched direct Expo/RN package before changing anything.

Do not rely only on the P008 summary. Capture the fresh exact mismatch list.

### 2. Align using Expo-supported tooling

Use Expo SDK 57 compatibility tooling, preferably `npx.cmd expo install --fix`, or explicit Expo-recommended patch versions if needed.

Constraints:

- stay on Expo SDK 57;
- do not jump to another Expo SDK;
- do not use `npm audit fix --force`;
- do not suppress Expo Doctor checks;
- do not pin incompatible versions merely to silence warnings;
- preserve React 19.2 compatibility;
- update lockfile normally;
- do not change product source unless a compatibility break caused by the supported patch alignment requires the smallest safe fix.

### 3. Required acceptance gate

After alignment, Expo Doctor must report:

`21/21 checks passed`

If it does not, do not classify the task complete. Record the exact remaining blocker.

### 4. Regression validation

Run at minimum:

- `npm.cmd ci`
- `npm.cmd run format:check`
- `npm.cmd run lint`
- `npm.cmd run checklist:check`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run mobile:web:build`
- `npm.cmd audit --audit-level=high`
- `npm.cmd run security:check`
- `ruff check services/api`
- `python -m pytest services/api/tests -q`
- `python -m alembic heads` from the correct API config location and confirm exactly one head
- `npx.cmd expo-doctor`
- `npx.cmd expo export --platform ios --clear`
- `npx.cmd expo export --platform android --clear`

### 5. Docker validation

If Docker Desktop is stopped, start it yourself and stop it afterward only if this run started it.

Run:

- `docker compose config -q`
- `docker compose --profile test config -q`
- `docker compose --profile test build`
- `docker compose up -d --build`
- `docker compose ps`
- health checks
- `docker compose --profile test run --rm tests`
- inspect migration/API/admin/product-web logs
- `docker compose --profile test down --remove-orphans`

Do not weaken or skip live E2E/integration coverage to get green.

### 6. GitHub Actions evidence

Commit the compatibility alignment to `main` if repository policy permits. If direct push is blocked, create the smallest possible PR and merge it only after required checks are green.

Wait for GitHub CI and Security on the final exact commit and record their run IDs/conclusions.

Required final GitHub gates:

- CI = success;
- Security = success;
- high/critical npm gate = success;
- repository security scan = success;
- Python pip-audit = success.

### 7. Product/safety invariants

Confirm no regression to:

- seven-step onboarding;
- readiness required before every new workout;
- same-active-workout resume exception only;
- exact plan/session identity continuity;
- safety stop behavior;
- auth/RBAC boundaries.

### 8. Task/control-plane rules

- Add/update `MR-EXPO-001` conservatively.
- Do not perform historical PR/branch cleanup in this run.
- Do not delete `codex/main-consolidation` or historical stacked branches.
- Do not close old PRs in this run.
- Do not create or overwrite the authoritative ChatGPT audit.

## Codex log destination

Write and push only the matching execution log under:

`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/codex-runs`

Exact filename:

`CR-20260827-009-EXPO57-PATCH-ALIGNMENT.md`

## Final classification

End with exactly one:

- `EXPO57_PATCH_ALIGNMENT_VERIFIED`
- `EXPO57_PATCH_ALIGNMENT_BLOCKED`

## Final report

Record:

1. GitHub control-plane resources read;
2. starting main SHA;
3. exact initial Expo Doctor / expo-install mismatch list;
4. exact dependency changes;
5. final Expo Doctor result;
6. host test/build/security results;
7. Docker live test results;
8. iOS/Android export results;
9. Alembic head;
10. final GitHub CI/Security run IDs;
11. residual moderate npm advisory state;
12. product/safety invariant review;
13. final commit SHA;
14. CR log GitHub URL;
15. one required final classification;
16. next ChatGPT audit action.
