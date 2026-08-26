# Prompt P-20260826-002 — Independent Audit + Docker Validation

Prompt ID: `P-20260826-002`
Slug: `INDEPENDENT-AUDIT-DOCKER-VALIDATION`
Expected Codex run log: `.hiveai/codex-runs/CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`
Expected independent audit: `.hiveai/audits/A-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`

## Mission

Continue work from the H!veAI control system, but do not trust prior Codex PASS/BLOCKED claims as proof. Independently re-run the applicable validation against the current branch, make Docker available yourself when possible, reconcile task evidence, and write a fresh run log tied to this prompt ID/title.

## Mandatory read order

Read and obey:

1. `.hiveai/INDEX.md`
2. `.hiveai/PROJECT_DASHBOARD.md`
3. `TASKS.md`
4. `.hiveai/audits/CURRENT.md`
5. `.hiveai/prompts/CURRENT.md`
6. `.hiveai/handoffs/LATEST.md`
7. latest relevant `.hiveai/codex-runs/*.md`
8. `AGENTS.md`

## Independent verification rule

Historical run logs are claims, not current proof. For every relevant claimed PASS/BLOCKED result:

1. identify the exact command/evidence;
2. run it again on the current branch;
3. capture the real exit code and meaningful output;
4. classify the result as `VERIFIED`, `REGRESSED`, `UNVERIFIED`, or `BLOCKED`;
5. update `TASKS.md` only from current evidence.

A task may not become DONE from a Codex log alone. DONE requires implementation + independent verification + evidence.

## Docker Desktop protocol

Docker being stopped is not enough to mark Docker validation BLOCKED.

First run:

```powershell
docker info
```

If unavailable, attempt to start Docker Desktop. Preferred path:

```powershell
$dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktop) {
    Start-Process $dockerDesktop
}
```

If not found there, discover the actual installation path before declaring a blocker.

Wait up to 5 minutes for the Linux engine:

```powershell
$deadline = (Get-Date).AddMinutes(5)
do {
    Start-Sleep -Seconds 5
    docker info *> $null
    $ready = $LASTEXITCODE -eq 0
} until ($ready -or (Get-Date) -gt $deadline)

if (-not $ready) {
    throw "Docker engine did not become ready within the allowed startup window."
}
```

Track whether this run started Docker Desktop. If Docker Desktop was already running, do not shut it down. If this run started it solely for validation, shut it down after validation if safe.

## Docker validation

Once Docker is available, run applicable repository validation including:

```powershell
docker compose config
docker compose --profile test config
docker compose --profile test build
docker compose up -d --build
docker compose ps
docker compose --profile test run --rm tests
```

Inspect health/logs. Verify Postgres and Redis integration tests actually execute rather than remain skipped when Docker supplies the dependencies.

After validation, clean repository containers:

```powershell
docker compose --profile test down --remove-orphans
```

If this run started Docker Desktop, prefer:

```powershell
docker desktop --help
```

and, when supported:

```powershell
docker desktop stop
```

Otherwise use a safe shutdown method only for Docker Desktop processes started by this run. Do not kill unrelated user workloads.

## Dependency audit

Do not trust historical vulnerability counts. Run current:

```powershell
npm.cmd audit
npm.cmd audit --audit-level=high
```

Record the exact current counts and affected packages. Reconcile discrepancies between prior run logs and `TASKS.md`. Do not use `npm audit fix --force` and do not force major Expo/Next upgrades without an authorized task.

## Full validation

Run applicable checks:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run checklist:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run mobile:web:build
npm.cmd run security:check
ruff check services/api
python -m pytest services/api/tests -q
npx.cmd expo-doctor
npx.cmd expo export --platform ios --clear
npx.cmd expo export --platform android --clear
```

Also:

- inspect Alembic lineage and confirm exactly one head;
- migrate a clean temporary database;
- run PostgreSQL/Redis integration through Docker when available;
- inspect branch, working tree, recent commits, and task-start diff;
- verify no unexpected files, secrets, local-only paths, or unsupported status claims are introduced.

## Required artifacts

Create/update:

- `.hiveai/codex-runs/CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`
- `.hiveai/audits/A-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`
- `.hiveai/audits/CURRENT.md`
- `.hiveai/handoffs/LATEST.md`
- `TASKS.md`

The audit must list claimed result vs independently observed result, exact commands, test counts, skips, Docker lifecycle, dependency baseline, discrepancies, blockers, and final verdict.

Allowed audit verdicts:

- `VERIFIED`
- `VERIFIED_WITH_BLOCKERS`
- `FAILED`
- `INCOMPLETE`

## Branch safety

Do not merge `main`, delete historical branches, close stacked PRs, or force dependency upgrades unless the canonical task ledger explicitly authorizes it.

## Final response

Report only current verified state. Do not copy PASS status from prior logs. Include the created run-log path and audit path.