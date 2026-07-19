import importlib
import os

import pytest
from redis import Redis
from redis.exceptions import RedisError


def test_redis_revocation_store_when_available(monkeypatch):
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        pytest.skip("REDIS_URL is not set")
    try:
        Redis.from_url(redis_url).ping()
    except RedisError:
        pytest.skip("Redis is not available")

    monkeypatch.setenv("REDIS_URL", redis_url)
    monkeypatch.setenv("ENVIRONMENT", "development")
    settings_mod = importlib.import_module("app.settings")
    settings_mod.get_settings.cache_clear()
    revocation_mod = importlib.import_module("app.revocation")
    revocation_mod.get_token_revocation_store.cache_clear()
    store = revocation_mod.get_token_revocation_store()
    assert store.__class__.__name__ == "RedisTokenRevocationStore"
    store.revoke_access_token("redis-test-access", 30)
    store.revoke_refresh_family("redis-test-family", 30)
    assert store.is_access_token_revoked("redis-test-access") is True
    assert store.is_refresh_family_revoked("redis-test-family") is True
