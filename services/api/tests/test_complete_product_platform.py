import json

from app.services.platform import PROGRAM_VARIANTS, schedule_voice_cues
from test_mvp_hardening import _admin_headers, _client, _create_admin_user, _register


def test_complete_product_platform_user_workflow(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    _, headers = _register(client, "complete-platform@example.test")
    _, other_headers = _register(client, "complete-platform-other@example.test")

    onboarding = client.put(
        "/api/v1/onboarding",
        headers=headers,
        json={"step": "identity", "payload": {"preferred_name": "Aylin", "gender": "self_described"}, "completed": True, "language": "tr"},
    )
    assert onboarding.status_code == 200, onboarding.text
    assert onboarding.json()["progress"]["completed_steps"] == ["identity"]

    consent = client.post("/api/v1/consents", headers=headers, json={"consent_type": "camera_processing", "granted": True})
    assert consent.status_code == 201, consent.text
    assert client.get("/api/v1/consents", headers=other_headers).json()["items"] == []

    capacity = client.put(
        "/api/v1/capacity-profile",
        headers=headers,
        json={"payload": {"balance_level": "needs_support", "floor_rise_capacity": "unable", "walking_tolerance_minutes": 8}},
    )
    assert capacity.status_code == 200, capacity.text
    flags = capacity.json()["capacity_profile"]["derived_profile"]["flags"]
    assert "balance_support_required" in flags
    assert "no_floor_preferred" in flags

    blocked_assessment = client.post(
        "/api/v1/baseline-assessments",
        headers=headers,
        json={"assessment_type": "chair_stand", "result_payload": {"cardiac_rehabilitation": True}, "confidence": 3},
    )
    assert blocked_assessment.status_code == 409

    goals = client.put(
        "/api/v1/goals-targets",
        headers=headers,
        json={"goals": ["mobility", "strength"], "target_focuses": ["back", "core"], "natural_request": "20 minute back and core session, no floor"},
    )
    assert goals.status_code == 200, goals.text
    assert "no_floor" in goals.json()["goals"]["target_focuses"]

    plan = client.post(
        "/api/v1/plans/advanced/generate",
        headers=headers,
        json={"available_minutes": 20, "target_focuses": ["back", "core"], "equipment": ["body weight", "chair"], "no_floor": True},
    )
    assert plan.status_code == 201, plan.text
    plan_payload = plan.json()["plan"]
    assert plan_payload["generator_version"] == "program-engine-2026-07"
    assert plan_payload["items"]
    assert plan_payload["selected_exercises"]

    modified = client.post(f"/api/v1/plans/{plan_payload['id']}/modify", headers=headers, json={"intent": "make_easier", "request_payload": {"pain": 3}})
    assert modified.status_code == 200, modified.text
    assert modified.json()["modification"]["intent"] == "make_easier"
    assert client.post(f"/api/v1/plans/{plan_payload['id']}/modify", headers=other_headers, json={"intent": "make_harder"}).status_code == 404

    quick = client.post("/api/v1/quick-session", headers=headers, json={"available_minutes": 8, "pain": 2, "chair_only": True, "equipment": ["chair"]})
    assert quick.status_code == 201, quick.text
    assert quick.json()["plan"]["source"] == "what_can_i_do_today"

    voice = client.post("/api/v1/voice/cues", headers=headers, json={"payload": {"items": plan_payload["items"], "mode": "essential_cues", "language": "tr"}})
    assert voice.status_code == 200, voice.text
    assert any(cue["text"] == "Agri varsa dur" for cue in voice.json()["items"])

    glucose = client.post("/api/v1/diabetes/context", headers=headers, json={"payload": {"value": 6.1, "unit": "mmol/L", "timing": "post", "delayed_check_minutes": 30}})
    assert glucose.status_code == 201, glucose.text
    assert glucose.json()["no_insulin_recommendation"] is True
    assert client.get("/api/v1/diabetes/insights", headers=headers).status_code == 200

    provider = client.post("/api/v1/integrations/connect", headers=headers, json={"provider_key": "nightscout", "mock": True})
    assert provider.status_code == 201, provider.text
    provider_payload = provider.json()["connection"]
    assert provider_payload["status"] == "mock_connected"
    assert client.post(f"/api/v1/integrations/{provider_payload['id']}/sync", headers=headers).json()["sync"]["records_seen"] == 1

    blocked_provider = client.post("/api/v1/integrations/connect", headers=headers, json={"provider_key": "dexcom", "mock": True})
    assert blocked_provider.status_code == 201
    assert blocked_provider.json()["connection"]["status"] == "blocked_credentials"

    sample = client.post("/api/v1/wearables/samples", headers=headers, json={"payload": {"provider_key": "mock_watch", "sample_type": "heart_rate", "value_payload": {"bpm": 92}}})
    assert sample.status_code == 201, sample.text
    assert sample.json()["sample"]["provenance"]["not_sole_safety_source"] is True

    preference = client.put("/api/v1/notification-preferences", headers=headers, json={"category": "workout_reminder", "enabled": True, "quiet_hours": {"start": "21:00", "end": "07:00"}})
    assert preference.status_code == 200, preference.text
    scheduled = client.post("/api/v1/notifications/schedule", headers=headers, json={"payload": {"category": "workout_reminder"}})
    assert scheduled.status_code == 201
    assert scheduled.json()["job"]["payload"]["preview_policy"] == "private"

    export_job = client.post("/api/v1/privacy/export-jobs", headers=headers)
    deletion_job = client.post("/api/v1/privacy/deletion-jobs", headers=headers, json={"payload": {"deletion_type": "selected_health_data"}})
    assert export_job.status_code == 201
    assert deletion_job.status_code == 201
    download_url = export_job.json()["job"]["download_url"]
    download = client.get(download_url, headers=headers)
    assert download.status_code == 200, download.text
    archive = download.json()["archive"]
    assert archive["manifest"]["schema"] == "moveinrange.privacy-export.v1"
    assert "diabetes" in archive
    archive_text = json.dumps(archive).lower()
    assert "password_hash" not in archive_text
    assert "refresh_token" not in archive_text
    assert "reset_token" not in archive_text
    assert "auth_secret" not in archive_text
    assert download.json()["checksum_sha256"] == export_job.json()["job"]["payload"]["checksum_sha256"]
    listed_exports = client.get("/api/v1/privacy/export-jobs", headers=headers).json()["items"]
    assert listed_exports[0]["download_available"] is True
    assert "archive" not in listed_exports[0]["payload"]
    assert client.get("/api/v1/privacy/deletion-jobs", headers=headers).json()["items"][0]["status"] == "requested"
    assert client.get("/api/v1/privacy/export-jobs", headers=other_headers).json()["items"] == []

    caregiver = client.post("/api/v1/caregivers/invite", headers=headers, json={"email": "care@example.test", "scopes": ["session_completion"]})
    assert caregiver.status_code == 201
    caregiver_id = caregiver.json()["relationship"]["id"]
    assert client.post(f"/api/v1/caregivers/{caregiver_id}/revoke", headers=headers).json()["relationship"]["status"] == "revoked"

    professional = client.post("/api/v1/professionals/invite", headers=headers, json={"email": "pt@example.test", "role": "physiotherapist", "scopes": ["movement_restrictions"]})
    assert professional.status_code == 201
    professional_id = professional.json()["relationship"]["id"]
    restriction = client.post(f"/api/v1/professionals/{professional_id}/restrictions", headers=headers, json={"payload": {"restriction_type": "avoid_loaded_spinal_flexion"}})
    assert restriction.status_code == 201
    note = client.post(f"/api/v1/professionals/{professional_id}/notes", headers=headers, json={"payload": {"note": "Keep sessions seated this week."}})
    assert note.status_code == 201

    assert client.post("/api/v1/camera/analyze", headers=headers, json={"payload": {"exercise_id": "x", "samples": []}}).status_code == 403
    camera = client.post("/api/v1/camera/analyze", headers=headers, json={"payload": {"camera_consent": True, "exercise_id": "x", "samples": [{"phase": "rep_complete"}]}})
    assert camera.status_code == 201
    assert camera.json()["analysis"]["result"]["privacy"]["uploaded"] is False


def test_platform_service_contracts_are_deterministic():
    assert len(PROGRAM_VARIANTS) >= 20
    cues = schedule_voice_cues([{"name": "Chair march", "duration_seconds": 40, "rest_seconds": 20}], "countdown_only", "en")
    assert [cue["command"] for cue in cues] == ["prepare", "start", "ten_seconds_remaining", "session_complete"]


def test_admin_complete_platform_surfaces(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    registered, user_headers = _register(client, "admin-visible-user@example.test")
    _create_admin_user("admin-complete@example.test", "super_admin")
    _create_admin_user("admin-complete-clinical@example.test", "clinical_reviewer")
    admin_headers = _admin_headers(client, "admin-complete@example.test")
    clinical_headers = _admin_headers(client, "admin-complete-clinical@example.test")

    users = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users.status_code == 200
    assert users.json()["impersonation"] == "disabled_by_default"
    detail = client.get(f"/api/v1/admin/users/{registered['user']['id']}", headers=admin_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["user"]["email_masked"].startswith("ad***@")

    policy = client.post("/api/v1/admin/policies", headers=admin_headers, json={"version": "draft-functional-2026-07", "rules": {"pain": "reduce_or_block"}})
    assert policy.status_code == 201, policy.text
    policy_id = policy.json()["policy"]["version"]
    assert client.get(f"/api/v1/admin/policies/{policy_id}", headers=admin_headers).status_code == 200
    approved = client.post(f"/api/v1/admin/policies/{policy_id}/approve", headers=clinical_headers, json={"rationale": "Reviewed fixtures"})
    assert approved.status_code == 200, approved.text
    assert approved.json()["policy"]["clinical_review_state"] == "approved"
    published = client.post(f"/api/v1/admin/policies/{policy_id}/publish", headers=admin_headers, json={"rationale": "Ready for local validation"})
    assert published.status_code == 200, published.text
    assert published.json()["policy"]["status"] == "published"
    rolled_back = client.post(f"/api/v1/admin/policies/{policy_id}/rollback", headers=admin_headers, json={"rationale": "Stacked PR validation rollback"})
    assert rolled_back.status_code == 200, rolled_back.text
    assert rolled_back.json()["policy"]["status"] == "rolled_back"

    exercises = client.get("/api/v1/admin/exercises", headers=admin_headers)
    assert exercises.status_code == 200
    if exercises.json()["items"]:
        exercise_id = exercises.json()["items"][0]["id"]
        assert client.get(f"/api/v1/admin/exercises/{exercise_id}", headers=admin_headers).status_code == 200
        patched = client.patch(f"/api/v1/admin/exercises/{exercise_id}/safety", headers=admin_headers, json={"safety_tags": ["chair_supported"], "review_reason": "complete platform safety review"})
        assert patched.status_code == 200, patched.text

    assert client.get("/api/v1/admin/system", headers=admin_headers).status_code == 200
    assert client.post("/api/v1/diabetes/context", headers=user_headers, json={"payload": {"value": 120, "unit": "mg/dL"}}).status_code == 201
    deletion = client.post("/api/v1/privacy/deletion-jobs", headers=user_headers, json={"payload": {"deletion_type": "selected_health_data"}})
    processed = client.post(f"/api/v1/admin/privacy-jobs/deletion/{deletion.json()['job']['id']}/process", headers=admin_headers, json={"payload": {"rationale": "test"}})
    assert processed.status_code == 200, processed.text
    assert processed.json()["job"]["status"] == "completed"
    assert processed.json()["job"]["payload"]["deleted_counts"]["diabetes"] == 1
    assert processed.json()["job"]["payload"]["deleted_counts"]["sessions_revoked"] >= 1
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": registered["refresh_token"]}).status_code == 401
    assert client.get("/api/v1/admin/privacy-jobs", headers=admin_headers).status_code == 200
    assert client.get("/api/v1/admin/import-jobs", headers=admin_headers).status_code == 200
    assert client.get("/api/v1/admin/notifications", headers=admin_headers).status_code == 200
    assert client.get("/api/v1/admin/integrations", headers=admin_headers).status_code == 200
    assert client.get("/api/v1/admin/audit", headers=admin_headers).status_code == 200
    simulator = client.post("/api/v1/admin/policy-simulator", headers=admin_headers, json={"energy": 2, "sleep_quality": 3, "pain": 7, "available_minutes": 10})
    assert simulator.status_code == 200
    assert simulator.json()["simulation_id"] >= 1
