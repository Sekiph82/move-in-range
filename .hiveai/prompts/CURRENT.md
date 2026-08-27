# Active Prompt Pointer

Authoritative repository branch:
`https://github.com/Sekiph82/move-in-range/tree/main`

Active prompt:
`P-20260827-010-EXPO-CI-COMPATIBILITY-GATE`

Active prompt URL:
`https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/prompts/P-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`

Prompt history directory:
`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/prompts`

Expected Codex run log:
`CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`

Codex run destination:
`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/codex-runs`

Authoritative ChatGPT post-run audit destination:
`https://github.com/Sekiph82/move-in-range/tree/main/.hiveai/audits`

Scope: add GitHub-hosted Expo Doctor and Expo dependency-check gates to CI, then remove the current unprotected-main warning by configuring real GitHub `main` branch protection. Required end state: PR-based updates, strict required CI + Security checks, zero required human approvals for routine fully-green automation, force pushes disabled, branch deletion disabled, and GitHub reporting `main` as protected. Do not change product behavior or perform historical branch/PR cleanup.