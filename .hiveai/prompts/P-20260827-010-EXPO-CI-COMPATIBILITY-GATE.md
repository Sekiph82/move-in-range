# P-20260827-010 - Expo CI Compatibility Gate + Main Branch Protection

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
11. Current main branch metadata/protection state from GitHub API, including `https://api.github.com/repos/Sekiph82/move-in-range/branches/main`.

Only after reading the GitHub control plane may you use the local checkout for execution.

## Objectives

This run has two tightly related repository-governance objectives:

1. Close the remaining independent-audit evidence gap by making GitHub CI itself verify Expo SDK compatibility on every relevant push/PR.
2. Remove the GitHub warning that `main` is unprotected by enabling real branch protection on `main` after the CI check names and final workflow behavior are known.

Do not change product behavior, migrations, architecture, or dependency versions unless the new CI check reveals a real incompatibility that cannot otherwise pass. If that happens, record the blocker instead of silently expanding scope.

## Part A - Expo CI compatibility gate

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
- keep Node/Python versions and caches compatible with the current repository unless a real CI failure proves an adjustment is necessary;
- give the steps clear names, preferably `Expo Doctor` and `Expo dependency check`, so ChatGPT can independently inspect them in GitHub Actions.

## Part B - Protect GitHub main

GitHub currently reports `main` as unprotected. Fix this in the same controlled run.

Do not merely document the warning. Actually configure GitHub branch protection using the authenticated GitHub CLI/API available to the execution environment, if permissions allow.

### Required protection intent

Protect `main` so that:

- force pushes are disabled;
- branch deletion is disabled;
- changes to `main` go through a pull request rather than ordinary direct pushes;
- no human approval count is required solely for our workflow, so a fully-green PR can still be merged without asking the maintainer to manually review every automation/control-plane update;
- required status checks must pass before merge;
- required status checks are strict/up-to-date with `main` before merge;
- the required checks include the actual current GitHub check contexts for the CI validate job and Security job;
- do not guess status-check context names. Read the exact check runs/status contexts produced by GitHub after Part A and configure those exact identifiers;
- administrators should not silently bypass the protections during normal operation. Prefer enforcing the protection for administrators if the repository/account plan and API support it without making the repository unusable;
- do not enable force pushes or deletion for any actor;
- do not require signed commits unless separately approved;
- do not require linear history if that would conflict with the repository's accepted merge-commit history;
- do not enable rules that would force a manual approval from the maintainer for every Codex/ChatGPT control-plane PR.

A suitable end state is: PR required, 0 required approving reviews, CI + Security required and strict, force-push disabled, deletion disabled.

### Safe ordering

Because enabling branch protection will change how future writes to `main` are allowed, use a safe sequence:

1. Implement the CI workflow change on a dedicated short-lived branch such as `codex/p010-ci-branch-protection` rather than assuming future direct pushes to `main` remain allowed.
2. Open a minimal PR to `main` containing the CI hardening and any task/control-plane changes needed before protection.
3. Wait for the PR's exact-head CI and Security checks and confirm the new Expo steps visibly pass.
4. Merge that PR only when all required checks are green. The maintainer has already authorized this bounded repository-governance change; do not stop for an additional manual review if the checks are green.
5. After the CI workflow is on `main`, inspect the exact GitHub check-run names/contexts on the resulting main commit.
6. Apply `main` branch protection using GitHub CLI/API with those exact required checks.
7. Fetch the branch/protection API again and record the resulting protection configuration.
8. Verify that GitHub reports `main` as protected and that force-push/deletion are disabled.
9. After protection is enabled, do not bypass it with an ordinary direct push.

If repository plan/API limitations prevent one requested branch-protection feature, configure every available safe protection, record the exact limitation/error, and classify the unmet portion explicitly. Do not pretend the warning is resolved unless GitHub reports `main` as protected.

## Validation before publishing Part A

Run locally as applicable:

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

Docker/native exports are not required solely for a CI YAML + GitHub settings change unless implementation changes beyond CI/repository configuration. If any dependency/source change becomes necessary, rerun the broader affected gates and explain why.

