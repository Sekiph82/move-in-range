# Codex Run Log Protocol

Final execution logs use a monotonic or timestamped filename such as `CR-20260826-001.md`. Never overwrite a historical run. A current pointer may summarize a run, but the full record stays immutable after completion except for an explicit correction note.

Each run log must record:

- run ID, date, branch, base, and relevant commit SHAs
- prompt scope and constraints
- files created and modified
- branch and PR inventory
- ancestry, ahead/behind, conflicts, and resolutions
- commands executed with pass/fail/blocked results
- migration head result
- task status changes and evidence links
- remaining risks and exact next actions

Run logs must not contain secrets, credentials, access tokens, exact health values, or raw health payloads. Use identifiers and statuses only.
