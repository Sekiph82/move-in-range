# MoveInRange

**Health-aware movement planning**
Move safely. Learn your range.

MoveInRange is a monorepo containing an Expo React Native mobile app, FastAPI backend, Next.js admin console, shared deterministic health-rule packages, exercise import tooling, CI, and safety documentation.

MoveInRange does not diagnose, prescribe medication, calculate insulin doses, recommend insulin changes, override clinician restrictions, or provide emergency care.

## Applications

- apps/mobile: Expo Router mobile application with Today, Plan, Move, Insights, and Profile tabs.
- apps/admin: Next.js App Router administration console for policies, exercise review, simulator, audit logs, and feature flags.
- services/api: FastAPI backend with versioned /api/v1 routes, SQLAlchemy models, Alembic migration, importer, and tests.
- packages/health-rules: deterministic medical safety, planning, eligibility, and diabetes context engines.
- packages/exercise-domain: exercise normalization, classification, search, and substitution helpers.

## Windows PowerShell Setup

~~~powershell
git clone https://github.com/Sekiph82/move-in-range.git
cd move-in-range
git checkout codex/initial-moveinrange-platform
copy .env.example .env
npm.cmd install
docker compose up -d postgres redis
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
npm.cmd run api
npm.cmd run admin
npm.cmd run mobile
~~~

PowerShell may block npm.ps1; use npm.cmd.

## Requirements

- Node.js 20 or newer. This workspace was inspected with Node v24.14.0.
- Python 3.12 or newer for the FastAPI service.
- Docker Desktop for PostgreSQL and Redis.
- Expo Go or an Android emulator for mobile development. iOS device builds are not available from Windows without Apple tooling.

## Verification Commands

~~~powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
~~~

See docs/TESTING.md and docs/DEPLOYMENT.md for details.
