# Codex Run Log Protocol

Final execution logs are immutable historical records. Never overwrite a completed historical run except to append an explicit correction note.

## Naming

Every run log must inherit the date, sequence number, and slug from the active prompt.

Prompt:
`P-YYYYMMDD-NNN-SLUG.md`

Codex run:
`CR-YYYYMMDD-NNN-SLUG.md`

Independent audit:
`A-YYYYMMDD-NNN-SLUG.md`

Example:

- prompt: `P-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`
- run: `CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`
- audit: `A-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`

The run log must record the related prompt ID and path explicitly.

## Required run contents

Each run log must record:

- run ID and related prompt ID
- date, branch, base, and relevant commit SHAs
- prompt scope and constraints
- files created and modified
- branch/PR state when relevant
- commands actually executed
- actual pass/fail/blocked results and meaningful counts
- Docker lifecycle if Docker was used or required
- migration head result
- task status changes and evidence links
- remaining risks and exact next actions

Do not copy historical PASS/BLOCKED statuses forward without rerunning the proving command when the active prompt requires independent verification.

Run logs are execution evidence, but they do not independently certify themselves. The matching `.hiveai/audits/A-...md` file is the verification layer used to decide whether task evidence is sufficient.

Run logs must not contain secrets, credentials, access tokens, exact health values, or raw health payloads. Use identifiers and statuses only.
