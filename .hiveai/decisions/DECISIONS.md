# Decision Register

## D-20260826-001: Use a dedicated consolidation branch

- decision: create `codex/main-consolidation` from the latest `origin/main` and merge `origin/codex/release-rehearsal` into it.
- rationale: the stacked chain must be reviewed as one unit while preserving the current main manifest and avoiding a direct main merge.
- consequence: the consolidation branch has a merge commit; old branches and PRs remain available for audit and rollback.

## D-20260826-002: Preserve main's H!veAI manifest authority

- decision: retain the main manifest and update it to point to the canonical ledger and control artifacts.
- rationale: `origin/main` contains the current dashboard pointer and release-rehearsal predates it.
- consequence: H!veAI reads task state from `TASKS.md`; dashboard text does not become a second ledger.

## D-20260826-003: Do not close or delete stacked history

- decision: leave PRs #1-#11 and all historical branches unchanged.
- rationale: cleanup is only safe after the consolidation PR is merged and verified with maintainer approval.
- consequence: cleanup remains `MR-CLEAN-001` in BACKLOG.

## D-20260826-004: Keep openGym work design-only

- decision: preserve the openGym audit and v2 design documents without importing code, media, migrations, or unverified licensed data.
- rationale: the preceding prompt authorized an audit only and AGENTS.md requires attribution and safety boundaries.
- consequence: implementation is a separate backlog task requiring product, clinical, licensing, and migration review.
