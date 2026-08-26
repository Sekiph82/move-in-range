# P-20260827-007 - PR13 Human Merge Handoff

Repository: `Sekiph82/move-in-range`
Authoritative branch: `codex/main-consolidation`
Target PR: `#13 codex/main-consolidation -> main`
Expected Codex log: `.hiveai/codex-runs/CR-20260827-007-PR13-HUMAN-MERGE-HANDOFF.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/`.

## GitHub is the authoritative control plane

Do not treat the local `.hiveai` snapshot as authoritative over GitHub.

Before doing anything locally, read these GitHub resources in this exact order:

1. Control index
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/INDEX.md`

2. Dashboard pointer manifest
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/PROJECT_DASHBOARD.md`

3. Canonical task tracker
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/TASKS.md`

4. Current authoritative audit pointer
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/audits/CURRENT.md`

5. Active prompt pointer
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/CURRENT.md`

6. This exact active prompt
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/P-20260827-007-PR13-HUMAN-MERGE-HANDOFF.md`

7. Latest handoff
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/handoffs/LATEST.md`

8. Agent instructions
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/AGENTS.md`

9. Target PR
`https://github.com/Sekiph82/move-in-range/pull/13`

10. Authoritative audit history directory
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

11. Codex execution history directory
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`

Only after reading the GitHub control plane may you use the local checkout for inspection or command execution.

## Objective

Prepare the final human merge handoff for PR #13.

This is a **freeze-and-review** task, not a feature-development task.

Do not change product behavior.
Do not change migrations.
Do not change dependency versions unless a newly discovered critical defect makes the PR unsafe and you record the blocker instead of silently modifying the branch.
Do not merge `main`.
Do not close or delete historical stacked PRs/branches.
Do not author the authoritative ChatGPT audit.

## Required work

### 1. Synchronize safely

- `git fetch origin`.
- Confirm local repository remote is `Sekiph82/move-in-range`.
- Confirm the execution branch is `codex/main-consolidation`.
- Compare local HEAD with `origin/codex/main-consolidation`.
- Preserve any uncommitted user work. Never blindly reset or destroy local changes.
- Fast-forward only when safe.

### 2. Re-read PR #13 from GitHub

Confirm and record:

- PR number and URL;
- state;
- draft status;
- base branch and exact base SHA;
- head branch and exact head SHA;
- mergeability;
- whether it is already merged;
- commit count;
- changed-file count;
- latest review/comment state if visible.

If PR #13 is already merged, do **not** perform the pre-merge handoff. Record that state and stop so the next prompt can be post-merge validation.

### 3. Reconfirm exact GitHub merge gates

Inspect the latest CI and Security workflows for the **current exact PR head SHA**, not an older commit.

Required merge gates:

- GitHub CI = success;
- GitHub Security = success;
- `npm audit --audit-level=high` = success;
- repository security scan = success;
- Python `pip-audit` = success.

Do not copy old CR PASS claims as proof. GitHub workflow evidence is authoritative for these gates.

If any required check is pending or failing, mark the handoff `NOT READY` and record the exact run/check blocker.

### 4. Review consolidation boundaries

Inspect PR #13 changed-file inventory and confirm there is no second competing consolidation PR or unexpected late product-development scope.

Specifically verify that the PR contains the intended categories:

- H!veAI control plane and history;
- mobile/admin/API implementation;
- migrations;
- tests;
- CI/Security workflows;
- Expo 57 / RN 0.86 / Next 16 modernization;
- release/documentation artifacts.

Flag any clearly unexpected files or scope additions introduced after authoritative audit `A-20260826-006-FINAL-CONSOLIDATION-READINESS.md`.

### 5. Reconfirm known residuals without converting them into false blockers

Record separately:

- remaining moderate-only Expo tooling/uuid npm advisory family;
- physical Android/iPhone acceptance still external;
- real public deployment/provider acceptance still external;
- historical stacked PR/branch cleanup still post-merge only.

Do not claim those are completed.
Do not reopen the cleared high/critical dependency gate merely because moderate-only tooling advisories remain.

### 6. Produce the human merge recommendation

End with exactly one of these classifications:

- `READY_FOR_EXPLICIT_HUMAN_MERGE_APPROVAL`
- `NOT_READY_FOR_MERGE`
- `ALREADY_MERGED_POSTMERGE_PROMPT_REQUIRED`

If ready, provide a concise human-review summary containing:

- PR URL;
- exact head SHA;
- exact base SHA;
- CI run/result;
- Security run/result;
- mergeability;
- residual risks;
- statement that Codex did not merge.

### 7. H!veAI artifact rule

Codex writes only the matching execution log:

`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`

Exact filename:

`CR-20260827-007-PR13-HUMAN-MERGE-HANDOFF.md`

Commit and push that CR log to `codex/main-consolidation` so ChatGPT can independently audit it from GitHub.

Do not create or overwrite files under the authoritative ChatGPT audit directory:

`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

Do not merge PR #13.
Do not delete or close PRs/branches.

## Final Codex report

Record:

1. GitHub files/control-plane URLs read;
2. local synchronization state;
3. exact PR #13 metadata;
4. exact current PR head/base SHAs;
5. current CI/Security workflow IDs and conclusions;
6. changed-file/scope review;
7. residual risks;
8. one of the three required final classifications;
9. CR commit SHA;
10. next ChatGPT audit action.
