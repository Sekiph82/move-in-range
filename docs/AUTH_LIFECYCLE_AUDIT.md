# Authentication Lifecycle Audit

Audit date: 2026-07-19

| Area | Evidence | Status |
|---|---|---|
| Registration | `POST /auth/register`, password strength validation, duplicate email rejection, token response contract | Complete |
| Login | `POST /auth/login`, disabled account rejection, legacy hash upgrade | Complete |
| Access-token storage | Mobile `TokenStore` via SecureStore with memory fallback | Complete |
| Refresh-token storage | Mobile `TokenStore`, backend `auth_refresh_tokens` family records | Complete |
| Access expiration | `decode_token` exp validation and mobile local expiry parsing | Complete |
| Refresh rotation | one-time refresh rotation, replay revokes family | Complete |
| Replay rejection | `auth.refresh_replay` audit and family revocation test | Complete |
| Restore | `restoreSession`, `getSessionSnapshot`, refresh fallback | Complete |
| Logout | access token revocation, refresh family revocation, SecureStore clear | Complete |
| Account disabled | login/refresh/guard rejection for `deleted_at` users | Complete |
| Session expired | mobile normalized errors and `/auth/session-expired` route | Complete |
| Forgot password | generic response, no account enumeration, no token storage | Complete |
| Reset password | hashed expiring single-use token, strength validation, session invalidation | Complete |
| Route protection | `SessionGuard` and `resolveSessionGate` states | Complete |
| Onboarding protection | authenticated incomplete users route to `/onboarding` | Complete |
| Error parsing | mobile `normalizeApiError` maps API codes to safe copy | Complete |
| Rate limits | auth, refresh, forgot, reset, readiness rate limits | Complete |
| Network failure | mobile API unavailable/offline messages | Complete |
| Offline behavior | valid session may enter `OFFLINE_WITH_VALID_SESSION`; native sync remains limited | Partial |

Production email delivery remains blocked until an email provider is configured. Development reset preview is disabled in production by environment checks and does not store raw tokens.
