import hashlib
import importlib
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _client(tmp_path, monkeypatch, **env):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'hardening.db'}")
    monkeypatch.setenv("LOCAL_ADMIN_EMAIL", env.pop("LOCAL_ADMIN_EMAIL", "admin@moveinrange.local"))
    monkeypatch.setenv("LOCAL_ADMIN_PASSWORD", env.pop("LOCAL_ADMIN_PASSWORD", "MoveInRangeAdminLocal!"))
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    settings_mod = importlib.import_module("app.settings")
    importlib.reload(settings_mod)
    settings_mod.get_settings.cache_clear()
    revocation_mod = importlib.import_module("app.revocation")
    importlib.reload(revocation_mod)
    revocation_mod.get_token_revocation_store.cache_clear()
    rate_limit_mod = importlib.import_module("app.rate_limit")
    importlib.reload(rate_limit_mod)
    rate_limit_mod.get_rate_limiter.cache_clear()
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


def _register(client, email):
    response = client.post("/api/v1/auth/register", json={"email": email, "password": "MoveInRange1"})
    assert response.status_code == 201, response.text
    payload = response.json()
    return payload, {"Authorization": f"Bearer {payload['access_token']}"}


def _create_admin_user(email, role):
    auth_mod = importlib.import_module("app.auth")
    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        db.add(
            models.User(
                id="adm_" + hashlib.sha256(email.encode()).hexdigest()[:16],
                email=email,
                password_hash=auth_mod.hash_password("MoveInRangeAdmin1"),
                auth_provider="local",
                role=role,
            )
        )
        db.commit()


