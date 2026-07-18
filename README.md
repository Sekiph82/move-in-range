# MoveInRange

Health-aware movement planning. Move safely. Learn your range.

MoveInRange is a monorepo with an Expo mobile MVP, FastAPI API, Next.js admin console, deterministic safety rules, and exercise dataset import tooling.

MoveInRange does not diagnose, prescribe medication, calculate insulin doses, recommend insulin changes, override clinician restrictions, or provide emergency care.

## Canonical Local URLs

```env
API_BASE_URL=http://localhost:8200
ADMIN_BASE_URL=http://localhost:3200
EXPO_PUBLIC_API_BASE_URL=http://localhost:8200
NEXT_PUBLIC_API_BASE_URL=http://localhost:8200
```

Android emulator users should set `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8200`. Expo Go on a physical device must use the Windows computer LAN IPv4 address, not `localhost`.

## Windows PowerShell Setup

Run from:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
copy .env.example .env
npm.cmd install
docker compose up -d postgres redis
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
npm.cmd run api
```

In separate terminals:

```powershell
npm.cmd run admin
npm.cmd run mobile
```

The API binds to `0.0.0.0:8200`. The admin app runs on `http://localhost:3200`.

## Dataset Import

Relative path:

```cmd
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
```

Absolute path:

```cmd
npm.cmd run import:exercises -- "C:\Users\sekip\Desktop\MoveInRange-Workspace\exercises-dataset-main\data\exercises.json"
```

Verified local import: 1,324 exercises, 0 failed rows, 10 instruction locales. Third-party media is not committed; metadata and attribution are retained.

## Local Demo Account

The mobile app can create or reuse a local development account automatically:

```text
demo@moveinrange.local
MoveInRangeLocalDemo!
```

Use these only for local development.

## Verification

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
ruff check services/api
python -m pytest services/api/tests
npm.cmd run security:check
npm.cmd audit
```

## Applications

- `apps/mobile`: Expo Router mobile MVP with API-backed profile, readiness, plans, exercise library, guided workout actions, glucose logging, insights, and offline outbox helpers.
- `apps/admin`: Next.js admin console that reads policy, exercise, audit, and simulator data from the API when it is running.
- `services/api`: FastAPI backend with local auth, SQLAlchemy persistence, exercise import, safety, planning, sessions, glucose, insights, and admin endpoints.
