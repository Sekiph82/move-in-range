import logging
from functools import lru_cache

from redis import Redis
from redis.exceptions import RedisError

from .settings import get_settings

logger = logging.getLogger("moveinrange.revocation")


class TokenRevocationStore:
    def revoke_access_token(self, jti: str, ttl_seconds: int) -> None:
        raise NotImplementedError

    def is_access_token_revoked(self, jti: str) -> bool:
        raise NotImplementedError

    def revoke_refresh_family(self, family_id: str, ttl_seconds: int) -> None:
        raise NotImplementedError

    def is_refresh_family_revoked(self, family_id: str) -> bool:
        raise NotImplementedError


class RedisTokenRevocationStore(TokenRevocationStore):
    def __init__(self, redis_url: str):
        self.client = Redis.from_url(redis_url, decode_responses=True)
        self.client.ping()

    def revoke_access_token(self, jti: str, ttl_seconds: int) -> None:
        self.client.setex(f"mir:revoked:access:{jti}", max(1, ttl_seconds), "1")

    def is_access_token_revoked(self, jti: str) -> bool:
        return bool(self.client.exists(f"mir:revoked:access:{jti}"))

    def revoke_refresh_family(self, family_id: str, ttl_seconds: int) -> None:
        self.client.setex(f"mir:revoked:refresh-family:{family_id}", max(1, ttl_seconds), "1")

    def is_refresh_family_revoked(self, family_id: str) -> bool:
        return bool(self.client.exists(f"mir:revoked:refresh-family:{family_id}"))


class InMemoryTokenRevocationStore(TokenRevocationStore):
    def __init__(self):
        self.access_jtis: set[str] = set()
        self.refresh_families: set[str] = set()

    def revoke_access_token(self, jti: str, ttl_seconds: int) -> None:
        self.access_jtis.add(jti)

    def is_access_token_revoked(self, jti: str) -> bool:
        return jti in self.access_jtis

    def revoke_refresh_family(self, family_id: str, ttl_seconds: int) -> None:
        self.refresh_families.add(family_id)

    def is_refresh_family_revoked(self, family_id: str) -> bool:
        return family_id in self.refresh_families


@lru_cache
def get_token_revocation_store() -> TokenRevocationStore:
    settings = get_settings()
    try:
        return RedisTokenRevocationStore(settings.redis_url)
    except RedisError as exc:
        if settings.environment.lower() == "production":
            raise RuntimeError("Redis token revocation store is required in production") from exc
        logger.warning("Using development-only in-memory token revocation store; not multi-instance safe.")
        return InMemoryTokenRevocationStore()
