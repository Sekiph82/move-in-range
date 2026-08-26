# Product Architecture

MoveInRange remains a stacked extension of the existing FastAPI, Expo, Next.js, PostgreSQL, and Redis architecture.

Core services:

- `services/api/app/routes.py`: authenticated API surface for onboarding, profile, plans, sessions, integrations, privacy, caregiver, professional, camera, and admin.
- `services/api/app/services/platform.py`: deterministic product services, mock provider contracts, media fallback, voice cues, progression, and diabetes insight helpers.
- `services/api/app/db/models.py`: normalized user-owned product tables.
- `apps/mobile`: consumer mobile flows and testable state helpers.
- `apps/admin`: secure cookie-based admin console.

Canonical local commands:

```powershell
cd <repo-root>
npm.cmd run api
npm.cmd run admin
npm.cmd run mobile
```

The API remains on `http://localhost:8200`; admin remains on `http://localhost:3200`.

External integrations are provider-based. Provider rows can exist and mocks can sync, but real activation requires official credentials, platform entitlements, hardware, or licensed media.
