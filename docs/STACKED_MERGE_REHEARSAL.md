# Stacked Merge Rehearsal

Date: 2026-07-19

Rule: no GitHub pull request was merged, closed, or retargeted during this rehearsal.

Local model:

- Start point: `origin/main` at `a0410a4aaf3512ee92abe9ce8fa8ef87f0dc8a07`.
- Stack order: PR #1 through PR #10, then local PR #11 branch `codex/release-rehearsal`.
- Expected merge shape: each PR is stacked on the previous branch, then retargeted to `main` only after the previous PR lands and is manually approved.

Executed verification on the real current branch:

- `docker compose --profile test run --rm tests`: passed.
- Full PostgreSQL dataset import against clean DB: passed.
- Migration downgrade/upgrade rehearsal: passed.
- Backup restore: passed.

Conflict review:

- No Docker service conflicts were found in the active release branch.
- No duplicate migration head conflict was found; current head is `20260719_0009`.
- Existing branch stack remains linear through PR #10; PR #11 is stacked on PR #10.

Manual merge instructions:

1. Merge PR #1 into `main` only after manual approval and green CI.
2. Retarget PR #2 to `main`, verify diff, run CI, then merge only after approval.
3. Repeat in order for PR #3 through PR #10.
4. Retarget PR #11 to `main` only after PR #10 lands.
5. Rerun the full release rehearsal suite after retargeting PR #11.

Result: GO WITH MANUAL CONDITION. The model is ready, but actual merges and retargets remain intentionally unperformed.
