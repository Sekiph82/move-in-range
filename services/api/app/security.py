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
    user = db.get(User, "local-dev-user")
    if not user:
        user = User(id="local-dev-user", email="demo@moveinrange.local", auth_provider="local", role="user")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def require_admin_role(role: str) -> Callable:
    def dependency(x_admin_role: str | None = Header(default="super_admin")):
        allowed = {"super_admin", role}
        if x_admin_role not in allowed:
            raise HTTPException(status_code=403, detail={"code": "forbidden", "required_role": role})
        return {"id": "local-admin", "role": x_admin_role}
    return dependency

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
