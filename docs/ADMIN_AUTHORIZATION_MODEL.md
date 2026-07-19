# Admin Authorization Model

MoveInRange admin authorization is enforced by the FastAPI backend on every protected admin endpoint. The Next.js admin app adds a server-side cookie session wrapper around the backend token API.

## Authentication

- Admins sign in through the visible `/login` form, which posts to `/api/admin-session/login`; that route calls `POST /api/v1/admin/auth/login`.
- The local MVP bootstrap account is read from server-only environment variables: `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD`.
- Admin credentials are never read from `NEXT_PUBLIC_*` variables.
- A successful admin login returns the same signed token shape as local user auth, with issuer, audience, expiration, token type, issued-at, token id, and refresh family claims where applicable.
- Refresh tokens are stored only as SHA-256 hashes in DB-backed token family records.
- `POST /api/v1/admin/auth/logout` revokes the presented access token through the configured revocation store and clears stored refresh-token family state.

## Roles

Preserved roles:

- `super_admin`: full admin access.
- `clinical_reviewer`: clinical policy reads and simulator access.
- `exercise_reviewer`: exercise review access.
- `content_editor`: non-clinical content and localization access as admin features are added.
- `support`: limited audit/support views.
- `analyst`: analytics-oriented access as admin features are added.

`super_admin` may access every admin endpoint. Other roles must match the backend permission map; hiding a button in the admin UI is never treated as authorization.

## Removed Shortcut

The previous `x-admin-role` development shortcut is no longer authoritative. Browser-controlled role headers return 401 without a valid Bearer token, and regular user tokens return 403 for admin endpoints.

## Session Security

The admin app uses HttpOnly SameSite=Lax cookies for access and refresh credentials. State-changing admin session routes use double-submit CSRF protection. See `docs/ADMIN_SESSION_MODEL.md`.

## Auditing

Admin login/logout and admin policy simulator access are recorded with redacted audit payloads. Tokens, passwords, raw Authorization headers, exact glucose values, and raw health payloads must not be written to ordinary logs.
