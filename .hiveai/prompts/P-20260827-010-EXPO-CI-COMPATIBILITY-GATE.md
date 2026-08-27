# P-20260827-010 - Expo CI Compatibility Gate

Repository: `Sekiph82/move-in-range`
Authoritative branch: `main`
Expected Codex log: `CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/`.

## GitHub is the authoritative control plane

Before doing anything locally, read these GitHub resources in this exact order:

1. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/INDEX.md`
2. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/PROJECT_DASHBOARD.md`
3. `https://github.com/Sekiph82/move-in-range/blob/main/TASKS.md`
4. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/CURRENT.md`
5. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/CURRENT.md`
6. This prompt: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/P-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`
7. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/handoffs/LATEST.md`
8. `https://github.com/Sekiph82/move-in-range/blob/main/AGENTS.md`
9. P009 Codex log: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/codex-runs/CR-20260827-009-EXPO57-PATCH-ALIGNMENT.md`
10. P009 authoritative audit: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/A-20260827-009-EXPO57-PATCH-ALIGNMENT.md`

Only after reading the GitHub control plane may you use the local checkout for execution.

## Objective

Close the remaining independent-audit evidence gap by making GitHub CI itself verify Expo SDK compatibility on every relevant push/PR.

This is a CI hardening task only. Do not change product behavior, migrations, architecture, or dependency versions unless the new CI check reveals a real incompatibility that cannot otherwise pass. If that happens, record the blocker instead of silently expanding scope.

## Required implementation

Update `.github/workflows/ci.yml` so GitHub CI runs these compatibility checks from `apps/mobile` after `npm ci` and before final success:

1. `npx expo-doctor`
2. `npx expo install --check`

Requirements:

- both commands must be real failing gates, not informational `continue-on-error` steps;
- do not suppress exit codes;
- do not wrap them in `|| true`;
- do not weaken existing CI or Security steps;
- do not remove existing format/lint/checklist/typecheck/tests/migration/import/ruff/pytest/build coverage;
- do not modify `.github/workflows/security.yml` unless strictly necessary, and never weaken it;
- keep Node/Python versions and caches compatible with the current repository unless a real CI failure proves an adjustment is necessary.

If practical and low-risk, give the steps clear names such as `Expo Doctor` and `Expo dependency check` so ChatGPT can independently inspect them in GitHub Actions.

## Validation

Before push, run locally as applicable:

- `npm.cmd ci`
- from `apps/mobile`: `npx.cmd expo-doctor`
- from `apps/mobile`: `npx.cmd expo install --check`
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

Docker/native exports are not required solely for a CI YAML-only change unless implementation changes beyond CI configuration. If any dependency/source change becomes necessary, rerun the broader affected gates and explain why.

## GitHub acceptance gate

Push the change to `main` only if repository policy permits direct push. After push, wait for the exact final commit GitHub workflows.

Acceptance requires:

- GitHub CI = success on the exact final commit;
- GitHub CI job visibly contains and passes `Expo Doctor`;
- GitHub CI job visibly contains and passes `Expo dependency check` / `expo install --check`;
- GitHub Security = success on the exact final commit;
- no existing CI/security gate is removed or weakened.

If direct push to `main` is blocked, create the smallest possible PR containing only this CI hardening plus matching CR/control-plane evidence and merge it only after required checks pass if repository policy and current authorization allow. Do not expand scope.

## Control-plane/task update

Add or update a task such as `MR-CI-EXPO-001` with acceptance criteria that GitHub-hosted CI directly enforces Expo Doctor and Expo dependency compatibility. Mark it DONE only after the exact final GitHub CI run visibly passes both checks.

Do not create or overwrite the authoritative ChatGPT audit.

## Historical cleanup prohibition

Do not close/delete historical PRs or branches in this run. Cleanup remains a separate future task.

## Final classification

End with exactly one:

- `EXPO_CI_COMPATIBILITY_GATE_VERIFIED`
- `EXPO_CI_COMPATIBILITY_GATE_FAILED`
- `BLOCKED_BY_REPOSITORY_POLICY`

## CR log destination

Commit and push the matching Codex execution log to:

`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/codex-runs`

Exact filename:

`CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`

## Final Codex report

Record:

1. GitHub control-plane URLs read;
2. exact workflow diff;
3. exact CI step names added;
4. local Expo Doctor result;
5. local Expo dependency-check result;
6. exact final commit SHA;
7. exact GitHub CI run ID/result;
8. exact GitHub CI Expo Doctor step result;
9. exact GitHub CI Expo dependency-check step result;
10. exact GitHub Security run ID/result;
11. confirmation that no existing gate was weakened;
12. task/control-plane updates;
13. CR commit SHA/URL;
14. required final classification;
15. next ChatGPT audit action.