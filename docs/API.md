# API

Local API base URL: `http://localhost:8200/api/v1`.

Implemented MVP endpoints include:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `POST /admin/auth/login`, `GET /admin/auth/me`, `POST /admin/auth/logout`
- `GET /profile`, `PUT /profile`
- `GET /conditions`, `GET /equipment`
- `POST /readiness-checks`, `GET /readiness-checks/latest`
- `GET /exercises`, `GET /exercises/{id}`, `GET /exercises/{id}/substitutions`
- `POST /plans/daily/generate`, `GET /plans/daily/today`
- `POST /plans/weekly/generate`, `GET /plans/weekly/current`
- `POST /plans/monthly/generate`, `GET /plans/monthly/current`
- `POST /sessions`, `PATCH /sessions/{id}`, `POST /sessions/{id}/events`
- `POST /sessions/{id}/pain`, `POST /sessions/{id}/symptoms`, `POST /sessions/{id}/complete`
- `POST /glucose`, `GET /insights/summary`
- `POST /offline-events`
- `GET /admin/policies`, `GET /admin/exercises`, `GET /admin/audit-logs`, `POST /admin/policy-simulator`
- `GET /health`, `GET /ready`

User-specific endpoints require Bearer tokens from local auth. Admin endpoints require Bearer tokens from `/admin/auth/login`; browser-controlled role headers such as `x-admin-role` are not trusted.

Errors use:

```json
{
  "code": "machine_readable_code",
  "message": "safe user-facing message",
  "correlation_id": "identifier",
  "details": {}
}
```
