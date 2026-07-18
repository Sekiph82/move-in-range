import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from fastapi import HTTPException, status
from .settings import get_settings

revoked_access_token_hashes: set[str] = set()


def hash_password(password: str, salt: str | None = None, iterations: int = 210_000) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        parts = stored.split("$")
        if len(parts) == 4:
            scheme, iterations, salt, expected = parts
        elif len(parts) == 3:
            scheme, salt, expected = parts
            iterations = "120000"
        else:
            return False
    except ValueError:
        return False
    if scheme != "pbkdf2_sha256":
        return False
    actual = hash_password(password, salt, int(iterations)).split("$", 3)[3]
    return hmac.compare_digest(actual, expected)


def password_needs_upgrade(stored: str) -> bool:
    parts = stored.split("$")
    if len(parts) != 4:
        return True
    try:
        return parts[0] != "pbkdf2_sha256" or int(parts[1]) < 210_000
    except ValueError:
        return True


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(subject: str, token_type: str = "access") -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    expires = datetime.now(UTC) + (
        timedelta(minutes=settings.access_token_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_days)
    )
    payload = {
        "iss": settings.token_issuer,
        "aud": settings.token_audience,
        "sub": subject,
        "typ": token_type,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "jti": secrets.token_hex(12),
    }
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
    if expected_type == "access" and token_hash(token) in revoked_access_token_hashes:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "revoked_token"})
    payload = json.loads(_unb64(body))
    settings = get_settings()
    if payload.get("iss") != settings.token_issuer or payload.get("aud") != settings.token_audience:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_token_claims"})
    if payload.get("typ") != expected_type or payload.get("exp", 0) < int(datetime.now(UTC).timestamp()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "expired_token"})
    return payload


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def revoke_access_token(token: str) -> None:
    revoked_access_token_hashes.add(token_hash(token))
