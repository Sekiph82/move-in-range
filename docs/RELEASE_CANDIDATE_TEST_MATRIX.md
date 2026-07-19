# Release Candidate Test Matrix

| ID | Feature | Environment | Automation | Result | Evidence | Blocker | Follow-up |
|---|---|---|---|---|---|---|---|
| RC-BE-001 | API health | Local/CI | pytest | PASS | `/api/v1/health` route and CI validate | none | keep |
| RC-BE-002 | API readiness | Local/CI | pytest | PASS | `/api/v1/ready` test | none | add external uptime later |
| RC-AUTH-001 | Register/login/me | Local/CI | pytest | PASS | release-candidate API E2E | none | external IdP later |
| RC-AUTH-002 | Refresh rotation/replay | Local/CI | pytest | PASS | family revocation tests | none | add concurrent DB test with PostgreSQL |
| RC-AUTH-003 | Redis revocation | CI/Redis | pytest | PASS in CI, SKIP local without Redis | `test_redis_revocation_integration.py` | local Redis absent | use validation script |
| RC-ADMIN-001 | Login form | Node | static contract | PASS | `tests/admin-session.test.mjs` | no live browser | add Playwright browser once stable |
| RC-ADMIN-002 | Cookie policy | Node | static contract | PASS | HttpOnly/SameSite/Secure checks | no live browser | add runtime cookie assertion |
| RC-ADMIN-003 | CSRF rejection | Node | static contract | PASS | session route contract | no live browser | add Playwright/API route test |
| RC-ADMIN-004 | Role-aware nav | Node | static contract | PASS | roleNavigation assertions | none | expand as admin features grow |
| RC-PG-001 | PostgreSQL CI | GitHub Actions | CI | PASS | `validate` job | none | keep |
| RC-PG-002 | Local clean volume | Windows Docker | script | BLOCKED_BY_ENVIRONMENT | Docker daemon unavailable | Docker Desktop not running | run `scripts\validate-postgres.ps1` |
| RC-SAFE-001 | Readiness block | Local/CI | pytest | PASS | hardening tests | none | broaden symptom matrix |
| RC-SAFE-002 | Pain flow | Local/CI | pytest/Node | PASS | API and mobile tests | none | richer substitution audit later |
| RC-SAFE-003 | Symptom stop | Local/CI | pytest/Node | PASS | stopped-session tests | none | device lifecycle later |
| RC-OFF-001 | Offline idempotency | Local/CI | pytest | PASS | API E2E duplicate | none | concurrent PostgreSQL duplicate later |
| RC-OFF-002 | Offline client retry | Node | unit | PASS | account-scoped outbox tests | none | native persistence encryption later |
| RC-MOB-001 | Timer pause/resume | Node | unit | PASS | timer tests | none | native background validation |
| RC-MOB-002 | App restart recovery | Node | unit | PASS | snapshot restore tests | no device | real app restart manual |
| RC-MOB-003 | Android runtime | Android | manual | BLOCKED_BY_ENVIRONMENT | no adb/emulator/device | tooling unavailable | run manual checklist |
| RC-DATA-001 | Dataset import | Local fallback/CI fixture | script/CI | PASS partial | 1,324 SQLite fallback import; CI fixture import | local PostgreSQL blocked | full PG script later |
| RC-DATA-002 | Exercise list performance | Code review/tests | static/API | PASS | summary payload and pagination | no EXPLAIN locally | run PostgreSQL EXPLAIN |
| RC-SEC-001 | npm high audit | Local/CI | audit | PASS | high/critical gate | 13 moderate remain | track modernization |
| RC-SEC-002 | Python audit | Local | pip-audit | BLOCKED_BY_ENVIRONMENT | timed out previously | network/tool latency | rerun in CI or longer environment |
| RC-ACC-001 | Accessibility labels | Manual | checklist | UNVALIDATED | not run on device/browser | no browser/device | manual pass required |
