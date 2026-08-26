from .safety import evaluate_safety

def create_daily_plan(user_id: str, readiness: dict) -> dict:
    decision = evaluate_safety(readiness)
    minutes = min([5, 10, 15, 20, 30, 45, 60], key=lambda value: abs(value - readiness.get("available_minutes", 15)))
    items = [
        {"block": "warmup", "name": "Controlled breathing and joint circles", "duration_seconds": int(minutes * 60 * 0.2), "rest_seconds": 20},
        {"block": "main", "name": "Chair-supported march", "duration_seconds": int(minutes * 60 * 0.35), "rest_seconds": 30},
        {"block": "main", "name": "Wall push", "duration_seconds": int(minutes * 60 * 0.25), "rest_seconds": 30},
        {"block": "cooldown", "name": "Seated mobility cooldown", "duration_seconds": minutes * 60 - int(minutes * 60 * 0.8), "rest_seconds": 20},
    ]
    return {"user_id": user_id, "total_minutes": minutes, "safety_decision": decision, "items": items}
