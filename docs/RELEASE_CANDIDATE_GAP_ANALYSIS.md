# Release Candidate Gap Analysis

Status values: COMPLETE, PARTIAL, DEVELOPMENT_ONLY, UNVALIDATED, BLOCKED_BY_ENVIRONMENT, MISSING, BROKEN.

| Area | Status | Notes |
|---|---|---|
| Admin login UI | COMPLETE | `/login` has visible email/password fields, validation, loading-capable form behavior, and English/Turkish error copy. |
| Admin logout | COMPLETE | `/api/admin-session/logout` calls backend logout, validates CSRF, and clears cookies. |
| Admin session persistence | COMPLETE | Access and refresh credentials are held in HttpOnly SameSite=Lax cookies. |
| Admin expired-session handling | PARTIAL | Protected page redirects to `/login?error=session_expired`; server-side refresh route exists but dashboard does not auto-refresh yet. |
| Admin role-aware navigation | COMPLETE | Dashboard navigation is derived from the authenticated admin role. |
| Admin forbidden states | COMPLETE | Backend denies forbidden roles; admin app has `/forbidden`. |
| Access-token revocation | COMPLETE | Redis-backed revocation store is used when available; development-only in-memory fallback is explicit. |
| Refresh-token revocation | COMPLETE | DB token family records store rotation/revocation state. |
| Redis availability behavior | COMPLETE | Production rejects missing Redis revocation; development warns and falls back. |
| Multi-instance compatibility | PARTIAL | Redis revocation is multi-instance safe; local in-memory fallback is not. |
| Environment-variable naming | COMPLETE | Canonical admin names are `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD`; guard tests reject deprecated duplicates. |
| Local PostgreSQL validation | BLOCKED_BY_ENVIRONMENT | Docker Desktop was unavailable locally; `scripts/validate-postgres.ps1` was added. |
| CI PostgreSQL validation | COMPLETE | CI uses PostgreSQL and `TEST_DATABASE_URL` guard tests. |
| API E2E flow | COMPLETE | Release-candidate API E2E test covers auth, onboarding, plans, sessions, glucose, offline duplicate, logout, replay, and isolation. |
| Admin browser E2E flow | PARTIAL | Stable session contract tests cover routes/cookies/CSRF/no embedded password; live Playwright browser run remains environment gated. |
| Mobile Android runtime | BLOCKED_BY_ENVIRONMENT | No Android emulator or device was available. |
| Workout background/foreground | PARTIAL | Timestamp state and snapshot restore are unit-tested; native lifecycle not run. |
| Workout restart | COMPLETE | Pure state-machine snapshot restore and stopped-session non-resume are tested. |
| Offline recovery | COMPLETE | Account-scoped outbox, retry count, capped backoff, manual retry, and logout/account isolation are tested. |
| SecureStore | PARTIAL | TokenStore restore/corruption/logout behavior is tested; native SecureStore device behavior remains manual. |
| Dataset list performance | COMPLETE | List endpoint avoids detail localization/media N+1 work and keeps pagination limits. |
| Localization | COMPLETE | Turkish exercise detail path remains covered by API E2E. |
| Error states | COMPLETE | API errors use safe code/message/correlation_id/details responses. |
| Loading states | PARTIAL | Admin login form is normal browser-post based; richer pending-state JS is not added. |
| Release documentation | COMPLETE | RC docs, test matrix, merge plan, and run commands are updated. |
| Merge readiness | COMPLETE | Stacked merge plan documents sequence without merging any PR. |
