# Supabase Setup

Supabase is used only as PostgreSQL. Do not replace MoveInRange auth with Supabase Auth, and do not expose service-role keys to mobile, web, or admin clients.

## Dashboard Values

Find the project reference in Supabase Dashboard:

Project Settings -> General -> Reference ID.

Find database connection strings in:

Project Settings -> Database -> Connection string.

Use two variables:

```env
DATABASE_URL=postgresql+psycopg://postgres.<PROJECT_REF>:<PASSWORD>@<REGION>.pooler.supabase.com:6543/postgres
MIGRATION_DATABASE_URL=<direct or session-pooler migration-capable URL>
```

For Vercel runtime, use the transaction pooler and configure:

```env
DATABASE_POOL_MODE=serverless
DATABASE_DISABLE_PREPARED_STATEMENTS=true
DATABASE_CONNECT_TIMEOUT_SECONDS=5
SERVERLESS_RUNTIME=true
ENABLE_STARTUP_DB_INIT=false
```

Run migrations explicitly; do not run schema migration on every request:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range\services\api
$env:DATABASE_URL=$env:MIGRATION_DATABASE_URL
python -m alembic -c alembic.ini upgrade head
python -m alembic -c alembic.ini current
```

Import the full dataset twice:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
$env:DATABASE_URL=$env:MIGRATION_DATABASE_URL
npm.cmd run import:exercises -- C:\Users\sekip\Desktop\MoveInRange-Workspace\exercises-dataset-main\data\exercises.json
npm.cmd run import:exercises -- C:\Users\sekip\Desktop\MoveInRange-Workspace\exercises-dataset-main\data\exercises.json
```

Expected dataset evidence:

- 1324 source rows
- 1324 stored exercises
- 13240 localizations
- 0 failures
- 0 duplicate exercise IDs
- 10 locales

CLI checks:

```powershell
npx.cmd supabase --version
npx.cmd supabase login
npx.cmd supabase projects list
npx.cmd supabase link --project-ref <SUPABASE_PROJECT_REF>
```

Do not commit `.env`, database passwords, pooler URLs with passwords, or Supabase service-role keys.
