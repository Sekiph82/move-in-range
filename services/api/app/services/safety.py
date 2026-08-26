EMERGENCY_MESSAGE = "MoveInRange is not an emergency service. If you have severe symptoms or believe you may be experiencing a medical emergency, stop exercising and contact local emergency services."

def evaluate_safety(readiness: dict) -> dict:
    triggered = []
    action = "READY"
    explanation = "Readiness inputs are within the current draft policy range for a controlled movement session."
    if readiness.get("chest_discomfort"):
        triggered.append("symptom.chest_discomfort")
        action = "BLOCK_AND_SHOW_SAFETY_MESSAGE"
        explanation = "Chest discomfort requires stopping exercise and seeking appropriate care. " + EMERGENCY_MESSAGE
    elif readiness.get("dizziness") or readiness.get("unusual_shortness_of_breath"):
        triggered.append("symptom.dizziness_or_breathlessness")
        action = "DELAY_AND_RECHECK"
        explanation = "Dizziness or unusual shortness of breath requires delaying exercise and rechecking readiness."
    elif readiness.get("pain", 0) >= 6 or readiness.get("energy", 5) <= 2:
        triggered.append("readiness.low_energy_or_pain")
        action = "LOW_INTENSITY_ONLY"
        explanation = "Low readiness or elevated pain limits the plan to low-intensity mobility and recovery work."
    return {
        "policy_version": "draft-2026-07-18",
        "triggered_rule_ids": triggered,
        "action": action,
        "explanation": explanation,
        "outcome_classification": action,
    }
