import importlib
from pathlib import Path
from fastapi.testclient import TestClient


def _client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'mvp.db'}")
    settings_mod = importlib.import_module("app.settings")
    importlib.reload(settings_mod)
    settings_mod.get_settings.cache_clear()
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


def _register(client, email):
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "MoveInRange1"})
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_functional_mvp_workflow(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    headers = _register(client, "mover@example.test")

    profile_response = client.put(
        "/api/v1/profile",
        headers=headers,
        json={
            "preferred_name": "Aylin",
            "country": "TR",
            "timezone": "Europe/Istanbul",
            "language": "tr",
            "conditions": ["type_2_diabetes", "knee_sensitivity"],
            "sensitivities": {"knee": {"bilateral": True, "severity": 3}},
            "equipment": ["body weight", "chair"],
            "goals": ["mobility", "glucose-management support"],
            "medical_clearance": "cleared",
            "consent_accepted": True,
            "diabetes": {"enabled": True, "unit": "mg/dL"},
        },
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["profile"]["onboarding_complete"] is True

    readiness = client.post(
        "/api/v1/readiness-checks",
        headers=headers,
        json={"energy": 3, "sleep_quality": 4, "pain": 2, "available_minutes": 15, "stress": 2},
    )
    assert readiness.status_code == 201
    assert readiness.json()["decision"]["action"] == "READY"

    plan = client.post("/api/v1/plans/daily/generate", headers=headers, json={"energy": 3, "sleep_quality": 4, "pain": 2, "available_minutes": 15, "stress": 2})
    assert plan.status_code == 201
    plan_payload = plan.json()["plan"]
    assert sum(item["duration_seconds"] for item in plan_payload["items"]) == 15 * 60
    first_item = plan_payload["items"][0]
    assert first_item["exercise_id"]
    assert first_item["preparation_seconds"] == 5
    assert first_item["work_seconds"] == first_item["duration_seconds"]
    assert first_item["rest_seconds"] > 0
    assert first_item["media"]["validation_state"] in {"approved", "requires_review"}
    assert first_item["availability"] in {"playable", "fallback"}
    assert first_item["position"] in {"standing", "seated", "floor", "kneeling", "supported"}
    assert first_item["difficulty"] in {"gentle", "moderate", "advanced"}
    assert first_item["impact"] in {"low", "moderate", "high"}
    assert first_item["instructions"]

    weekly = client.post("/api/v1/plans/weekly/generate", headers=headers)
    monthly = client.post("/api/v1/plans/monthly/generate", headers=headers)
    assert weekly.status_code == 201
    week_payload = weekly.json()["plan"]
    assert len(week_payload["days"]) == 7
    assert week_payload["total_planned_minutes"] >= 0
    assert all("date" in day and "focus" in day and "actions" in day for day in week_payload["days"])
    assert monthly.status_code == 201
    month_payload = monthly.json()["plan"]
    assert len(month_payload["weeks"]) == 4
    assert month_payload["timeline"] == ["Adaptation", "Consistency", "Gentle progression", "Recovery and reassessment"]
    assert all(len(week["days"]) == 7 for week in month_payload["weeks"])

    exercises = client.get("/api/v1/exercises?language=tr", headers=headers)
    assert exercises.status_code == 200
    first_list_item = exercises.json()["items"][0]
    assert first_list_item["media"]["validation_state"] in {"approved", "requires_review"}
    assert "raw_gif_path_present" in first_list_item["media"]
    assert first_list_item["preparation_seconds"] == 5
    first_exercise = first_list_item["id"]
    detail = client.get(f"/api/v1/exercises/{first_exercise}?language=tr", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["instruction_steps"]
    assert "tr" in detail.json()["locales"]
    assert detail.json()["media"]["validation_state"] in {"approved", "requires_review"}

    session = client.post("/api/v1/sessions", headers=headers, json={"plan_id": plan_payload["id"]})
    assert session.status_code == 201
    session_id = session.json()["session"]["id"]

    pain = client.post("/api/v1/sessions/{}/pain".format(session_id), headers=headers, json={"location": "knee", "severity": 4, "idempotency_key": "pain-1"})
    duplicate = client.post("/api/v1/sessions/{}/pain".format(session_id), headers=headers, json={"location": "knee", "severity": 4, "idempotency_key": "pain-1"})
    assert pain.status_code == 200
    assert duplicate.json()["duplicate"] is True
    assert pain.json()["action"] == "offer_approved_substitution"

    complete = client.post("/api/v1/sessions/{}/complete".format(session_id), headers=headers, json={"completed": True, "actual_duration": 14, "perceived_exertion": 3})
    assert complete.status_code == 200
    glucose = client.post("/api/v1/glucose", headers=headers, json={"value": 6.0, "unit": "mmol/L", "timing": "post", "session_id": session_id})
    assert glucose.status_code == 201
    assert glucose.json()["entry"]["canonical_mg_dl"] == 108
    assert glucose.json()["no_insulin_recommendation"] is True

    insights = client.get("/api/v1/insights/summary", headers=headers)
    assert insights.status_code == 200
    assert insights.json()["sessions_completed"] == 1
    assert "not an insulin or treatment recommendation" in insights.json()["glucose"]["disclaimer"].lower()


def test_user_isolation_for_plans_and_sessions(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    user_a = _register(client, "a@example.test")
    user_b = _register(client, "b@example.test")
    plan = client.post("/api/v1/plans/daily/generate", headers=user_a, json={"energy": 3, "sleep_quality": 3, "pain": 1, "available_minutes": 10, "stress": 2}).json()["plan"]
    session = client.post("/api/v1/sessions", headers=user_a, json={"plan_id": plan["id"]}).json()["session"]
    assert client.patch(f"/api/v1/sessions/{session['id']}", headers=user_b, json={"elapsed_seconds": 20}).status_code == 404
    assert client.post("/api/v1/sessions", headers=user_b, json={"plan_id": plan["id"], "resume": False}).status_code == 404
