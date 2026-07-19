# Vercel Deployment

Preferred free beta projects from the same GitHub repository:

| Project | Root | Purpose | Required now |
| --- | --- | --- | --- |
| `moveinrange-api` | repository root | FastAPI backend through `api/index.py` | Yes |
| `moveinrange-admin` | `apps/admin` | admin console | After API health |
| `moveinrange-web` | `apps/mobile` web export or static output | product web | Optional for phone beta |

The API project must not use Docker on Vercel. `api/index.py` exports the existing FastAPI `app` and does not run Uvicorn.

CLI checks:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
npx.cmd vercel --version
npx.cmd vercel whoami
npx.cmd vercel login
npx.cmd vercel link
```

Use project name `moveinrange-api`. Do not link over an unrelated Vercel project.

Required API env vars:

```text
ENVIRONMENT=staging
MOVEINRANGE_ENV=staging
DATABASE_URL=<Supabase transaction pooler URL>
MIGRATION_DATABASE_URL=<Supabase migration URL>
DATABASE_POOL_MODE=serverless
DATABASE_DISABLE_PREPARED_STATEMENTS=true
AUTH_SECRET=<secret>
TOKEN_ISSUER=moveinrange-api
TOKEN_AUDIENCE=moveinrange-mobile
SESSION_REVOCATION_BACKEND=postgres
RATE_LIMIT_BACKEND=postgres
EMAIL_SENDER=resend
RESEND_API_KEY=<secret>
RESEND_FROM_EMAIL=MoveInRange <no-reply@verified-domain.example>
PUBLIC_APP_URL=https://<app URL>
PASSWORD_RESET_URL_BASE=https://<app URL>
CORS_ORIGINS=https://<admin URL>,https://<product web URL>
ENABLE_E2E_SEED=false
ENABLE_DEVELOPMENT_RESET_PREVIEW=false
ADMIN_COOKIE_SECURE=true
LOCAL_ADMIN_EMAIL=<admin email>
LOCAL_ADMIN_PASSWORD=<secret>
SERVERLESS_RUNTIME=true
ENABLE_STARTUP_DB_INIT=false
```

Add secrets interactively:

```powershell
npx.cmd vercel env add DATABASE_URL preview
npx.cmd vercel env add MIGRATION_DATABASE_URL preview
npx.cmd vercel env add AUTH_SECRET preview
npx.cmd vercel env add RESEND_API_KEY preview
npx.cmd vercel env add LOCAL_ADMIN_PASSWORD preview
```

Add safe non-secrets interactively or through the dashboard:

```powershell
npx.cmd vercel env add SESSION_REVOCATION_BACKEND preview
npx.cmd vercel env add RATE_LIMIT_BACKEND preview
npx.cmd vercel env add EMAIL_SENDER preview
npx.cmd vercel env add ENABLE_E2E_SEED preview
npx.cmd vercel env add ENABLE_DEVELOPMENT_RESET_PREVIEW preview
npx.cmd vercel env add ADMIN_COOKIE_SECURE preview
```

Deploy preview only after env setup:

```powershell
npm.cmd install
npm.cmd run format:check
npm.cmd run lint
npm.cmd run checklist:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
ruff check services/api
python -m pytest services/api/tests --basetemp=.pytest-tmp
npm.cmd run security:check
npm.cmd audit --audit-level=high
npx.cmd vercel
```

Verify:

```powershell
curl https://<API_URL>/api/v1/health
curl https://<API_URL>/api/v1/ready
```

Deploy production only after preview API, migrations, dataset import, Resend reset, and phone beta smoke pass:

```powershell
npx.cmd vercel --prod
```

Never deploy to an unrelated production domain.
