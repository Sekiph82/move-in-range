import importlib
import json
from pathlib import Path
import sys


def test_vercel_fastapi_entry_exports_existing_app_without_startup_init(monkeypatch):
    repo_root = Path(__file__).parents[3]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("SERVERLESS_RUNTIME", "true")
    monkeypatch.setenv("ENABLE_STARTUP_DB_INIT", "false")
    settings_mod = importlib.import_module("app.settings")
    importlib.reload(settings_mod)
    settings_mod.get_settings.cache_clear()
    index_mod = importlib.import_module("api.index")
    assert index_mod.app.title == "MoveInRange API"


def test_resend_sender_uses_https_idempotency_and_redacted_templates(monkeypatch):
    monkeypatch.setenv("EMAIL_SENDER", "resend")
    monkeypatch.setenv("RESEND_API_KEY", "test_resend_secret")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "MoveInRange <no-reply@example.com>")
    settings_mod = importlib.import_module("app.settings")
    importlib.reload(settings_mod)
    settings_mod.get_settings.cache_clear()
    email_mod = importlib.import_module("app.email")
    importlib.reload(email_mod)

    captured = {}

    class FakeResponse:
        status_code = 200
        content = b'{"id":"resend_msg_1"}'

        def json(self):
            return {"id": "resend_msg_1"}

    def fake_post(url, *, headers, json, timeout):
        captured["url"] = url
        captured["headers"] = headers
        captured["body"] = json
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(email_mod.httpx, "post", fake_post)
    result = email_mod.get_email_sender().send_password_reset("user@example.test", "https://app.example.com/auth/reset-password?token=secret-token")
    assert result.provider == "resend"
    assert result.status == "sent"
    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Idempotency-Key"].startswith("mir-reset-")
    assert "Bearer test_resend_secret" == captured["headers"]["Authorization"]
    assert "secret-token" in json.dumps(captured["body"])
    assert "MoveInRange sifrenizi" in json.dumps(captured["body"])


def test_vercel_configuration_does_not_capture_non_api_routes():
    config = json.loads(Path("vercel.json").read_text())
    sources = [rewrite["source"] for rewrite in config["rewrites"]]
    assert "/api/v1/(.*)" in sources
    assert all(not source.startswith("/(.*)") for source in sources)
    ignore = Path(".vercelignore").read_text()
    assert ".local" in ignore
    assert "exercises-dataset-main" in ignore
    assert "*.apk" in ignore
