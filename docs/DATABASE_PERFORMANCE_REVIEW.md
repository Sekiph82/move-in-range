# Database Performance Review

## Exercise Library

The exercise list endpoint is the highest-volume MVP query because the imported dataset contains 1,324 records. The release-candidate change keeps list payloads summary-only and avoids loading localization, media, and tag rows for every list item. Detail endpoints still load localized instructions, media attribution, and safety tags for one exercise at a time.

Existing indexes cover:

- `Exercise.name`
- `Exercise.body_part`
- `Exercise.equipment`
- `Exercise.target`
- composite `ix_exercise_search`
- localization unique key `(exercise_id, locale)`

Pagination remains bounded with `page_size <= 100`.

## Sessions And Events

User-owned session and event queries filter by authenticated user id before mutation. Event idempotency is enforced with a unique `(user_id, idempotency_key)` constraint.

## Offline Events

Offline ingestion uses the database unique constraint instead of an in-memory deduplication map. Duplicate submissions return the stored event.

## Auth

Refresh-token family records are indexed by `user_id`, `family_id`, `token_id`, `token_hash`, and `expires_at`. Access-token revocation checks use Redis when available, avoiding database reads on every request.

## PostgreSQL Plans

Run the PostgreSQL review script when Docker Desktop is available:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-postgres.ps1
```

For deeper local inspection, run `EXPLAIN ANALYZE` against `/exercises` filter equivalents after full import. No complex search infrastructure is added in this PR because the current indexed fields and bounded pagination are sufficient for the MVP dataset size.
