# Audit A-20260826-002 - Independent Audit + Docker Validation

Audit ID: `A-20260826-002`
Related prompt: `P-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION`
Fresh run: `CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION`
Repository: `Sekiph82/move-in-range`
Branch audited: `codex/main-consolidation`

## Independent verification policy

Historical Codex logs were treated as claims only. The current run re-executed the applicable commands and classified each gate from fresh exit codes and output. No main merge, stacked PR closure, branch deletion, or force dependency upgrade was performed.

## Current findings

- H!veAI control-system structure and canonical task ledger: `VERIFIED`.
- Docker Desktop was started by this run after the initial unavailable `docker info`; Docker server `29.5.3` became ready within the allowed window.
- `docker compose config -q`, test-profile config, test-profile build, full build, and `docker compose up -d --build`: exit `0`.
- Postgres, Redis, Mailpit, API, admin, and product web were healthy; migration jobs completed successfully. Health endpoints returned HTTP `200`.
- Docker API pytest: `36 passed`, `0 skipped`; PostgreSQL and Redis integration paths executed against Compose dependencies.
- Docker Node suite: `75 tests`, `70 passed`, `5 failed`, `0 skipped`.
- Host Node suite: `75 tests`, `65 passed`, `0 failed`, `10 legitimate environment skips`.
- Host API pytest: `34 passed`, `2 legitimate environment skips` for absent host PostgreSQL/Redis URLs.
- Format, lint, checklist, typecheck, builds, mobile web build, ruff, security scan, Expo Doctor, iOS export, Android export, clean migration, Alembic single-head, and Docker fixture import passed.
- Fresh `npm audit` and `npm audit --audit-level=high` both report `24 vulnerabilities (10 moderate, 14 high)` and exit `1`.

## Claimed versus observed

| Historical claim | Fresh observation | Classification |
| --- | --- | --- |
| Host validation green | All listed host gates pass, but host E2E/API preconditions skip 12 tests | `VERIFIED_WITH_LIMITS` |
| Docker validation blocked | Docker Desktop started and Compose stack became healthy | `REGRESSED` historical claim; Docker is available |
| Dependency count from prior artifacts | Both current audit commands report 24 total, 10 moderate, 14 high | `VERIFIED` current baseline |
| Full product acceptance green | Five stale product E2E contract assertions fail in Docker | `BLOCKED` |

The five Docker failures are recorded exactly in `CR-20260826-002`: one static readiness-route expectation, two expectations for `Step 1 of 22` while the current flow renders `Step 1 of 7`, one obsolete readiness button label, and one session-POST timing/flow expectation that does not follow the current readiness gate. A direct container Playwright diagnostic confirmed registration, profile, product routes, and API network requests work in the Compose environment.

Host skips are legitimate only for missing host E2E URLs, `TEST_DATABASE_URL`, and `REDIS_URL`; their Docker equivalents ran with zero skips where Compose supplied the dependencies. No skip was used to hide a Docker failure.

## Security observation

Pre-hardening API access logs exposed that query strings could contain one-time token values. No token value was copied into any artifact. The API Docker command was hardened with Uvicorn `--no-access-log`, the image was rebuilt, and post-hardening logs were inspected without request access-log query values. This is a logging-hardening change only; it does not claim provider or production deployment validation.

## Required follow-up

1. Decide whether the current seven-step onboarding/readiness UI is canonical, then update stale product E2E contracts or the product flow accordingly.
2. Remediate the current 14 high and 10 moderate npm advisories through a compatible, separately reviewed dependency change; do not use `npm audit fix --force`.
3. Re-run the complete Docker and host gates after those changes.
4. Complete native device, provider, and public deployment validation separately; none is claimed here.

## Verdict

`VERIFIED_WITH_BLOCKERS`

Docker and infrastructure validation is verified, but full product acceptance remains incomplete because of five product E2E contract failures and the dependency security gate remains blocked by 14 high advisories. Consolidation is not ready for a main merge.
