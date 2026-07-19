from datetime import UTC, datetime, timedelta
from functools import lru_cache
import hashlib
import threading

from sqlalchemy import text

from .settings import get_settings


class RateLimitExceeded(Exception):
    pass


class RateLimiter:
    backend = "base"

    def check(self, key: str, limit: int) -> None:
        raise NotImplementedError

    def cleanup_expired(self) -> int:
        return 0


class InMemoryRateLimiter(RateLimiter):
    backend = "memory"

    def __init__(self):
        self._hits: dict[str, list[datetime]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, limit: int) -> None:
        settings = get_settings()
        now = datetime.now(UTC)
        window_start = now - timedelta(seconds=settings.rate_limit_window_seconds)
        hashed = _bucket_hash(key)
        with self._lock:
            hits = [hit for hit in self._hits.get(hashed, []) if hit >= window_start]
            if len(hits) >= limit:
                raise RateLimitExceeded
            hits.append(now)
            self._hits[hashed] = hits


class PostgresRateLimiter(RateLimiter):
    backend = "postgres"

    def check(self, key: str, limit: int) -> None:
        from .db.models import RateLimitBucket
        from .db.session import SessionLocal

        settings = get_settings()
        now = datetime.now(UTC)
        window_seconds = settings.rate_limit_window_seconds
        window_started_at = datetime.fromtimestamp((int(now.timestamp()) // window_seconds) * window_seconds, UTC)
        expires_at = window_started_at + timedelta(seconds=window_seconds * 2)
        bucket_key = _bucket_hash(key)
        with SessionLocal() as db:
            dialect = db.get_bind().dialect.name
            if dialect == "postgresql":
                count = db.execute(
                    text(
                        """
                        insert into rate_limit_buckets
                          (bucket_key, window_started_at, window_seconds, request_count, limit_value, expires_at, updated_at)
                        values
                          (:bucket_key, :window_started_at, :window_seconds, 1, :limit_value, :expires_at, :updated_at)
                        on conflict (bucket_key) do update set
                          request_count = case
                            when rate_limit_buckets.window_started_at = excluded.window_started_at
                              and rate_limit_buckets.window_seconds = excluded.window_seconds
                            then rate_limit_buckets.request_count + 1
                            else 1
                          end,
                          window_started_at = excluded.window_started_at,
                          window_seconds = excluded.window_seconds,
                          limit_value = excluded.limit_value,
                          expires_at = excluded.expires_at,
                          updated_at = excluded.updated_at
                        returning request_count
                        """
                    ),
                    {
                        "bucket_key": bucket_key,
                        "window_started_at": window_started_at,
                        "window_seconds": window_seconds,
                        "limit_value": limit,
                        "expires_at": expires_at,
                        "updated_at": now,
                    },
                ).scalar_one()
                db.commit()
            else:
                bucket = db.get(RateLimitBucket, bucket_key)
                if not bucket or _as_utc(bucket.window_started_at) != window_started_at or bucket.window_seconds != window_seconds:
                    bucket = RateLimitBucket(
                        bucket_key=bucket_key,
                        window_started_at=window_started_at,
                        window_seconds=window_seconds,
                        request_count=1,
                        limit_value=limit,
                        expires_at=expires_at,
                        updated_at=now,
                    )
                    db.merge(bucket)
                    count = 1
                else:
                    bucket.request_count += 1
                    bucket.limit_value = limit
                    bucket.expires_at = expires_at
                    bucket.updated_at = now
                    count = bucket.request_count
                db.commit()
        if count > limit:
            raise RateLimitExceeded

    def cleanup_expired(self) -> int:
        from .db.models import RateLimitBucket
        from .db.session import SessionLocal

        with SessionLocal() as db:
            deleted = db.query(RateLimitBucket).filter(RateLimitBucket.expires_at <= datetime.now(UTC)).delete(synchronize_session=False)
            db.commit()
            return int(deleted)


def _bucket_hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


@lru_cache
def get_rate_limiter() -> RateLimiter:
    settings = get_settings()
    if settings.rate_limit_backend == "postgres":
        return PostgresRateLimiter()
    if settings.deployment_environment in {"production", "staging"}:
        raise RuntimeError("Durable rate limiter is required in deployment")
    return InMemoryRateLimiter()
