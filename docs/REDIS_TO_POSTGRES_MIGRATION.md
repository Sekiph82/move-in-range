# Redis to PostgreSQL Migration

Date: 2026-07-19

MoveInRange staging no longer requires Redis, Upstash, or another cache provider. Redis remains optional for local Docker regression only.

| Former use | Previous behavior | PostgreSQL replacement | Status |
| --- | --- | --- | --- |
| Session revocation | `RedisTokenRevocationStore` stored revoked access JTIs and refresh-family ids with TTL keys | `session_revocations` stores hashed identifiers, user/session/family metadata, reason, actor, revoked/expiry timestamps | Complete |
| Refresh invalidation | Refresh token rows were persisted in `auth_refresh_tokens`, with Redis family flags as a fast multi-instance deny list | `auth_refresh_tokens` remains authoritative; `session_revocations` adds durable family deny-list lookup | Complete |
| Rate limiting | Process-local `_rate_limits` dict in `routes.py` | `rate_limit_buckets` with hashed bucket keys and PostgreSQL atomic UPSERT | Complete |
| Temporary token state | Password reset tokens persisted in `password_reset_tokens`; no Redis requirement | Unchanged; reset token hashes remain in PostgreSQL | Complete |
| Idempotency | Session/offline event uniqueness in PostgreSQL | Unchanged; unique `(user_id, idempotency_key)` constraints | Complete |
| Job queue | Privacy, notification, integration jobs persisted in PostgreSQL tables | Existing job tables remain; generic `background_jobs` added for serverless-triggered beta batches | Complete |
| Health/readiness | `/ready` reported Redis revocation or dev memory fallback | `/ready` reports `session_revocation=postgres`, `rate_limiter=postgres`, migration head, dataset availability, and Resend status | Complete |
| Cache | No required application cache was found | No cache provider required for staging | Complete |

No raw access token, raw refresh token, password, reset token, or unredacted health payload is stored in replacement tables.

Deployment values:

```env
SESSION_REVOCATION_BACKEND=postgres
RATE_LIMIT_BACKEND=postgres
```

Optional local Redis coverage:

```env
SESSION_REVOCATION_BACKEND=redis
REDIS_URL=redis://localhost:6379/0
```

`memory` is development-only and rejected for staging/production.
