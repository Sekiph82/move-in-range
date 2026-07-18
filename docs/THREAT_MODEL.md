# Threat Model

Threats include account takeover, role escalation, unsafe policy publication, media licensing misuse, health-data leakage in logs/notifications, replayed offline records, stale plans, and unauthorized exports/deletions. Mitigations include auth abstraction, role checks, audit logs, redaction, idempotent outbox items, policy versioning, and prohibited-file scanning.

MVP hardening mitigations:

- Role escalation through browser-controlled headers is blocked; admin roles are loaded from the database after token validation.
- Replay of refresh tokens is blocked by rotation and hash comparison.
- Offline event replay is constrained by a unique `(user_id, idempotency_key)` database rule.
- Production startup rejects weak signing-secret and wildcard CORS configurations.
- Object identifiers use an anti-enumeration policy: cross-user access returns 404 for user-owned health records.

Remaining risks:

- Local access-token revocation is process-local until backed by Redis or persistent storage.
- Device SecureStore, backgrounding, and app restart behavior require real-device validation before production claims.
- Clinical policy publication remains draft-only and needs reviewer workflow completion.