## GitHub acceptance gates

### Expo CI gate acceptance

Acceptance requires:

- exact PR-head GitHub CI = success;
- GitHub CI job visibly contains and passes `Expo Doctor`;
- GitHub CI job visibly contains and passes `Expo dependency check` / `expo install --check`;
- exact PR-head GitHub Security = success;
- resulting `main` CI = success after merge;
- resulting `main` Security = success after merge;
- no existing CI/security gate is removed or weakened.

### Main branch protection acceptance

Acceptance requires independently inspectable GitHub evidence that:

- GitHub reports `main` as `protected: true`;
- required status checks are enabled and strict;
- the exact CI and Security contexts are required;
- pull-request-based changes are required for normal updates to `main`;
- required approving review count is 0 unless GitHub requires a different minimum;
- force pushes are disabled;
- branch deletion is disabled;
- protection was not achieved by weakening/removing CI or Security.

After protection is enabled, test it non-destructively where practical by inspecting API state and/or attempting a harmless dry-run/permission-safe verification. Do not force push or attempt branch deletion merely to prove they are blocked.

## Control-plane/task update

Add/update these canonical tasks in `TASKS.md`:

### `MR-CI-EXPO-001`
Acceptance: GitHub-hosted CI directly enforces Expo Doctor and Expo dependency compatibility. Mark DONE only after the exact GitHub CI evidence visibly passes both checks.

### `MR-BRANCH-001`
Title: Protect `main` with PR and required CI/Security gates.
Priority: P0.
Acceptance: GitHub reports `main` protected; strict required CI/Security checks configured; PR path required; force push/deletion disabled; no unnecessary manual-review requirement added; final state separately audited by ChatGPT.

Do not create or overwrite the authoritative ChatGPT audit.

## CR/log strategy after main is protected

The matching Codex run log must end up in authoritative `main` under:

`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/codex-runs`

Exact filename:

`CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`

Once main protection is active, do not bypass it to push the CR/control-plane evidence directly.

If the final CR file or final control-plane evidence cannot be included in the first PR because it depends on post-merge/protection results, create a second tiny evidence-only branch/PR containing only:

- the matching CR log;
- conservative `TASKS.md` evidence/status updates;
- allowed handoff/pointer updates if needed.

Wait for required checks and merge that evidence-only PR through the now-protected workflow. The maintainer has already authorized this bounded P010 execution, so no additional manual review is required if required checks pass.

Do not leave the authoritative CR only on a side branch.

## Historical cleanup prohibition

Do not close/delete historical PRs or branches in this run. Cleanup remains a separate future task.

## Final classification

End with exactly one:

- `EXPO_CI_AND_MAIN_PROTECTION_VERIFIED`
- `EXPO_CI_VERIFIED_BRANCH_PROTECTION_BLOCKED`
- `EXPO_CI_COMPATIBILITY_GATE_FAILED`
- `BLOCKED_BY_REPOSITORY_POLICY`

## Final Codex report

Record:

1. GitHub control-plane URLs read;
2. initial main protection state;
3. exact workflow diff;
4. exact CI step names added;
5. local Expo Doctor result;
6. local Expo dependency-check result;
7. Part A branch/PR number and exact head SHA;
8. exact PR-head GitHub CI run ID/result;
9. exact PR-head Expo Doctor step result;
10. exact PR-head Expo dependency-check step result;
11. exact PR-head GitHub Security run ID/result;
12. merge commit/resulting main SHA for Part A;
13. exact status-check contexts discovered from GitHub;
14. exact branch-protection API/CLI operation used, with secrets/tokens redacted;
15. final GitHub branch-protection state;
16. confirmation force-push/deletion are disabled;
17. confirmation PR path and strict required checks are enabled;
18. resulting main CI/Security run IDs/results;
19. task/control-plane updates;
20. CR commit/PR/merge evidence and final GitHub URL;
21. confirmation no existing CI/Security gate was weakened;
22. required final classification;
23. next ChatGPT audit action.