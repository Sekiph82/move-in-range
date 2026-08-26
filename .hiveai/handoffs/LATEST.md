# Latest Handoff

Authoritative branch:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation`

Latest audited Codex run:
`CR-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION`

Latest authoritative ChatGPT audit:
`A-20260826-005-CHATGPT-POSTRUN-AUDIT`

Current active prompt:
`P-20260826-006-FINAL-CONSOLIDATION-READINESS`

## Current State

- GitHub CI is green on `codex/main-consolidation` after the Expo 57 / React Native 0.86 / Next 16 modernization.
- GitHub Security is green.
- `npm audit --audit-level=high` passes with zero high/critical npm advisories.
- GitHub Security also completes repository security scanning and Python `pip-audit` successfully.
- Remaining npm advisories are moderate-only and tied to Expo tooling/uuid in the currently recorded graph.
- Mobile dependency line is Expo 57 / React Native 0.86 / React 19.2.
- Admin dependency line is Next 16 / React 19.2.
- Current E2E source reflects the seven-step onboarding contract and mandatory readiness-first workout flow.
- P005 execution evidence reports Docker Node 75/75 pass, Docker API 36/36 pass, one Alembic head, Expo Doctor green, and iOS/Android exports green.
- ChatGPT independently corroborated GitHub CI/Security and committed dependency state; local Docker/native runtime claims remain execution evidence unless independently reproducible through GitHub-hosted evidence.

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

1. Execute P006 final consolidation-readiness validation from the GitHub-authored prompt.
2. Reconfirm branch ancestry, CI, Security, migration lineage, Docker, Expo Doctor, exports, and product/safety invariants.
3. If all automated gates are green, open or update exactly one reviewable PR from `codex/main-consolidation` to `main`; do not merge it.
4. Keep historical stacked PRs and branches intact until consolidation is merged and separately post-merge verified.
5. Native physical-device/provider/public-deployment acceptance remains separate work and must not be falsely claimed by the consolidation audit.
