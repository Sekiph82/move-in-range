import logging
from functools import lru_cache
from datetime import UTC, datetime, timedelta
import hashlib

from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy.exc import SQLAlchemyError

from .settings import get_settings

logger = logging.getLogger("moveinrange.revocation")


class TokenRevocationStore:
    def revoke_access_token(self, jti: str, ttl_seconds: int, user_id: str | None = None, reason: str = "logout", actor_type: str = "user", actor_id: str | None = None) -> None:
        raise NotImplementedError

    def is_access_token_revoked(self, jti: str) -> bool:
        raise NotImplementedError

    def revoke_refresh_family(self, family_id: str, ttl_seconds: int, user_id: str | None = None, reason: str = "refresh_family_revoked", actor_type: str = "system", actor_id: str | None = None) -> None:
        raise NotImplementedError

    def is_refresh_family_revoked(self, family_id: str) -> bool:
        raise NotImplementedError


class RedisTokenRevocationStore(TokenRevocationStore):
    def __init__(self, redis_url: str):
        self.client = Redis.from_url(redis_url, decode_responses=True)
        self.client.ping()

    def revoke_access_token(self, jti: str, ttl_seconds: int, user_id: str | None = None, reason: str = "logout", actor_type: str = "user", actor_id: str | None = None) -> None:
        self.client.setex(f"mir:revoked:access:{jti}", max(1, ttl_seconds), "1")

    def is_access_token_revoked(self, jti: str) -> bool:
        return bool(self.client.exists(f"mir:revoked:access:{jti}"))

    def revoke_refresh_family(self, family_id: str, ttl_seconds: int, user_id: str | None = None, reason: str = "refresh_family_revoked", actor_type: str = "system", actor_id: str | None = None) -> None:
        self.client.setex(f"mir:revoked:refresh-family:{family_id}", max(1, ttl_seconds), "1")

    def is_refresh_family_revoked(self, family_id: str) -> bool:
        return bool(self.client.exists(f"mir:revoked:refresh-family:{family_id}"))


class InMemoryTokenRevocationStore(TokenRevocationStore):
    def __init__(self):
        self.access_jtis: set[str] = set()
        self.refresh_families: set[str] = set()

    def revoke_access_token(self, jti: str, ttl_seconds: int, user_id: str | None = None, reason: str = "logout", actor_type: str = "user", actor_id: str | None = None) -> None:
        self.access_jtis.add(jti)

    def is_access_token_revoked(self, jti: str) -> bool:
        return jti in self.access_jtis

    def revoke_refresh_family(self, family_id: str, ttl_seconds: int, user_id: str | None = None, reason: str = "refresh_family_revoked", actor_type: str = "system", actor_id: str | None = None) -> None:
        self.refresh_families.add(family_id)

    def is_refresh_family_revoked(self, family_id: str) -> bool:
        return family_id in self.refresh_families


class PostgresTokenRevocationStore(TokenRevocationStore):
    backend = "postgres"

    def revoke_access_token(self, jti: str, ttl_seconds: int, user_id: str | None = None, reason: str = "logout", actor_type: str = "user", actor_id: str | None = None) -> None:
        self._revoke("access", jti, max(1, ttl_seconds), session_id=jti, user_id=user_id, token_family_id=None, reason=reason, actor_type=actor_type, actor_id=actor_id)

    def is_access_token_revoked(self, jti: str) -> bool:
        return self._is_revoked("access", jti)

    def revoke_refresh_family(self, family_id: str, ttl_seconds: int, user_id: str | None = None, reason: str = "refresh_family_revoked", actor_type: str = "system", actor_id: str | None = None) -> None:
        self._revoke("refresh_family", family_id, max(1, ttl_seconds), session_id=None, user_id=user_id, token_family_id=family_id, reason=reason, actor_type=actor_type, actor_id=actor_id)

    def is_refresh_family_revoked(self, family_id: str) -> bool:
        return self._is_revoked("refresh_family", family_id)

    def cleanup_expired(self) -> int:
        from .db.models import SessionRevocation
        from .db.session import SessionLocal

        with SessionLocal() as db:
            deleted = db.query(SessionRevocation).filter(SessionRevocation.expires_at <= datetime.now(UTC)).delete(synchronize_session=False)
            db.commit()
            return int(deleted)

    def _revoke(
        self,
        token_type: str,
        identifier: str,
        ttl_seconds: int,
        *,
        session_id: str | None,
        user_id: str | None,
        token_family_id: str | None,
        reason: str,
        actor_type: str,
        actor_id: str | None,
    ) -> None:
        from .db.models import SessionRevocation
        from .db.session import SessionLocal

        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=ttl_seconds)
        identifier_hash = _identifier_hash(identifier)
        with SessionLocal() as db:
            existing = db.query(SessionRevocation).filter(SessionRevocation.token_type == token_type, SessionRevocation.token_identifier_hash == identifier_hash).one_or_none()
            if existing:
                existing.expires_at = max(_as_utc(existing.expires_at), expires_at)
                existing.revoked_at = existing.revoked_at or now
                existing.reason = reason
                existing.actor_type = actor_type
                existing.actor_id = actor_id
                existing.metadata_redacted = {"token_material_stored": False}
            else:
                db.add(
                    SessionRevocation(
                        session_id=session_id,
                        user_id=user_id,
                        token_family_id=token_family_id,
                        token_type=token_type,
                        token_identifier_hash=identifier_hash,
                        revoked_at=now,
                        expires_at=expires_at,
                        reason=reason,
                        actor_type=actor_type,
                        actor_id=actor_id,
                        metadata_redacted={"token_material_stored": False},
                    )
                )
            db.commit()

    def _is_revoked(self, token_type: str, identifier: str) -> bool:
        from .db.models import SessionRevocation
        from .db.session import SessionLocal

        with SessionLocal() as db:
            return (
                db.query(SessionRevocation.id)
                .filter(
                    SessionRevocation.token_type == token_type,
                    SessionRevocation.token_identifier_hash == _identifier_hash(identifier),
                    SessionRevocation.expires_at > datetime.now(UTC),
                )
                .first()
                is not None
            )


def _identifier_hash(identifier: str) -> str:
    return hashlib.sha256(identifier.encode()).hexdigest()


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


@lru_cache
def get_token_revocation_store() -> TokenRevocationStore:
    settings = get_settings()
    backend = settings.session_revocation_backend
    if backend == "postgres":
        try:
            return PostgresTokenRevocationStore()
        except SQLAlchemyError as exc:
            raise RuntimeError("Postgres token revocation store could not initialize") from exc
    if backend == "redis":
        try:
            return RedisTokenRevocationStore(settings.redis_url)
        except RedisError as exc:
            if settings.deployment_environment in {"production", "staging"}:
                raise RuntimeError("Redis token revocation store could not initialize") from exc
            logger.warning("Using development-only in-memory token revocation store; not multi-instance safe.")
            return InMemoryTokenRevocationStore()
    if settings.deployment_environment in {"production", "staging"}:
        raise RuntimeError("Durable token revocation store is required in deployment")
    logger.warning("Using development-only in-memory token revocation store; not multi-instance safe.")
    return InMemoryTokenRevocationStore()
