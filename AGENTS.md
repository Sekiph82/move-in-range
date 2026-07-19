# Agent Instructions

Future agents must preserve these boundaries:

- Never add diagnosis, medication advice, insulin dose calculation, basal/bolus adjustments, insulin percentages, or emergency-care claims.
- Run MedicalSafetyPolicyEngine before plan generation, workout start/resume, progression, diabetes insights, coaching, and safety-sensitive notifications.
- Preserve deterministic policy precedence: hard contraindications, clinician restrictions, symptoms, pain, equipment, environment, mobility/balance, activity level, objective, preference/variety, historical response.
- Keep health thresholds in versioned policy configuration with source and clinical-review state.
- Preserve media attribution and do not commit licensed exercise media by default.
- Do not log exact health values in routine logs or push previews.
- Maintain English and Turkish localization paths.
- Keep tests for safety, planning, diabetes context, import idempotency, authorization, offline outbox, and accessibility.
- Work on feature branches and open stacked draft PRs into the current integration branch; do not merge automatically.
- Preserve canonical local service URLs: `API_BASE_URL=http://localhost:8200` and `ADMIN_BASE_URL=http://localhost:3200`.
- Keep core mobile workflows API-backed: auth, onboarding profile, readiness, plans, exercises, sessions, glucose, insights, and offline-event sync.
- Do not reintroduce the previous API/admin development port defaults; `tests/config.test.mjs` guards this.
- Do not restore browser-controlled admin role headers such as `x-admin-role`; backend role checks must use authenticated admin tokens and database roles.
- Treat PostgreSQL as the authoritative integration path; SQLite is a limited local fallback only.
- Keep `AUTH_SECRET`, admin credentials, tokens, refresh tokens, exact glucose values, and raw health payloads out of ordinary logs.
- Keep admin login user-driven through `/login`; do not reintroduce environment-password auto-login into rendered admin pages.
- Preserve Redis-backed token revocation for production and DB-backed refresh token family replay protection.
- Keep release-candidate merge order documented in `docs/STACKED_PR_MERGE_PLAN.md`; do not merge stacked PRs out of order.
