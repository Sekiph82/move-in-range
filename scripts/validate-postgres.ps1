$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)

docker info *> $null
docker compose up -d postgres redis

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker compose exec -T postgres pg_isready -U moveinrange *> $null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  throw "PostgreSQL did not become healthy."
}

docker compose exec -T postgres sh -lc "createdb -U moveinrange moveinrange_test 2>/dev/null || true"

$env:DATABASE_URL = "postgresql+psycopg://moveinrange:moveinrange@localhost:5432/moveinrange"
$env:TEST_DATABASE_URL = "postgresql+psycopg://moveinrange:moveinrange@localhost:5432/moveinrange_test"
$env:REDIS_URL = "redis://localhost:6379/0"
$env:AUTH_SECRET = "local-postgres-validation-secret"

if ($env:DATABASE_URL -notlike "postgresql*") { throw "DATABASE_URL must be PostgreSQL." }
if ($env:TEST_DATABASE_URL -notlike "postgresql*") { throw "TEST_DATABASE_URL must be PostgreSQL." }
if ($env:DATABASE_URL -eq $env:TEST_DATABASE_URL) { throw "DATABASE_URL and TEST_DATABASE_URL must be different." }

npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
python -m pytest services/api/tests
