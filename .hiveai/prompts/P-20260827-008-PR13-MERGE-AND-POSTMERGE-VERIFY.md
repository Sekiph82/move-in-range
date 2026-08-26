# P-20260827-008 - PR13 Merge And Post-Merge Verify

Repository: `Sekiph82/move-in-range`
Authoritative pre-merge branch: `codex/main-consolidation`
Target PR: `#13 codex/main-consolidation -> main`
Expected Codex log: `CR-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md`
Authoritative post-run audit: reserved for ChatGPT under `.hiveai/audits/`.

## Maintainer authorization

The maintainer explicitly authorized PR #13 to be merged without any additional human review, provided the final exact-head merge gates are still green and no new blocker is discovered.

Do not ask the maintainer to perform manual review or approval.
Do not stop merely to request human confirmation if the exact-head gates remain green.

## GitHub is the authoritative control plane

Before doing anything locally, read these GitHub resources in this exact order:

1. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/INDEX.md`
2. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/PROJECT_DASHBOARD.md`
3. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/TASKS.md`
4. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/audits/CURRENT.md`
5. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/CURRENT.md`
6. This prompt: `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/P-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md`
7. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/handoffs/LATEST.md`
8. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/AGENTS.md`
9. Target PR: `https://github.com/Sekiph82/move-in-range/pull/13`
10. Latest exact-head GitHub Actions evidence for PR #13.

Only after reading the GitHub control plane may you use the local checkout for execution.

## Objective

Merge PR #13 into `main` if and only if the final exact-head merge gates are still green, then perform post-merge verification on `main` and save the matching CR log to GitHub.

No additional human review is required. The maintainer has already authorized the merge.

## Phase 1 - Final pre-merge safety check

1. `git fetch origin`.
2. Confirm remote repository is `Sekiph82/move-in-range`.
3. Confirm PR #13 is still OPEN, non-draft, unmerged, and mergeable.
4. Record exact current PR head SHA and base SHA.
5. Inspect GitHub Actions for the exact current PR head SHA.
6. Required gates before merge:
   - CI = success;
   - Security = success;
   - `npm audit --audit-level=high` = success;
   - repository security scan = success;
   - Python `pip-audit` = success.
7. Confirm no new commits outside the intended consolidation/control-plane scope appeared after the last authoritative audit.
8. Confirm there is no merge conflict.

If any exact-head required gate is pending or failing, or the PR is no longer mergeable, DO NOT MERGE. Record the exact blocker in the CR and stop.

## Phase 2 - Merge PR #13

If all Phase 1 gates are green:

- Merge PR #13 into `main` using the normal GitHub merge strategy that preserves the consolidation history. Prefer a merge commit rather than squash/rebase unless repository settings force another allowed method.
- Do not force-push.
- Do not rewrite history.
- Do not delete `codex/main-consolidation` yet.
- Do not close/delete historical PRs #1-#11 or their branches yet.

After merging, record:

- merge method;
- merge commit SHA;
- resulting `main` SHA;
- confirmation PR #13 is MERGED.

## Phase 3 - Switch authority to main

After successful merge:

- `git fetch origin`;
- checkout/switch to local `main` safely;
- fast-forward to `origin/main`;
- confirm the PR #13 merge commit and former consolidation head are ancestors of `main`;
- from this point forward, treat GitHub `main` as the authoritative project-control branch.

GitHub main URL:
`https://github.com/Sekiph82/move-in-range/tree/main`

## Phase 4 - Post-merge verification

Run/inspect the following against the merged `main` state:

### GitHub-hosted evidence
- wait for and inspect GitHub CI on the merged main SHA;
- wait for and inspect GitHub Security on the merged main SHA;
- both must complete successfully.

### Repository validation
Run applicable local checks on merged `main`:

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
- `python -m alembic heads` and confirm exactly one head
- `npx.cmd expo-doctor`
- `npx.cmd expo export --platform ios --clear`
- `npx.cmd expo export --platform android --clear`

### Docker
If Docker Desktop is stopped, start it yourself. If you started it, stop it afterward.

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

Do not treat Docker being initially stopped as a blocker without attempting startup.

## Phase 5 - Product/safety invariants

Confirm merged `main` still preserves:

- seven-step onboarding;
- mandatory readiness-first behavior for every new workout;
- same active workout resume exception only;
- exact plan/session identity continuity;
- no weakening of safety/readiness gates;
- no unintended product behavior change from the merge itself.

## Phase 6 - Task/control-plane updates

After successful merge and successful post-merge verification:

- update `TASKS.md` on `main` conservatively:
  - `MR-MERGE-001` may move to `DONE` only if merge and post-merge verification both succeed;
  - `MR-CLEAN-001` may move from `BACKLOG` to `READY`, but do not perform cleanup in this run unless explicitly authorized by a future prompt;
- update `.hiveai/handoffs/LATEST.md` on `main` to reflect that `main` is now authoritative;
- update `.hiveai/prompts/CURRENT.md` only as needed to indicate that P008 completed and the next prompt must come from ChatGPT;
- do not create or overwrite the authoritative ChatGPT audit.

## CR log destination after merge

After PR #13 is merged, write the matching Codex log on `main`:

`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/codex-runs`

Exact filename:

`CR-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md`

Commit and push the CR log plus the allowed task/handoff pointer updates directly to `main` if branch policy permits. If direct push to `main` is blocked by repository protection, create the smallest possible follow-up PR containing only the CR log and control-plane state updates, and merge that follow-up PR as part of this already-authorized operation once its required checks are green. Do not leave the final execution evidence stranded only on the old consolidation branch.

## Historical cleanup prohibition

Even after successful merge:

- do not delete branches;
- do not close PRs #1-#11;
- do not perform historical cleanup in this run.

Cleanup remains a separate post-merge task after ChatGPT audits this run.

## Final classification

End with exactly one:

- `MERGED_AND_POSTMERGE_VERIFIED`
- `MERGED_POSTMERGE_VERIFICATION_FAILED`
- `NOT_MERGED_BLOCKED`

## Final Codex report

Record:

1. GitHub control-plane URLs read;
2. exact pre-merge PR head/base SHAs;
3. exact pre-merge CI/Security run IDs and conclusions;
4. merge decision;
5. merge method and merge commit SHA;
6. final main SHA;
7. post-merge GitHub CI/Security run IDs and conclusions;
8. local host/Docker/export test counts and failures/skips;
9. Alembic head;
10. security state including remaining moderate-only advisories;
11. product/safety invariant review;
12. task/handoff changes;
13. CR commit SHA and GitHub URL;
14. one required final classification;
15. next ChatGPT audit action.
