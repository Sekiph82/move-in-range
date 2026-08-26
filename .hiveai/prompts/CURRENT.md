# Active Prompt Pointer

Authoritative repository branch:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation`

Active prompt:
`P-20260826-006-FINAL-CONSOLIDATION-READINESS`

Active prompt URL:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/P-20260826-006-FINAL-CONSOLIDATION-READINESS.md`

Prompt history directory:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/prompts`

Expected Codex run log:
`CR-20260826-006-FINAL-CONSOLIDATION-READINESS.md`

Codex run destination:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`

Authoritative ChatGPT post-run audit destination:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

Codex must read the GitHub control plane first, then execute the active prompt in its local checkout, commit/push the matching CR log to `codex/main-consolidation`, and must not author the authoritative ChatGPT audit.

Scope: perform final consolidation-readiness validation, confirm CI/Security/Docker/migration/native-export gates, verify no regression from framework modernization, and prepare/open one reviewable consolidation PR to `main` only if all automated gates are green. Do not merge `main`.
