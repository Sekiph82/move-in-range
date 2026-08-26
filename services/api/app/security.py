from collections.abc import Callable
from datetime import UTC, datetime
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from .auth import decode_token
from .db.models import User
from .db.session import get_db
from .revocation import get_token_revocation_store

def require_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.removeprefix("Bearer ").strip(), "access")
        if get_token_revocation_store().is_access_token_revoked(payload["jti"]):
            raise HTTPException(status_code=401, detail={"code": "revoked_token"})
        user = db.get(User, payload["sub"])
        if not user or user.deleted_at is not None:
            raise HTTPException(status_code=401, detail={"code": "user_not_found"})
        if _token_issued_before_auth_invalidation(payload, user):
            raise HTTPException(status_code=401, detail={"code": "session_expired"})
        return user
    raise HTTPException(status_code=401, detail={"code": "missing_token"})

def require_admin_role(role: str) -> Callable:
    allowed = ADMIN_PERMISSIONS.get(role, {role})
    return require_admin_roles(*allowed, required_label=role)

def require_admin_roles(*roles: str, required_label: str | None = None) -> Callable:
    allowed = set(roles)
    def dependency(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail={"code": "missing_admin_token"})
        payload = decode_token(authorization.removeprefix("Bearer ").strip(), "access")
        if get_token_revocation_store().is_access_token_revoked(payload["jti"]):
            raise HTTPException(status_code=401, detail={"code": "revoked_token"})
        admin = db.get(User, payload["sub"])
        if not admin or admin.deleted_at is not None:
            raise HTTPException(status_code=401, detail={"code": "admin_not_found"})
        if _token_issued_before_auth_invalidation(payload, admin):
            raise HTTPException(status_code=401, detail={"code": "session_expired"})
        if admin.role != "super_admin" and admin.role not in allowed:
            raise HTTPException(status_code=403, detail={"code": "forbidden", "required_role": required_label or ",".join(sorted(allowed))})
        return admin
    return dependency

def _token_issued_before_auth_invalidation(payload: dict, user: User) -> bool:
    if user.auth_invalidated_at is None:
        return False
    issued_at = datetime.fromtimestamp(int(payload.get("iat", 0)), UTC)
    invalidated_at = user.auth_invalidated_at if user.auth_invalidated_at.tzinfo else user.auth_invalidated_at.replace(tzinfo=UTC)
    return issued_at < invalidated_at

ADMIN_PERMISSIONS = {
    "admin": {"super_admin", "clinical_reviewer", "exercise_reviewer", "content_editor", "support", "analyst"},
    "super_admin": {"super_admin"},
    "clinical_reviewer": {"clinical_reviewer"},
    "exercise_reviewer": {"exercise_reviewer"},
    "content_editor": {"content_editor"},
    "support": {"support"},
    "analyst": {"analyst"},
}

class AuthProvider:
    def verify(self, token: str) -> dict:
        raise NotImplementedError

class LocalAuthProvider(AuthProvider):
    def verify(self, token: str) -> dict:
        return {"sub": token or "local-dev-user"}

class SupabaseAuthProvider(AuthProvider):
    def verify(self, token: str) -> dict:
        raise NotImplementedError("Configure Supabase JWKS before production use")

class ClerkAuthProvider(AuthProvider):
    def verify(self, token: str) -> dict:
        raise NotImplementedError("Configure Clerk JWKS before production use")