def _admin_headers(client, email):
    response = client.post("/api/v1/admin/auth/login", json={"email": email, "password": "MoveInRangeAdmin1"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_admin_routes_require_token_and_enforce_roles(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    _create_admin_user("clinical@example.test", "clinical_reviewer")
    _create_admin_user("support@example.test", "support")
    _, user_headers = _register(client, "regular@example.test")
    clinical_headers = _admin_headers(client, "clinical@example.test")
    support_headers = _admin_headers(client, "support@example.test")

    assert client.get("/api/v1/admin/policies").status_code == 401
    assert client.get("/api/v1/admin/policies", headers={"x-admin-role": "clinical_reviewer"}).status_code == 401
    assert client.get("/api/v1/admin/policies", headers=user_headers).status_code == 403
    assert client.get("/api/v1/admin/policies", headers=clinical_headers).status_code == 200
    assert client.get("/api/v1/admin/audit-logs", headers=clinical_headers).status_code == 403
    assert client.get("/api/v1/admin/audit-logs", headers=support_headers).status_code == 200


def test_admin_local_login_bootstraps_super_admin_without_role_header(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    login = client.post(
        "/api/v1/admin/auth/login",
        json={"email": "admin@moveinrange.local", "password": "MoveInRangeAdminLocal!"},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/api/v1/admin/auth/me", headers=headers).json()["admin"]["role"] == "super_admin"
    assert client.get("/api/v1/admin/audit-logs", headers=headers).status_code == 200


def test_release_rehearsal_admin_rbac_matrix_and_separation(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    for email, role in {
        "super@example.test": "super_admin",
        "clinical-rbac@example.test": "clinical_reviewer",
        "content-rbac@example.test": "content_editor",
        "support-rbac@example.test": "support",
        "analyst-rbac@example.test": "analyst",
    }.items():
        _create_admin_user(email, role)
    user_payload, _ = _register(client, "rbac-user@example.test")
    super_headers = _admin_headers(client, "super@example.test")
    clinical_headers = _admin_headers(client, "clinical-rbac@example.test")
    content_headers = _admin_headers(client, "content-rbac@example.test")
    support_headers = _admin_headers(client, "support-rbac@example.test")
    analyst_headers = _admin_headers(client, "analyst-rbac@example.test")

    assert client.patch(f"/api/v1/admin/users/{user_payload['user']['id']}", headers=support_headers, json={"payload": {"action": "update_role", "role": "analyst", "reason": "not allowed"}}).status_code == 403
    role_update = client.patch(f"/api/v1/admin/users/{user_payload['user']['id']}", headers=super_headers, json={"payload": {"action": "update_role", "role": "analyst", "reason": "release rehearsal"}})
    assert role_update.status_code == 200, role_update.text
    assert role_update.json()["user"]["role"] == "analyst"

    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        user = db.get(models.User, user_payload["user"]["id"])
        connection = models.ProviderConnection(user_id=user.id, provider_key="nightscout", category="glucose", status="mock_connected", scopes=["read"], token_reference="token_ref")
        db.add(connection)
        clinical = db.query(models.User).filter(models.User.email == "clinical-rbac@example.test").one()
        self_policy = models.PolicyVersion(version="self-approval-rbac", status="submitted", rules={"source": "test"}, clinical_review_state="submitted", creator_id=clinical.id, submitter_id=clinical.id)
        db.add(self_policy)
        db.commit()
        connection_id = connection.id

    assert client.post(f"/api/v1/admin/integrations/{connection_id}/disable", headers=analyst_headers).status_code == 403
    assert client.post(f"/api/v1/admin/integrations/{connection_id}/retry-sync", headers=analyst_headers).status_code == 200
    assert client.post(f"/api/v1/admin/integrations/{connection_id}/disable", headers=super_headers).status_code == 200

    policy_version = "release-rbac-policy"
    created = client.post("/api/v1/admin/policies", headers=content_headers, json={"version": policy_version, "clinical_review_state": "submitted", "rules": {"source": "rbac"}})
    assert created.status_code == 422, created.text
    created = client.post("/api/v1/admin/policies", headers=content_headers, json={"version": policy_version, "rules": {"source": "rbac"}})
    assert created.status_code == 201, created.text
    forbidden_direct_update = client.patch(f"/api/v1/admin/policies/{policy_version}", headers=content_headers, json={"payload": {"status": "submitted", "clinical_review_state": "submitted"}})
    assert forbidden_direct_update.status_code == 422
    submitted = client.post(f"/api/v1/admin/policies/{policy_version}/submit", headers=content_headers, json={"rationale": "submit for clinical review"})
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["policy"]["clinical_review_state"] == "submitted"
    assert client.post(f"/api/v1/admin/policies/{policy_version}/approve", headers=content_headers, json={"rationale": "content cannot approve"}).status_code == 403
    assert client.post(f"/api/v1/admin/policies/{policy_version}/publish", headers=clinical_headers, json={"rationale": "clinical cannot publish"}).status_code == 403
    approved = client.post(f"/api/v1/admin/policies/{policy_version}/approve", headers=clinical_headers, json={"rationale": "clinical approval"})
    assert approved.status_code == 200, approved.text
    assert approved.json()["policy"]["approver_id"]
    published = client.post(f"/api/v1/admin/policies/{policy_version}/publish", headers=super_headers, json={"rationale": "super-admin publish"})
    assert published.status_code == 200, published.text
    assert published.json()["policy"]["publisher_id"]
    assert client.post("/api/v1/admin/policies/self-approval-rbac/approve", headers=clinical_headers, json={"rationale": "self approve"}).status_code == 409

    with session_mod.SessionLocal() as db:
        denied = db.query(models.AuditLog).filter(models.AuditLog.action.like("%.denied")).all()
        assert {item.action for item in denied} >= {"admin.user.update_role.denied", "admin.integration.disable.denied", "admin.policy.approved.denied"}


def test_exercise_admin_operations_are_split_by_role_and_payload(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    for email, role in {
        "exercise-super@example.test": "super_admin",
        "exercise-reviewer@example.test": "exercise_reviewer",
        "exercise-content@example.test": "content_editor",
        "exercise-clinical@example.test": "clinical_reviewer",
        "exercise-support@example.test": "support",
        "exercise-analyst@example.test": "analyst",
    }.items():
        _create_admin_user(email, role)
    headers = {role: _admin_headers(client, email) for email, role in {
        "exercise-super@example.test": "super_admin",
        "exercise-reviewer@example.test": "exercise_reviewer",
        "exercise-content@example.test": "content_editor",
        "exercise-clinical@example.test": "clinical_reviewer",
        "exercise-support@example.test": "support",
        "exercise-analyst@example.test": "analyst",
    }.items()}
    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        exercise = models.Exercise(id="exercise-rbac-split-main", source_id="rbac-split-main", slug="rbac-split-main", name="RBAC split main", body_part="legs", equipment="chair", target="mobility", secondary_muscles=[], source_metadata={})
        substitution = models.Exercise(id="exercise-rbac-split-sub", source_id="rbac-split-sub", slug="rbac-split-sub", name="RBAC split sub", body_part="legs", equipment="chair", target="mobility", secondary_muscles=[], source_metadata={})
        blocked_publish = models.Exercise(id="exercise-rbac-split-blocked", source_id="rbac-split-blocked", slug="rbac-split-blocked", name="RBAC split blocked", body_part="legs", equipment="chair", target="mobility", secondary_muscles=[], source_metadata={})
        db.add_all([exercise, substitution, blocked_publish])
        db.commit()
    exercise_id = "exercise-rbac-split-main"
    substitution_id = "exercise-rbac-split-sub"

    translation_payload = {"locale": "tr", "title": "Kapali beta egzersiz", "instruction_steps": ["Nefes al", "Kontrollu hareket et"], "form_cues": ["Dik dur"], "common_mistakes": ["Acele etme"], "breathing_cues": ["Nefes ver"], "change_reason": "content review"}
    metadata_payload = {"category": "mobility", "equipment": "chair", "position": "seated", "difficulty": "easy", "change_reason": "metadata review"}
    safety_payload = {"safety_tags": ["chair_supported"], "restricted_regions": ["knee"], "contraindication_categories": ["acute_pain"], "review_reason": "safety review"}
    substitution_payload = {"substitution_id": substitution_id, "reason": "safer alternative"}
    publication_payload = {"reason": "publication rehearsal"}

    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/translation", headers=headers["content_editor"], json=translation_payload).status_code == 200
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/metadata", headers=headers["content_editor"], json=metadata_payload).status_code == 200
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/safety", headers=headers["content_editor"], json=safety_payload).status_code == 403
    assert client.post(f"/api/v1/admin/exercises/{exercise_id}/publish", headers=headers["content_editor"], json=publication_payload).status_code == 403

    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/translation", headers=headers["exercise_reviewer"], json=translation_payload).status_code == 403
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/metadata", headers=headers["exercise_reviewer"], json=metadata_payload).status_code == 403
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/safety", headers=headers["exercise_reviewer"], json=safety_payload).status_code == 200
    assert client.post(f"/api/v1/admin/exercises/{exercise_id}/substitutions", headers=headers["exercise_reviewer"], json=substitution_payload).status_code == 200
    published = client.post(f"/api/v1/admin/exercises/{exercise_id}/publish", headers=headers["exercise_reviewer"], json=publication_payload)
    assert published.status_code == 200, published.text
    assert published.json()["metadata"]["publish_state"] == "published"

    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/translation", headers=headers["super_admin"], json=translation_payload).status_code == 200
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/metadata", headers=headers["super_admin"], json=metadata_payload).status_code == 200
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/safety", headers=headers["super_admin"], json=safety_payload).status_code == 200
    assert client.post(f"/api/v1/admin/exercises/{exercise_id}/substitutions/remove", headers=headers["super_admin"], json=substitution_payload).status_code == 200
    assert client.post(f"/api/v1/admin/exercises/{exercise_id}/unpublish", headers=headers["super_admin"], json=publication_payload).status_code == 200

    for denied_role in ["clinical_reviewer", "support", "analyst"]:
        assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/translation", headers=headers[denied_role], json=translation_payload).status_code == 403
        assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/metadata", headers=headers[denied_role], json=metadata_payload).status_code == 403
        assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/safety", headers=headers[denied_role], json=safety_payload).status_code == 403
        assert client.post(f"/api/v1/admin/exercises/{exercise_id}/substitutions", headers=headers[denied_role], json=substitution_payload).status_code == 403
        assert client.post(f"/api/v1/admin/exercises/{exercise_id}/publish", headers=headers[denied_role], json=publication_payload).status_code == 403

    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/translation", headers=headers["super_admin"], json={**translation_payload, "safety_tags": ["forbidden"]}).status_code == 422
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/translation", headers=headers["super_admin"], json={**translation_payload, "locale": "en"}).status_code == 422
    assert client.patch(f"/api/v1/admin/exercises/{exercise_id}/safety", headers=headers["super_admin"], json={**safety_payload, "review_reason": ""}).status_code == 422
    assert client.post(f"/api/v1/admin/exercises/{exercise_id}/substitutions", headers=headers["super_admin"], json={"substitution_id": exercise_id, "reason": "self"}).status_code == 409
    assert client.post(f"/api/v1/admin/exercises/{exercise_id}/substitutions", headers=headers["super_admin"], json=substitution_payload).status_code == 200
    assert client.post(f"/api/v1/admin/exercises/{exercise_id}/substitutions", headers=headers["super_admin"], json=substitution_payload).status_code == 409
    blocked = client.post("/api/v1/admin/exercises/exercise-rbac-split-blocked/publish", headers=headers["super_admin"], json=publication_payload)
    assert blocked.status_code == 409
    blocked_payload = blocked.json()
    detail = blocked_payload.get("detail", blocked_payload)
    assert detail["code"] == "exercise_publication_preconditions_failed"


def test_refresh_rotation_logout_and_legacy_password_upgrade(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    salt = "legacy-local-salt"
    digest = hashlib.pbkdf2_hmac("sha256", b"LegacyPassphrase1", salt.encode(), 120_000).hex()
    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        db.add(
            models.User(
                id="usr_legacy",
                email="legacy@example.test",
                password_hash=f"pbkdf2_sha256${salt}${digest}",
                auth_provider="local",
                role="user",
            )
        )
        db.commit()

    login = client.post("/api/v1/auth/login", json={"email": "legacy@example.test", "password": "LegacyPassphrase1"})
    assert login.status_code == 200, login.text
    first = login.json()
    with session_mod.SessionLocal() as db:
        upgraded = db.get(models.User, "usr_legacy").password_hash
    assert upgraded.split("$")[1] == "210000"

    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert refreshed.status_code == 200, refreshed.text
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]}).status_code == 401
    second = refreshed.json()
    with session_mod.SessionLocal() as db:
        records = db.query(models.AuthRefreshToken).filter(models.AuthRefreshToken.user_id == "usr_legacy").all()
        assert len(records) == 2
        assert all(record.revoked_at is not None for record in records)
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": second["refresh_token"]}).status_code == 401
    logout = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {second['access_token']}"})
    assert logout.status_code == 200
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {second['access_token']}"}).status_code == 401


def test_logout_revokes_duplicate_active_refresh_family_once(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    registered, _ = _register(client, "duplicate-family-logout@example.test")
    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    auth_mod = importlib.import_module("app.auth")

    with session_mod.SessionLocal() as db:
        active = (
            db.query(models.AuthRefreshToken)
            .filter(
                models.AuthRefreshToken.user_id == registered["user"]["id"],
                models.AuthRefreshToken.revoked_at.is_(None),
            )
            .one()
        )
        db.add(
            models.AuthRefreshToken(
                user_id=active.user_id,
                family_id=active.family_id,
                token_id="duplicate-active-token",
                token_hash=auth_mod.token_hash("duplicate-active-refresh-token"),
                session_label="mobile",
                issued_at=datetime.now(UTC),
                expires_at=datetime.now(UTC) + timedelta(days=1),
            )
        )
        db.commit()
        family_id = active.family_id

    logout = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {registered['access_token']}"})
    assert logout.status_code == 200, logout.text
    with session_mod.SessionLocal() as db:
        rows = (
            db.query(models.SessionRevocation)
            .filter(
                models.SessionRevocation.token_type == "refresh_family",
                models.SessionRevocation.token_family_id == family_id,
            )
            .all()
        )
        assert len(rows) == 1


def test_password_reset_lifecycle_is_secure_single_use_and_revokes_sessions(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch, ENABLE_DEVELOPMENT_RESET_PREVIEW="true", EMAIL_SENDER="console")
    registered, headers = _register(client, "reset@example.test")
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200

    unknown = client.post("/api/v1/auth/forgot-password", json={"email": "missing@example.test"})
    assert unknown.status_code == 200
    assert unknown.json() == {"accepted": True, "message": "If an account exists, password reset instructions have been sent."}

    known = client.post("/api/v1/auth/forgot-password", json={"email": "reset@example.test"})
    assert known.status_code == 200, known.text
    reset_token = known.json()["development_reset_token"]
    assert "access_token" not in known.json()
    assert "refresh_token" not in known.json()
    assert client.post("/api/v1/auth/reset-password/validate", json={"token": "invalid-reset-token-value"}).status_code == 401
    assert client.post("/api/v1/auth/reset-password", json={"token": reset_token, "password": "weak"}).status_code == 422

    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        record = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == registered["user"]["id"]).order_by(models.PasswordResetToken.id).first()
        assert record.token_hash != reset_token
        record.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    assert client.post("/api/v1/auth/reset-password/validate", json={"token": reset_token}).status_code == 401

    fresh = client.post("/api/v1/auth/forgot-password", json={"email": "reset@example.test"})
    reset_token = fresh.json()["development_reset_token"]
    assert client.post("/api/v1/auth/reset-password/validate", json={"token": reset_token}).status_code == 200
    time.sleep(1.05)
    reset = client.post("/api/v1/auth/reset-password", json={"token": reset_token, "password": "MoveInRange2"})
    assert reset.status_code == 200, reset.text
    assert client.post("/api/v1/auth/reset-password", json={"token": reset_token, "password": "MoveInRange3"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "reset@example.test", "password": "MoveInRange1"}).status_code == 401
    new_login = client.post("/api/v1/auth/login", json={"email": "reset@example.test", "password": "MoveInRange2"})
    assert new_login.status_code == 200, new_login.text
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": registered["refresh_token"]}).status_code in {401, 403}
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_token_claims_signature_expiry_and_disabled_user_are_rejected(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    payload, headers = _register(client, "claims@example.test")
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200

    settings_mod = importlib.import_module("app.settings")
    auth_mod = importlib.import_module("app.auth")
    tampered = payload["access_token"][:-1] + ("a" if payload["access_token"][-1] != "a" else "b")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"}).status_code == 401

    monkeypatch.setenv("TOKEN_AUDIENCE", "unexpected-audience")
    settings_mod.get_settings.cache_clear()
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    monkeypatch.setenv("TOKEN_AUDIENCE", "moveinrange-mobile")
    settings_mod.get_settings.cache_clear()

    monkeypatch.setenv("TOKEN_ISSUER", "unexpected-issuer")
    settings_mod.get_settings.cache_clear()
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
    monkeypatch.setenv("TOKEN_ISSUER", "moveinrange-api")
    settings_mod.get_settings.cache_clear()

    monkeypatch.setenv("ACCESS_TOKEN_MINUTES", "-1")
    settings_mod.get_settings.cache_clear()
    expired = auth_mod.create_token(payload["user"]["id"])
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401
    monkeypatch.setenv("ACCESS_TOKEN_MINUTES", "30")
    settings_mod.get_settings.cache_clear()

    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        user = db.get(models.User, payload["user"]["id"])
        user.deleted_at = datetime.now(UTC)
        db.commit()
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_production_rejects_default_secret_and_wildcard_cors(monkeypatch):
    settings_mod = importlib.import_module("app.settings")
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("AUTH_SECRET", "local-development-secret-change-before-production")
    settings_mod.get_settings.cache_clear()
    with pytest.raises(ValueError):
        settings_mod.get_settings()

    safe_production = {
        "AUTH_SECRET": "strong-production-secret",
        "LOCAL_ADMIN_PASSWORD": "strong-admin-password",
        "CORS_ORIGINS": "https://admin.example.com",
        "EMAIL_SENDER": "resend",
        "RESEND_API_KEY": "test_resend_secret",
        "RESEND_FROM_EMAIL": "MoveInRange <no-reply@example.com>",
        "ENABLE_DEVELOPMENT_RESET_PREVIEW": "false",
        "ENABLE_E2E_SEED": "false",
        "ADMIN_COOKIE_SECURE": "true",
        "PRODUCT_WEB_BASE_URL": "https://app.example.com",
        "API_BASE_URL": "https://api.example.com",
        "DATABASE_URL": "postgresql+psycopg://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
        "SESSION_REVOCATION_BACKEND": "postgres",
        "RATE_LIMIT_BACKEND": "postgres",
    }
    for key, value in safe_production.items():
        monkeypatch.setenv(key, value)

    for key, bad_value in {
            "ENABLE_DEVELOPMENT_RESET_PREVIEW": "true",
            "ENABLE_E2E_SEED": "true",
            "ADMIN_COOKIE_SECURE": "false",
            "EMAIL_SENDER": "console",
            "PRODUCT_WEB_BASE_URL": "http://localhost:3210",
            "API_BASE_URL": "http://localhost:8200",
            "EMAIL_FROM": "no-reply@example.com\nbcc: attacker@example.com",
            "DATABASE_URL": "postgresql+psycopg://moveinrange:moveinrange@localhost:5432/moveinrange",
        }.items():
        monkeypatch.setenv(key, bad_value)
        settings_mod.get_settings.cache_clear()
        with pytest.raises(ValueError):
            settings_mod.get_settings()
        monkeypatch.setenv(key, safe_production.get(key, "no-reply@example.com"))

    settings_mod.get_settings.cache_clear()
    assert settings_mod.get_settings().environment == "production"

    monkeypatch.setenv("AUTH_SECRET", "strong-production-secret")
    monkeypatch.setenv("LOCAL_ADMIN_PASSWORD", "MoveInRangeAdminLocal!")
    monkeypatch.setenv("CORS_ORIGINS", "https://admin.example.com")
    settings_mod.get_settings.cache_clear()
    with pytest.raises(ValueError):
        settings_mod.get_settings()

    monkeypatch.setenv("LOCAL_ADMIN_PASSWORD", "strong-admin-password")
    monkeypatch.setenv("CORS_ORIGINS", "*")
    settings_mod.get_settings.cache_clear()
    with pytest.raises(ValueError):
        settings_mod.get_settings()

    monkeypatch.setenv("CORS_ORIGINS", "https://admin.example.com")
    monkeypatch.setenv("EMAIL_SENDER", "console")
    settings_mod.get_settings.cache_clear()
    with pytest.raises(ValueError):
        settings_mod.get_settings()


def test_ready_endpoint_and_production_revocation_use_postgres_without_redis(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch, REDIS_URL="redis://localhost:1/0")
    ready = client.get("/api/v1/ready")
    assert ready.status_code == 200
    assert ready.json()["revocation_store"] == "postgres"
    assert ready.json()["rate_limiter"] == "postgres"

    settings_mod = importlib.import_module("app.settings")
    revocation_mod = importlib.import_module("app.revocation")
    monkeypatch.setenv("ENVIRONMENT", "staging")
    monkeypatch.setenv("MOVEINRANGE_ENV", "staging")
    monkeypatch.setenv("AUTH_SECRET", "strong-production-secret")
    monkeypatch.setenv("LOCAL_ADMIN_PASSWORD", "strong-admin-password")
    monkeypatch.setenv("CORS_ORIGINS", "https://admin.example.com")
    monkeypatch.setenv("EMAIL_SENDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "test_resend_secret")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "MoveInRange <no-reply@example.com>")
    monkeypatch.setenv("ENABLE_DEVELOPMENT_RESET_PREVIEW", "false")
    monkeypatch.setenv("ADMIN_COOKIE_SECURE", "true")
    monkeypatch.setenv("PRODUCT_WEB_BASE_URL", "https://app.example.com")
    monkeypatch.setenv("API_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres")
    monkeypatch.setenv("SESSION_REVOCATION_BACKEND", "memory")
    settings_mod.get_settings.cache_clear()
    with pytest.raises(ValueError):
        settings_mod.get_settings()
    monkeypatch.setenv("SESSION_REVOCATION_BACKEND", "postgres")
    monkeypatch.setenv("RATE_LIMIT_BACKEND", "memory")
    settings_mod.get_settings.cache_clear()
    with pytest.raises(ValueError):
        settings_mod.get_settings()
    monkeypatch.setenv("RATE_LIMIT_BACKEND", "postgres")
    settings_mod.get_settings.cache_clear()
    assert settings_mod.get_settings().session_revocation_backend == "postgres"
    revocation_mod = importlib.reload(revocation_mod)
    revocation_mod.get_token_revocation_store.cache_clear()
    assert revocation_mod.get_token_revocation_store().__class__.__name__ == "PostgresTokenRevocationStore"


def test_log_redaction_removes_tokens_passwords_and_health_values():
    privacy_mod = importlib.import_module("app.privacy")
    redacted = privacy_mod.redact_for_log(
        {
            "authorization": "Bearer secret",
            "password": "secret",
            "profile": {"conditions": ["type_2_diabetes"], "note": "ok"},
            "events": [{"glucose": 112, "kind": "post"}],
        }
    )
    assert redacted["authorization"] == "[REDACTED]"
    assert redacted["password"] == "[REDACTED]"
    assert redacted["profile"]["conditions"] == "[REDACTED]"
    assert redacted["profile"]["note"] == "ok"
    assert redacted["events"][0]["glucose"] == "[REDACTED]"


def test_rate_limit_blocks_auth_bursts(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch, AUTH_RATE_LIMIT="1", RATE_LIMIT_WINDOW_SECONDS="60")
    first = client.post("/api/v1/auth/login", json={"email": "none@example.test", "password": "not-real-pass"})
    second = client.post("/api/v1/auth/login", json={"email": "none@example.test", "password": "not-real-pass"})
    assert first.status_code == 401
    assert second.status_code == 429


def test_postgres_revocation_store_persists_hashes_and_cleans_expired(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    assert client.get("/api/v1/ready").json()["revocation_store"] == "postgres"
    payload, _ = _register(client, "revocation-store@example.test")
    user_id = payload["user"]["id"]
    revocation_mod = importlib.import_module("app.revocation")
    store = revocation_mod.get_token_revocation_store()
    store.revoke_access_token("raw-access-jti", 60, user_id=user_id, reason="logout")
    store.revoke_refresh_family("raw-family-id", 60, user_id=user_id, reason="password_reset")
    assert store.is_access_token_revoked("raw-access-jti") is True
    assert store.is_refresh_family_revoked("raw-family-id") is True

    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        rows = db.query(models.SessionRevocation).all()
        assert rows
        serialized = " ".join(row.token_identifier_hash for row in rows)
        assert "raw-access-jti" not in serialized
        assert "raw-family-id" not in serialized
        for row in rows:
            row.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        db.commit()
    assert store.cleanup_expired() >= 2


def test_postgres_rate_limiter_windows_keys_and_cleanup(tmp_path, monkeypatch):
    _client(tmp_path, monkeypatch, AUTH_RATE_LIMIT="2", RATE_LIMIT_WINDOW_SECONDS="60")
    rate_limit_mod = importlib.import_module("app.rate_limit")
    limiter = rate_limit_mod.get_rate_limiter()
    limiter.check("login:ip:1.2.3.4", 2)
    limiter.check("login:ip:1.2.3.4", 2)
    with pytest.raises(rate_limit_mod.RateLimitExceeded):
        limiter.check("login:ip:1.2.3.4", 2)
    limiter.check("login:ip:5.6.7.8", 2)

    session_mod = importlib.import_module("app.db.session")
    models = importlib.import_module("app.db.models")
    with session_mod.SessionLocal() as db:
        buckets = db.query(models.RateLimitBucket).all()
        assert buckets
        assert all("1.2.3.4" not in bucket.bucket_key for bucket in buckets)
        for bucket in buckets:
            bucket.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        db.commit()
    assert limiter.cleanup_expired() >= 1


def test_safety_stops_object_ownership_and_offline_idempotency(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    _, blocked_user = _register(client, "blocked@example.test")
    _, user_a = _register(client, "owner@example.test")
    _, user_b = _register(client, "other@example.test")

    blocked = client.post(
        "/api/v1/readiness-checks",
        headers=blocked_user,
        json={"energy": 3, "sleep_quality": 3, "pain": 1, "chest_discomfort": True, "available_minutes": 10, "stress": 2},
    )
    assert blocked.status_code == 201
    assert client.post("/api/v1/sessions", headers=blocked_user, json={"resume": False}).status_code == 409

    normal_readiness = {"energy": 3, "sleep_quality": 3, "pain": 1, "available_minutes": 10, "stress": 2}
    client.post("/api/v1/readiness-checks", headers=user_a, json=normal_readiness)
    plan = client.post("/api/v1/plans/daily/generate", headers=user_a, json=normal_readiness).json()["plan"]
    session = client.post("/api/v1/sessions", headers=user_a, json={"plan_id": plan["id"], "resume": False}).json()["session"]
    session_id = session["id"]

    assert client.post("/api/v1/glucose", headers=user_b, json={"value": 100, "session_id": session_id}).status_code == 404
    assert client.post(f"/api/v1/sessions/{session_id}/pain", headers=user_a, json={"severity": 4}).status_code == 422
    symptoms = client.post(f"/api/v1/sessions/{session_id}/symptoms", headers=user_a, json={"symptoms": ["dizziness"]})
    assert symptoms.status_code == 200
    assert symptoms.json()["action"] == "stop_and_show_safety_flow"
    assert client.post(f"/api/v1/sessions/{session_id}/complete", headers=user_a, json={"completed": True}).status_code == 409

    invalid = client.post("/api/v1/offline-events", headers=user_a, json={"event_type": "unknown", "idempotency_key": "off-invalid"})
    assert invalid.status_code == 422
    event = client.post(
        "/api/v1/offline-events",
        headers=user_a,
        json={"event_type": "glucose", "idempotency_key": "off-1", "payload": {"retry_count": 2, "failed": True, "last_error": "network"}},
    )
    duplicate = client.post(
        "/api/v1/offline-events",
        headers=user_a,
        json={"event_type": "glucose", "idempotency_key": "off-1", "payload": {"retry_count": 3}},
    )
    assert event.status_code == 201
    assert event.json()["event"]["status"] == "failed"
    assert event.json()["event"]["retry_count"] == 2
    assert duplicate.json()["duplicate"] is True


def test_weekly_spacing_and_monthly_holds_are_safety_aware(tmp_path, monkeypatch):
    client = _client(tmp_path, monkeypatch)
    _, headers = _register(client, "planner@example.test")
    profile = client.put(
        "/api/v1/profile",
        headers=headers,
        json={
            "preferred_name": "Planner",
            "preferred_training_days": ["Mon", "Tue", "Wed", "Fri"],
            "consent_accepted": True,
            "onboarding_complete": True,
        },
    )
    assert profile.status_code == 200
    readiness = {"energy": 3, "sleep_quality": 3, "pain": 2, "available_minutes": 10, "stress": 2}
    assert client.post("/api/v1/readiness-checks", headers=headers, json=readiness).status_code == 201
    week = client.post("/api/v1/plans/weekly/generate", headers=headers).json()["plan"]
    planned_days = [day["day"] for day in week["days"] if day["status"] == "planned"]
    assert "Mon" in planned_days
    assert "Tue" not in planned_days
    assert "Wed" in planned_days

    high_pain = {"energy": 3, "sleep_quality": 3, "pain": 8, "available_minutes": 10, "stress": 2}
    assert client.post("/api/v1/readiness-checks", headers=headers, json=high_pain).status_code == 201
    month = client.post("/api/v1/plans/monthly/generate", headers=headers).json()["plan"]
    assert month["weeks"][0]["hold"] is False
    assert all(week["hold"] for week in month["weeks"][1:])
    assert "hold" in month["weeks"][1]["progression_reason"]
