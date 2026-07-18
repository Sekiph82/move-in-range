import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from fastapi import HTTPException, status
from .settings import get_settings


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt, expected = stored.split("$", 2)
    except ValueError:
        return False
    if scheme != "pbkdf2_sha256":
        return False
    actual = hash_password(password, salt).split("$", 2)[2]
    return hmac.compare_digest(actual, expected)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(subject: str, token_type: str = "access") -> str:
    settings = get_settings()
    expires = datetime.now(UTC) + (
        timedelta(minutes=settings.access_token_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_days)
    )
    payload = {"sub": subject, "typ": token_type, "exp": int(expires.timestamp()), "nonce": secrets.token_hex(8)}
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(settings.auth_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"mir.{body}.{signature}"


def decode_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    try:
        prefix, body, signature = token.split(".", 2)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_token"}) from exc
    expected = hmac.new(get_settings().auth_secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    if prefix != "mir" or not hmac.compare_digest(signature, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_token"})
    payload = json.loads(_unb64(body))
    if payload.get("typ") != expected_type or payload.get("exp", 0) < int(datetime.now(UTC).timestamp()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "expired_token"})
    return payload


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
