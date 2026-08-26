# Closed Beta Final Security Review

Date: 2026-07-19

## Reviewed Areas

- [x] COMPLETE generic admin mutation removal
  - Evidence: `apps/admin/app/api/admin-session/mutate/route.ts` now accepts typed `operation` values only.
  - Risk status: arbitrary browser-supplied admin paths and methods rejected.

- [x] COMPLETE admin operation allowlist and validation
  - Evidence: operation-specific fields, required fields, enum checks, unknown-field rejection, role checks, CSRF validation.
  - Tests: `tests/admin.test.mjs`, `tests/browser-e2e.test.mjs`.

- [x] COMPLETE password reset token storage and email delivery
  - Evidence: reset tokens are hashed, single-use, expiring, and delivered by SMTP in Docker via Mailpit.
  - Tests: `tests/product-ui-e2e.test.mjs`, `services/api/tests/test_mvp_hardening.py`.

- [x] COMPLETE privacy export authorization and download expiry
  - Evidence: export download uses owner-bound expiring token hash, checksum, manifest, and audit metadata.
  - Tests: `services/api/tests/test_complete_product_platform.py`, product UI E2E.

- [x] COMPLETE product-web CORS and local service isolation
  - Evidence: compose CORS includes `product-web:3210` and localhost `3210`; no secrets copied into Docker files.

- [x] COMPLETE local production guardrails
  - Evidence: production settings reject console email preview; Docker uses explicit development environment and non-secret local values.

## Dependency Security

- `npm audit --audit-level=high`: PASS, exit 0.
- Remaining advisories: 14 moderate advisories in Expo/Next transitive dependencies (`postcss`, `uuid` via Expo config tooling).
- Resolution status: not force-upgraded because `npm audit fix --force` proposes breaking major changes. Track in a dedicated dependency modernization PR with mobile/admin regression coverage.

## Production-Rejection Requirements

- Dev reset preview: rejected in production by settings validation.
- Default secrets: rejected by existing production settings validation.
- Insecure admin cookies: production must set secure cookies.
- In-memory revocation: deployment must use durable PostgreSQL revocation unless Redis is explicitly selected for a non-zero-cost environment.
- Mailpit: local-only service; not present in production deployment config.
- Localhost public URLs: production configuration must provide real public app/API origins.
