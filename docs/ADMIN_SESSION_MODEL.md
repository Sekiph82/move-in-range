# Admin Session Model

The admin app uses a server-side session wrapper over the backend admin token API.

## Flow

1. Admin visits `/login`.
2. The form posts email/password to `/api/admin-session/login`.
3. The route handler calls `POST /api/v1/admin/auth/login`.
4. On success, the route handler stores:
   - `mir_admin_access`: HttpOnly access token cookie.
   - `mir_admin_refresh`: HttpOnly refresh token cookie.
   - `mir_admin_csrf`: readable double-submit CSRF cookie.
5. The protected dashboard reads the access cookie server-side and calls `GET /api/v1/admin/auth/me`.
6. Logout posts to `/api/admin-session/logout`, validates CSRF, calls backend admin logout, and clears cookies.

## Cookie Policy

Cookies use:

- `HttpOnly=true` for access and refresh credentials.
- `SameSite=Lax`.
- `Path=/`.
- `Secure=true` in production and `Secure=false` only for localhost development.

The browser never receives the default development password and does not need direct JavaScript access to refresh tokens.

## CSRF

State-changing admin session routes require a double-submit CSRF token. The logout form submits the token from the server-rendered page. `/api/admin-session/simulate` requires `x-csrf-token` matching the CSRF cookie.

## Expiration

If backend token validation returns 401, protected pages redirect to `/login?error=session_expired`. `/api/admin-session/refresh` exists as a controlled server route for explicit refresh; automatic dashboard refresh can be added later without exposing refresh tokens to browser JavaScript.

## Limits

This is not a production SSO system. External IdP integration, password change invalidation, and richer admin user management remain future work.
