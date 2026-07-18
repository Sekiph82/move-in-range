from collections.abc import Callable
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from .auth import decode_token
from .db.models import User
from .db.session import get_db

def require_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        payload = decode_token(authorization.removeprefix("Bearer ").strip(), "access")
        user = db.get(User, payload["sub"])
        if not user or user.deleted_at is not None:
            raise HTTPException(status_code=401, detail={"code": "user_not_found"})
        return user
    raise HTTPException(status_code=401, detail={"code": "missing_token"})

def require_admin_role(role: str) -> Callable:
    def dependency(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail={"code": "missing_admin_token"})
        payload = decode_token(authorization.removeprefix("Bearer ").strip(), "access")
        admin = db.get(User, payload["sub"])
        if not admin or admin.deleted_at is not None:
            raise HTTPException(status_code=401, detail={"code": "admin_not_found"})
        allowed = ADMIN_PERMISSIONS.get(role, {role})
        if admin.role != "super_admin" and admin.role not in allowed:
            raise HTTPException(status_code=403, detail={"code": "forbidden", "required_role": role})
        return admin
    return dependency

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
