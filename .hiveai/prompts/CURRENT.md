# Active Prompt Pointer

Active prompt: `P-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION`

Source:
`.hiveai/prompts/P-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION.md`

Expected Codex run log:
`.hiveai/codex-runs/CR-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION.md`

Authoritative post-run audit will be written separately by the ChatGPT audit layer after the Codex run is committed and GitHub Actions evidence is reviewed.

Scope: finish `MR-SEC-001` for real by deliberately modernizing the Expo/Metro and Next/PostCSS dependency families until the GitHub Security workflow passes with zero high/critical npm advisories, while preserving current MoveInRange product behavior and rerunning full host/Docker/native-export regression validation.
