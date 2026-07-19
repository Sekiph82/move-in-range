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
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def read(self):
            return json.dumps({"id": "resend_msg_1"}).encode()

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        captured["body"] = request.data.decode()
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(email_mod, "urlopen", fake_urlopen)
    result = email_mod.get_email_sender().send_password_reset("user@example.test", "https://app.example.com/auth/reset-password?token=secret-token")
    assert result.provider == "resend"
    assert result.status == "sent"
    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Idempotency-key"].startswith("mir-reset-")
    assert "Bearer test_resend_secret" == captured["headers"]["Authorization"]
    assert "secret-token" in captured["body"]
    assert "MoveInRange sifrenizi" in captured["body"]


def test_vercel_configuration_does_not_capture_non_api_routes():
    config = json.loads(Path("vercel.json").read_text())
    sources = [rewrite["source"] for rewrite in config["rewrites"]]
    assert "/api/v1/(.*)" in sources
    assert all(not source.startswith("/(.*)") for source in sources)
    ignore = Path(".vercelignore").read_text()
    assert ".local" in ignore
    assert "exercises-dataset-main" in ignore
    assert "*.apk" in ignore
