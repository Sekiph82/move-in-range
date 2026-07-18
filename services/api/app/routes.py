from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from .security import require_admin_role, require_user
from .services.safety import evaluate_safety
from .services.planning import create_daily_plan

router = APIRouter()

class ReadinessPayload(BaseModel):
    energy: int = Field(ge=1, le=5)
    sleep_quality: int = Field(ge=1, le=5)
    pain: int = Field(ge=0, le=10)
    dizziness: bool = False
    chest_discomfort: bool = False
    unusual_shortness_of_breath: bool = False
    available_minutes: int = Field(default=15, ge=5, le=60)

@router.get("/health")
def health():
    return {"status": "ok", "service": "moveinrange-api"}

@router.post("/readiness")
def readiness(payload: ReadinessPayload, user=Depends(require_user)):
    return {"user_id": user["id"], "decision": evaluate_safety(payload.model_dump())}

@router.post("/plans/daily")
def daily_plan(payload: ReadinessPayload, user=Depends(require_user)):
    return create_daily_plan(user["id"], payload.model_dump())

@router.get("/exercises")
def exercise_search(q: str = "", body_part: str | None = None, equipment: str | None = None):
    return {"items": [], "query": q, "filters": {"body_part": body_part, "equipment": equipment}, "media_policy": "external-license-required"}

@router.post("/diabetes/glucose")
def glucose_log(payload: dict, user=Depends(require_user)):
    return {"user_id": user["id"], "stored": True, "preserved_unit": payload.get("unit"), "no_insulin_recommendation": True}

@router.get("/admin/policies")
def policies(admin=Depends(require_admin_role("clinical_reviewer"))):
    return {"admin": admin["id"], "policies": [{"version": "draft-2026-07-18", "status": "draft"}]}

@router.get("/admin/audit-logs")
def audit_logs(admin=Depends(require_admin_role("support"))):
    return {"items": [{"event": "policy_read", "actor_id": admin["id"], "redacted": True}]}
