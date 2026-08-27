# Latest Handoff

Authoritative branch:
`https://github.com/Sekiph82/move-in-range/tree/main`

Latest Codex run:
`CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE`

Latest authoritative ChatGPT audit after this control-plane PR is merged:
`A-20260827-010-EXPO-CI-AND-MAIN-PROTECTION`

Current active prompt after this control-plane PR is merged:
`P-20260827-011-POST-CONSOLIDATION-CLEANUP`

## Current State

- `main` is authoritative and protected.
- PR #13 is merged; consolidation is complete.
- PRs #14, #15, and #16 are merged and carry the P010 CI/protection evidence.
- Final main CI `33057057333` is green and visibly passes `Expo Doctor` and `Expo dependency check`.
- Final Security `33057057320` is green.
- GitHub branch metadata independently reports `main` protected with required `validate` and `security` contexts.
- Full detailed protection subresource is unavailable to the ChatGPT connector, so the more granular protection fields remain corroborated by Codex execution evidence.
- `MR-CI-EXPO-001` and core `MR-BRANCH-001` are accepted DONE.
- Historical stacked PRs/branches have not yet been retired.
- Native physical-device and real deployment/provider acceptance remain separate tasks.

## Source-of-truth rule

ChatGPT prompts:
`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/prompts`

ChatGPT authoritative audits:
`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/audits`

Codex execution logs:
`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/codex-runs`

Canonical task tracker:
`https://github.com/Sekiph82/move-in-range/blob/main/TASKS.md`

## Next Action

Execute `P-20260827-011-POST-CONSOLIDATION-CLEANUP` only after this ChatGPT control-plane PR is merged into protected `main`. Inventory every historical PR/branch before retirement, delete/close only conclusively superseded items, preserve all `.hiveai` historical evidence, and leave ambiguous unique history intact with `KEEP_REVIEW_REQUIRED`.
