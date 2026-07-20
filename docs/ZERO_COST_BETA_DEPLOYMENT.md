# Zero-Cost Phone Beta Deployment

Target services:

- GitHub: source and PR #11
- Vercel: FastAPI backend
- Supabase: PostgreSQL only
- Resend: password reset and security email
- EAS: Android preview APK

Not required for staging:

- Redis
- Upstash
- Supabase Auth
- Google login
- Mailpit
- localhost URLs
- background daemon workers

## Architecture

```text
Android APK / Expo Go iPhone / product web
  -> HTTPS Vercel FastAPI
  -> Supabase PostgreSQL
  -> Resend HTTPS API
```

## Branch and PR

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
git fetch origin --prune
git checkout codex/release-rehearsal
git pull --ff-only origin codex/release-rehearsal
```

Update PR #11 only. Do not create PR #12.

## Backend Runtime

Required staging env:

```env
ENVIRONMENT=staging
MOVEINRANGE_ENV=staging
SESSION_REVOCATION_BACKEND=postgres
RATE_LIMIT_BACKEND=postgres
EMAIL_SENDER=resend
SERVERLESS_RUNTIME=true
ENABLE_STARTUP_DB_INIT=false
ENABLE_DEVELOPMENT_RESET_PREVIEW=false
ENABLE_E2E_SEED=false
ADMIN_COOKIE_SECURE=true
```

Secret values are added through Vercel/Supabase/Resend dashboards or interactive CLI only.

## Migrations

Alembic is authoritative. Migrations are explicit:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range\services\api
$env:DATABASE_URL=$env:MIGRATION_DATABASE_URL
python -m alembic -c alembic.ini upgrade head
python -m alembic -c alembic.ini current
```

Current expected head after this work:

```text
20260719_0010
```

## Dataset

```powershell
cd <repository-root>
$env:DATABASE_URL=$env:MIGRATION_DATABASE_URL
npm.cmd run import:exercises -- <dataset-root>\data\exercises.json
npm.cmd run import:exercises -- <dataset-root>\data\exercises.json
```

Expected:

- 1324 exercises
- 13240 localizations
- 10 locales
- 0 failures
- 0 duplicate exercise IDs

## Vercel API Smoke

```powershell
curl https://<API_URL>/api/v1/health
curl https://<API_URL>/api/v1/ready
```

`/ready` should report:

- PostgreSQL connected
- session revocation `postgres`
- rate limiter `postgres`
- email `resend_configured`
- migration head
- dataset availability

## Android

After Vercel API is deployed, update EAS preview env:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range\apps\mobile
npx.cmd eas-cli env:create --environment preview --name EXPO_PUBLIC_API_BASE_URL --value https://<MOVEINRANGE_API_VERCEL_URL> --visibility plaintext
npx.cmd eas-cli env:list --environment preview
```

If the variable already exists, use the EAS update command shown by the CLI.

Validate and build:

```powershell
npm.cmd exec -- expo config --type public
npm.cmd exec -- expo-doctor
npm.cmd exec -- expo export --platform android --clear
npx.cmd eas-cli build --platform android --profile preview --clear-cache
```

Do not use `api.moveinrange.invalid`, `localhost`, or `10.0.2.2` for the deployed preview APK.

## iPhone Expo Go

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range\apps\mobile
$env:EXPO_PUBLIC_API_BASE_URL="https://<MOVEINRANGE_API_VERCEL_URL>"
npx.cmd expo start --tunnel --clear
```

The iPhone scans the QR code and connects to Vercel, not the laptop backend.

## Live Smoke Flow

Run against the Vercel API and redact tokens from output:

- registration
- login
- refresh
- onboarding
- readiness
- daily, weekly, monthly plans
- workout lifecycle
- feedback
- diabetes context
- calendar
- privacy export
- logout
- refresh rejection
- password reset through Resend

Optional staging beta user:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range\services\api
$env:DATABASE_URL=$env:MIGRATION_DATABASE_URL
python -m app.scripts.create_beta_user --email beta-user@example.com --prompt-password
```

This command refuses production and never accepts the password as a command-line argument.

## Local Regression

```powershell
npm.cmd install
npm.cmd run format:check
npm.cmd run lint
npm.cmd run checklist:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run mobile:web:build
ruff check services/api
python -m pytest services/api/tests --basetemp=.pytest-tmp
npm.cmd run security:check
npm.cmd audit --audit-level=high
docker compose --profile test down -v --remove-orphans
docker compose --profile test build
docker compose up -d --build
docker compose --profile test run --rm tests
```

Do not mark Android runtime or iPhone Expo Go scenarios complete until they are actually performed on devices.
