from collections.abc import Callable
from fastapi import Header, HTTPException

def require_user(authorization: str | None = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        return {"id": "local-user", "provider": "local"}
    return {"id": "local-dev-user", "provider": "local"}

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
