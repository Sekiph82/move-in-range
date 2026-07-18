import importlib
import os
import uuid

import pytest
from fastapi.testclient import TestClient


def _client(monkeypatch, database_url: str):
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("AUTH_SECRET", "postgres-integration-secret")
    settings_mod = importlib.import_module("app.settings")
    importlib.reload(settings_mod)
    settings_mod.get_settings.cache_clear()
    auth_mod = importlib.import_module("app.auth")
    importlib.reload(auth_mod)
    session_mod = importlib.import_module("app.db.session")
    importlib.reload(session_mod)
    security_mod = importlib.import_module("app.security")
    importlib.reload(security_mod)
    routes_mod = importlib.import_module("app.routes")
    importlib.reload(routes_mod)
    main_mod = importlib.import_module("app.main")
    importlib.reload(main_mod)
    return TestClient(main_mod.app), session_mod


def test_postgres_migrated_mvp_workflow(monkeypatch):
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("TEST_DATABASE_URL is not set")
    assert database_url.startswith("postgresql"), "PostgreSQL integration tests must not run against SQLite"
    client, session_mod = _client(monkeypatch, database_url)
    assert session_mod.engine.dialect.name == "postgresql"

    suffix = uuid.uuid4().hex
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": f"postgres-{suffix}@example.test", "password": "safe-postgres-passphrase"},
    )
    assert registered.status_code == 201, registered.text
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    readiness = {"energy": 3, "sleep_quality": 3, "pain": 2, "available_minutes": 10, "stress": 2}

    assert client.put("/api/v1/profile", headers=headers, json={"consent_accepted": True, **readiness}).status_code == 200
    assert client.post("/api/v1/readiness-checks", headers=headers, json=readiness).status_code == 201
    plan = client.post("/api/v1/plans/daily/generate", headers=headers, json=readiness)
    assert plan.status_code == 201, plan.text
    session = client.post("/api/v1/sessions", headers=headers, json={"plan_id": plan.json()["plan"]["id"], "resume": False})
    assert session.status_code == 201, session.text
    session_id = session.json()["session"]["id"]

    glucose = client.post("/api/v1/glucose", headers=headers, json={"value": 112, "unit": "mg/dL", "timing": "post", "session_id": session_id})
    assert glucose.status_code == 201
    first_event = client.post("/api/v1/offline-events", headers=headers, json={"event_type": "glucose", "idempotency_key": f"pg-{suffix}", "payload": {"value": 112}})
    second_event = client.post("/api/v1/offline-events", headers=headers, json={"event_type": "glucose", "idempotency_key": f"pg-{suffix}", "payload": {"value": 113}})
    assert first_event.status_code == 201
    assert second_event.json()["duplicate"] is True
    assert client.get("/api/v1/insights/summary", headers=headers).status_code == 200
