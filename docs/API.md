# API

Local API base URL: `http://localhost:8200/api/v1`.

Implemented MVP endpoints include:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
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

User-specific endpoints require Bearer tokens from local auth. Admin endpoints use role headers only for local MVP simulation and remain draft/protected surfaces.
