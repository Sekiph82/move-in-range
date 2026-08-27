# P-20260827-011 - Post-Consolidation Cleanup

Repository: `Sekiph82/move-in-range`
Authoritative branch: `main`
Expected Codex log: `CR-20260827-011-POST-CONSOLIDATION-CLEANUP.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/`.

## GitHub is the authoritative control plane

Before doing anything locally, read these GitHub resources in this exact order:

1. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/INDEX.md`
2. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/PROJECT_DASHBOARD.md`
3. `https://github.com/Sekiph82/move-in-range/blob/main/TASKS.md`
4. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/CURRENT.md`
5. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/CURRENT.md`
6. This prompt: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/P-20260827-011-POST-CONSOLIDATION-CLEANUP.md`
7. `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/handoffs/LATEST.md`
8. `https://github.com/Sekiph82/move-in-range/blob/main/AGENTS.md`
9. P010 Codex log: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/codex-runs/CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`
10. P010 authoritative audit: `https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/A-20260827-010-EXPO-CI-AND-MAIN-PROTECTION.md`
11. Merged consolidation PR: `https://github.com/Sekiph82/move-in-range/pull/13`
12. P010 evidence PRs: `https://github.com/Sekiph82/move-in-range/pull/14`, `https://github.com/Sekiph82/move-in-range/pull/15`, `https://github.com/Sekiph82/move-in-range/pull/16`

Only after reading the GitHub control plane may you use the local checkout for execution.

## Objective

Retire obsolete historical stacked PRs and branches now that consolidation is merged, post-merge validation is green, Expo compatibility is enforced in GitHub CI, and `main` is protected.

This is a cleanup/governance task only. Do not change product behavior, dependencies, migrations, deployment configuration, or test semantics.

## Safety rule

Do not delete or close anything based only on name or age.

For every candidate PR/branch, establish whether its effective content is already represented in `main` or is otherwise conclusively superseded by the merged consolidation history.

If a branch contains unique non-superseded commits or the ancestry/result is ambiguous, leave it intact and report it as `KEEP_REVIEW_REQUIRED`.

Historical `.hiveai` prompts, audits, decisions, and codex-runs inside `main` are append-only evidence and must not be deleted.

## Required inventory

Inventory at minimum:

- PRs #1 through #11;
- PR #13 as merged consolidation evidence;
- PRs #14, #15, #16 as P010 evidence;
- historical implementation branches associated with PRs #1 through #11;
- `codex/main-consolidation`;
- temporary P010 branches if still present:
  - `codex/p010-ci-branch-protection`
  - `codex/p010-evidence`
  - `codex/p010-final-evidence`
- any other obviously temporary consolidation/evidence branches discovered from GitHub.

For each item record:

- branch/PR name;
- head SHA;
- state;
- relationship to current `main`;
- whether its commits/content are represented by `main`;
- proposed disposition: `CLOSE`, `DELETE_BRANCH`, `KEEP`, or `KEEP_REVIEW_REQUIRED`;
- evidence used.

## Cleanup authorization

The maintainer has authorized routine cleanup of conclusively superseded historical PRs and branches. No additional human review is required for items that satisfy the safety rule above.

You may:

- close old open PRs #1 through #11 when their effective content is conclusively superseded by `main`;
- delete obsolete remote branches whose relevant history is already preserved by `main` and GitHub PR/commit history;
- delete temporary P010 branches after confirming their merged commits are preserved by `main`;
- delete `codex/main-consolidation` only after confirming PR #13 is merged and the branch tip/history is safely represented by `main`.

Do not:

- delete `main`;
- weaken or remove branch protection;
- force-push;
- rewrite history;
- delete tags/releases;
- delete `.hiveai` historical evidence from `main`;
- close/delete any item with unresolved unique content.

## Protected-main workflow

`main` is protected. Do not direct-push control-plane changes to `main`.

Use a dedicated branch and PR for the cleanup evidence/control-plane update. Required `validate` and `security` checks must pass before merge.

Do not weaken protection to make the cleanup easier.

## Task/control-plane updates

After cleanup actions are complete:

- update `TASKS.md` through the protected PR path;
- `MR-CLEAN-001` may move to `DONE` only if all intended historical cleanup is either completed or explicitly retained with a documented reason;
- update `.hiveai/handoffs/LATEST.md` with the final branch/PR inventory and remaining intentionally retained branches;
- update `.hiveai/prompts/CURRENT.md` to show P011 complete and next prompt pending ChatGPT audit;
- do not create or overwrite the authoritative ChatGPT audit.

## Validation

Because this task should not alter product source, dependency, or migration files, do not manufacture unnecessary product changes.

The cleanup evidence PR must pass the repository's protected required checks:

- `validate` including Expo Doctor and Expo dependency check;
- `security`.

After merge, confirm final `main` remains protected and exact final CI/Security are green.

## CR log destination

Write the matching Codex run log to:

`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/codex-runs`

Exact filename:

`CR-20260827-011-POST-CONSOLIDATION-CLEANUP.md`

Because `main` is protected, deliver the log and control-plane updates through the same or a minimal follow-up protected PR. Do not leave final evidence only on a temporary branch.

## Final classification

End with exactly one:

- `POST_CONSOLIDATION_CLEANUP_VERIFIED`
- `POST_CONSOLIDATION_CLEANUP_PARTIAL`
- `POST_CONSOLIDATION_CLEANUP_BLOCKED`

## Final Codex report

Record:

1. GitHub control-plane URLs read;
2. exact starting main SHA;
3. exact main protection state before cleanup;
4. complete PR #1-#16 inventory relevant to cleanup;
5. complete candidate branch inventory;
6. ancestry/supersession evidence for every closed/deleted item;
7. every PR closed;
8. every branch deleted;
9. every branch/PR deliberately retained and why;
10. cleanup evidence PR URL and merge SHA;
11. exact final main SHA;
12. final CI run ID/result;
13. final Security run ID/result;
14. confirmation final `main` is still protected;
15. TASKS/handoff/pointer changes;
16. CR GitHub URL;
17. required final classification;
18. next ChatGPT audit action.
