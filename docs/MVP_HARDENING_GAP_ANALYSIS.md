# MVP Hardening Gap Analysis

Status values: COMPLETE, PARTIAL, INSECURE_DEVELOPMENT_ONLY, UNTESTED, MISSING, BROKEN.

| Area | Status | Notes |
|---|---|---|
| PostgreSQL migrations | COMPLETE | CI migrates a PostgreSQL 16 `moveinrange_test` database before backend tests. |
| PostgreSQL importer | COMPLETE | CI imports fixture data after migration; clean-volume full import is documented for local validation. |
| PostgreSQL auth | COMPLETE | PostgreSQL integration test exercises register/authenticated API flow and rejects SQLite fallback. |
| PostgreSQL plans | COMPLETE | PostgreSQL integration test covers readiness, daily plan, session, glucose, offline duplicate, and insights. |
| PostgreSQL sessions | COMPLETE | Session creation and ownership are covered in SQLite and PostgreSQL integration tests. |
| PostgreSQL glucose records | COMPLETE | Glucose write and insight read path are covered against PostgreSQL integration. |
| Admin authentication | COMPLETE | Admin login issues normal signed tokens; local bootstrap admin is server-side only. |
| Admin role enforcement | COMPLETE | Backend ignores `x-admin-role`; role boundaries are tested for clinical reviewer, support, regular user, and super admin. |
| Token expiration | COMPLETE | Access token expiry claim is validated and tested. |
| Refresh-token rotation | COMPLETE | Refresh token is rotated on use and stored only as a SHA-256 hash. |
| Refresh-token replay | COMPLETE | Reuse of a rotated refresh token returns 401. |
| Password storage | COMPLETE | PBKDF2-SHA256 uses 210,000 iterations; legacy local hashes upgrade on successful login. |
| Secret configuration | COMPLETE | Production rejects default signing secret, development admin override, and wildcard CORS. |
| User isolation | COMPLETE | Plan/session/glucose/session-event ownership tests enforce 404 or 403 anti-enumeration. |
| Plan ownership | COMPLETE | Cross-user daily plan session start returns 404. |
| Session ownership | COMPLETE | Cross-user session patch, pain, symptom, glucose, and completion paths are protected. |
| Glucose ownership | COMPLETE | Glucose writes with another user's session id return 404. |
| Readiness ownership | COMPLETE | Readiness is created and read only through authenticated user scope. |
| Admin audit records | PARTIAL | Auth, policy simulation, profile, and session completion are audited with redacted payloads; full admin CRUD audit awaits later admin features. |
| Offline event idempotency | COMPLETE | Unique `(user_id, idempotency_key)` database constraint and duplicate response are tested. |
| Pain flow | PARTIAL | Validation, persistence, duplicate handling, and severe-pain stop action are covered; replacement exercise audit remains future work. |
| Symptom stop flow | COMPLETE | Symptoms stop the session, invalidate active workout state, and block normal completion. |
| Weekly recovery spacing | COMPLETE | Preferred days are honored without consecutive demanding days. |
| Monthly progression holds | COMPLETE | High pain, safety block, and low-readiness conditions hold progression after week 1. |
| Workout timer accuracy | COMPLETE | Mobile timer uses timestamps and excludes paused time. |
| App backgrounding | PARTIAL | Timestamp model supports background/foreground; manual device validation remains not run. |
| App restart recovery | PARTIAL | API session resume exists; persistent client workout snapshot remains future work. |
| Physical-device networking | UNTESTED | Requires a physical device and Windows LAN IP validation. |
| Android emulator networking | UNTESTED | Requires emulator availability; use `http://10.0.2.2:8200`. |
| SecureStore behavior | PARTIAL | SecureStore is used for tokens; unsupported runtime fallback is documented but not persistent. |
| CORS | COMPLETE | CORS origins are environment-driven and production wildcard is rejected. |
| Health-data logging | COMPLETE | Audit records are redacted and `redact_for_log` removes token, password, and health values. |
| CI PostgreSQL coverage | COMPLETE | GitHub Actions uses PostgreSQL for authoritative integration tests and fails if SQLite is used. |
| Test coverage | COMPLETE | Focused tests now cover auth lifecycle, admin roles, safety stops, planning holds, offline idempotency, PostgreSQL, and timer state. |
| Dependency audit | PARTIAL | High/critical npm audit remains enforced; 13 moderate findings are documented and deferred pending Expo/Next major upgrades. |

Anti-enumeration policy: object-level authorization returns 404 when an identifier belongs to another user and revealing existence would leak health data. Admin role failures return 403 after a valid admin identity is established.
