# Current Audit Pointer

Active audit: `A-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION`

Source:
`.hiveai/audits/A-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`

Related prompt:
`.hiveai/prompts/P-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`

Historical consolidation artifacts remain available:

- `.hiveai/audits/BRANCH_CONSOLIDATION_AUDIT.md`
- `.hiveai/audits/MAIN_CONSOLIDATION_RESULT.md`
- `.hiveai/codex-runs/CR-20260826-001.md`

Current authoritative state: H!veAI/control-system structure, Docker Compose configuration, service health, migration lineage, and infrastructure-backed integration paths are verified by fresh run `CR-20260826-002`. Docker Node validation reports `70 passed, 5 failed, 0 skipped`; host Node validation reports `65 passed, 0 failed, 10 legitimate precondition skips`. The current npm baseline is `24 vulnerabilities (10 moderate, 14 high)`. Consolidation merge readiness remains `INCOMPLETE` because the five product E2E contract failures and dependency advisories remain unresolved.
