# Security Review

Security review checks include no secrets in Git, role authorization, redaction, audit events, safe env templates, CORS, rate-limit hooks, dependency audit, Python audit, and prohibited file checks. Local npm audit currently reports moderate transitive findings in the Expo/Next dependency graph, including a PostCSS advisory with no npm-provided fix; CI fails high and critical advisories and reports the moderate set for review.

MVP hardening changes:

- Admin role headers are no longer accepted as proof of role. Admin endpoints require a signed Bearer token and database-backed role lookup.
- Local access and refresh tokens include issuer, audience, type, issued-at, expiration, and token id claims.
- Refresh tokens rotate on use, replay is rejected, and only token hashes are stored.
- Logout clears stored refresh-token family records and revokes the presented access token through Redis when available.
- Refresh-token replay revokes the entire token family and records a security audit event.
- Production settings reject the default signing secret, wildcard CORS, and development admin override.
- Login, registration, refresh, readiness, plan generation, glucose, offline ingestion, admin login, and policy simulation have local fallback rate limits.
- Audit payloads are redacted; `app.privacy.redact_for_log` must be used before writing arbitrary request-shaped data to ordinary logs.

Known MVP limits:

- Access-token revocation falls back to in-memory only in development/test when Redis is unavailable. Production rejects that fallback.
- The admin app now uses HttpOnly cookies and double-submit CSRF for state-changing admin session requests.
