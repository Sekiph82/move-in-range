# Release Security Review

Date: 2026-07-19

Reviewed areas and result:

- Admin privilege escalation: role changes are super-admin only; support promotion is denied and audited.
- Policy self-approval: clinical reviewer cannot approve a policy version they created.
- Policy publication: clinical reviewer cannot publish; super-admin can publish only after clinical approval is persisted.
- Integration disable/revoke: analyst can retry sync but cannot disable/revoke credentials.
- Production email sender: `EMAIL_SENDER=console`, Mailpit/localhost SMTP, localhost reset/API URLs, development reset preview, E2E seed, insecure admin cookie, default secrets, wildcard CORS, and in-memory revocation are rejected in production.
- Reset token leakage: reset tokens are hashed in persistence, single-use, expiration checked, and old sessions are invalidated; Mailpit browser E2E verifies delivery without relying on API log exposure.
- Export secrets: privacy export test asserts archive JSON excludes password hash, refresh token, reset token, and auth secret fields.
- Deletion authorization: user-owned deletion requests and support/admin processing are tested; completion revokes active refresh sessions.
- E2E seed production rejection: `ENABLE_E2E_SEED=true` is rejected in production settings.
- Open redirects: reset base URL is constrained by production URL guards; no arbitrary redirect target was introduced.
- Path injection: no filesystem path input was added for user-controlled export/download paths.
- CSRF: admin mutation proxy uses CSRF validation; direct forged request is covered in admin browser E2E.
- CORS: wildcard CORS is rejected in production.
- Android environment URLs: public config currently uses local API for development only; preview/production build must inject non-local API URL.
- Deep-link hijacking risk: scheme `moveinrange` exists; Android App Links are not configured and must be evaluated before public distribution.
- Backup secret exposure: backup file was generated under `.local`, checksum recorded, restored, and deleted; no backup committed.

Dependency advisories:

| Package chain | Advisory | Severity | Reachability | Mitigation |
| --- | --- | --- | --- | --- |
| `next` / `postcss` / Expo tooling | PostCSS CSS stringify XSS | moderate | Build/tooling and Next dependency chain; no user-authored CSS stringify path identified in rehearsal | Track compatible Next/Expo patch; do not run force downgrade |
| `expo` / `@expo/config*` / `xcode` / `uuid` | uuid missing buffer bounds check for v3/v5/v6 with supplied buffer | moderate | Expo prebuild tooling path, not runtime API handling user buffers | Upgrade Expo/tooling when compatible |

Audit result:

- `npm audit --audit-level=high`: passed.
- `npm audit`: 14 moderate advisories reported.
- No high or critical advisories remained in the executed audit.
