# Latest Handoff

Authoritative branch:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation`

Latest audited Codex run:
`CR-20260826-006-FINAL-CONSOLIDATION-READINESS`

Latest authoritative ChatGPT audit:
`A-20260826-006-FINAL-CONSOLIDATION-READINESS`

Current active prompt:
`P-20260827-007-PR13-HUMAN-MERGE-HANDOFF`

Target consolidation PR:
`https://github.com/Sekiph82/move-in-range/pull/13`

## Current State

- PR #13 exists from `codex/main-consolidation` to `main` and is independently verified OPEN, non-draft, unmerged, and mergeable.
- Exact PR-head GitHub CI is green.
- Exact PR-head GitHub Security is green.
- `npm audit --audit-level=high`, repository security scan, and Python `pip-audit` are green on the exact PR head.
- Zero high/critical npm advisories remain; the recorded Expo tooling/uuid family is moderate-only residual technical debt.
- `MR-AUDIT-001`, `MR-E2E-001`, `MR-SEC-001`, `MR-CONS-001`, and automated `MR-VAL-001` are adjudicated DONE by authoritative audit A006.
- P006 records Docker Node 75/75, API 36/36, one Alembic head, Expo Doctor 21/21, and iOS/Android exports as local execution evidence. ChatGPT does not relabel those local claims as independently rerun evidence.
- Physical Android/iPhone acceptance and real provider/public-deployment acceptance remain separate external tasks.
- Historical stacked PRs/branches remain untouched and must not be cleaned up before PR #13 is merged and post-merge main verification succeeds.

## Source-of-truth rule

The authoritative project-control state is GitHub branch `codex/main-consolidation`.

ChatGPT writes prompts here:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/prompts`

ChatGPT writes authoritative audits here:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

Codex writes and pushes execution logs here:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`

Canonical task tracker:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/TASKS.md`

Codex must read the GitHub control plane first. Local `.hiveai` files are only a checkout/mirror and must not override newer GitHub control state.

## Remaining Work

1. Execute P007 to prepare the final human merge handoff for PR #13 from current GitHub evidence.
2. Do not merge `main` automatically; explicit maintainer authorization is required.
3. After PR #13 is actually merged, run a dedicated post-merge validation against `main`.
4. Only after post-merge verification is green may historical stacked PR/branch cleanup be considered.
5. Native physical-device and real deployment/provider acceptance remain separate tasks and must not be falsely claimed as completed by consolidation work.
