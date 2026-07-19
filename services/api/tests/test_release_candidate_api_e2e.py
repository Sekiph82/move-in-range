import importlib
from pathlib import Path

from fastapi.testclient import TestClient


def _client(tmp_path, monkeypatch, **env):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'rc-e2e.db'}")
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    settings_mod = importlib.import_module("app.settings")
    importlib.reload(settings_mod)
    settings_mod.get_settings.cache_clear()
    revocation_mod = importlib.import_module("app.revocation")
    importlib.reload(revocation_mod)
    revocation_mod.get_token_revocation_store.cache_clear()
    auth_mod = importlib.import_module("app.auth")
    importlib.reload(auth_mod)
    session_mod = importlib.import_module("app.db.session")
    importlib.reload(session_mod)
    importlib.import_module("app.db.models")
    importer = importlib.import_module("app.scripts.import_exercises")
    importlib.reload(importer)
    session_mod.init_db()
    importer.import_dataset(Path(__file__).parents[3] / "tests/fixtures/exercises.sample.json")
    security_mod = importlib.import_module("app.security")
    importlib.reload(security_mod)
    routes_mod = importlib.import_module("app.routes")
    importlib.reload(routes_mod)
    main_mod = importlib.import_module("app.main")
    importlib.reload(main_mod)
    return TestClient(main_mod.app)


def _auth_headers(payload):
    return {"Authorization": f"Bearer {payload['access_token']}"}


def test_release_candidate_api_e2e_workflow(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch, REDIS_URL="redis://localhost:1/0")
    register = client.post("/api/v1/auth/register", json={"email": "rc-a@example.test", "password": "MoveInRange1"})
    assert register.status_code == 201, register.text
    login = client.post("/api/v1/auth/login", json={"email": "rc-a@example.test", "password": "MoveInRange1"})
    assert login.status_code == 200, login.text
    auth = login.json()
    headers = _auth_headers(auth)

    assert client.get("/api/v1/auth/me", headers=headers).json()["email"] == "rc-a@example.test"
    profile = client.put(
        "/api/v1/profile",
        headers=headers,
        json={
            "preferred_name": "Release",
            "conditions": ["type_2_diabetes", "knee_sensitivity"],
            "sensitivities": {"knee": {"severity": 2}},
            "equipment": ["body weight", "chair"],
            "diabetes": {"enabled": True, "unit": "mg/dL"},
            "preferred_training_days": ["Mon", "Wed", "Fri"],
            "consent_accepted": True,
            "onboarding_complete": True,
            "language": "tr",
        },
    )
    assert profile.status_code == 200
    assert client.put("/api/v1/profile/conditions", headers=headers, json={"conditions": ["type_2_diabetes"]}).status_code == 200
    assert client.put("/api/v1/profile/sensitivities", headers=headers, json={"sensitivities": {"knee": {"severity": 3}}}).status_code == 200
    assert client.put("/api/v1/profile/equipment", headers=headers, json={"equipment": ["body weight", "chair"]}).status_code == 200

    readiness_payload = {"energy": 3, "sleep_quality": 4, "pain": 2, "available_minutes": 15, "stress": 2}
    assert client.post("/api/v1/readiness-checks", headers=headers, json=readiness_payload).status_code == 201
    daily = client.post("/api/v1/plans/daily/generate", headers=headers, json=readiness_payload)
    weekly = client.post("/api/v1/plans/weekly/generate", headers=headers)
    monthly = client.post("/api/v1/plans/monthly/generate", headers=headers)
    assert daily.status_code == 201
    assert weekly.status_code == 201
    assert monthly.status_code == 201
    plan = daily.json()["plan"]

    exercises = client.get("/api/v1/exercises?page=1&page_size=2&equipment=body%20weight", headers=headers)
    assert exercises.status_code == 200
    exercise_id = exercises.json()["items"][0]["id"]
    detail = client.get(f"/api/v1/exercises/{exercise_id}?language=tr", headers=headers)
    assert detail.status_code == 200
    assert "tr" in detail.json()["locales"]

    session = client.post("/api/v1/sessions", headers=headers, json={"plan_id": plan["id"], "resume": False})
    assert session.status_code == 201
    session_id = session.json()["session"]["id"]
    assert client.post(f"/api/v1/sessions/{session_id}/events", headers=headers, json={"event_type": "pause", "idempotency_key": "pause-1"}).status_code == 201
    assert client.post(f"/api/v1/sessions/{session_id}/events", headers=headers, json={"event_type": "resume", "idempotency_key": "resume-1"}).status_code == 201
    substitutions = client.get(f"/api/v1/exercises/{exercise_id}/substitutions", headers=headers)
    assert substitutions.status_code == 200
    assert client.post(f"/api/v1/sessions/{session_id}/events", headers=headers, json={"event_type": "substitution", "idempotency_key": "sub-1", "payload": {"from": exercise_id}}).status_code == 201
    pain = client.post(f"/api/v1/sessions/{session_id}/pain", headers=headers, json={"location": "knee", "severity": 4, "idempotency_key": "pain-rc"})
    assert pain.status_code == 200
    assert client.post(f"/api/v1/sessions/{session_id}/complete", headers=headers, json={"completed": True, "actual_duration": 15}).status_code == 200
    assert client.post("/api/v1/glucose", headers=headers, json={"value": 112, "unit": "mg/dL", "timing": "post", "session_id": session_id}).status_code == 201
    assert client.get("/api/v1/insights/summary", headers=headers).status_code == 200

    offline = client.post("/api/v1/offline-events", headers=headers, json={"event_type": "glucose", "idempotency_key": "offline-rc", "payload": {"value": 112}})
    duplicate = client.post("/api/v1/offline-events", headers=headers, json={"event_type": "glucose", "idempotency_key": "offline-rc", "payload": {"value": 113}})
    assert offline.status_code == 201
    assert duplicate.json()["duplicate"] is True

    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": auth["refresh_token"]})
    assert refreshed.status_code == 200
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": auth["refresh_token"]}).status_code == 401
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": refreshed.json()["refresh_token"]}).status_code == 401
    assert client.post("/api/v1/auth/logout", headers=_auth_headers(refreshed.json())).status_code == 200
    assert client.get("/api/v1/auth/me", headers=_auth_headers(refreshed.json())).status_code == 401

    user_b = client.post("/api/v1/auth/register", json={"email": "rc-b@example.test", "password": "MoveInRange1"}).json()
    user_b_headers = _auth_headers(user_b)
    assert client.patch(f"/api/v1/sessions/{session_id}", headers=user_b_headers, json={"elapsed_seconds": 1}).status_code == 404
    assert client.post(f"/api/v1/sessions/{session_id}/events", headers=user_b_headers, json={"event_type": "pause"}).status_code == 404
    assert client.post("/api/v1/glucose", headers=user_b_headers, json={"value": 100, "session_id": session_id}).status_code == 404
