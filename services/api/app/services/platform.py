from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any

from .safety import evaluate_safety

PLATFORM_VERSION = "complete-product-2026-07"
PROGRAM_GENERATOR_VERSION = "program-engine-2026-07"
POLICY_VERSION = "policy-2026-07-contextual"

GENERAL_GOALS = {
    "daily_movement",
    "weight_management",
    "strength",
    "cardiovascular_fitness",
    "mobility",
    "flexibility",
    "balance",
    "pain_aware_capacity",
    "reduce_muscle_loss",
    "healthy_aging",
    "return_to_exercise",
    "diabetes_support",
    "maintain_independence",
    "reduce_sedentary_time",
}

TARGET_FOCUSES = {
    "full_body",
    "chest",
    "back",
    "shoulders",
    "arms",
    "forearms_hands",
    "core",
    "lower_back",
    "glutes",
    "quadriceps",
    "hamstrings",
    "calves",
    "neck",
    "mobility",
    "cardio",
    "balance",
}

PROGRAM_VARIANTS: dict[str, dict[str, Any]] = {
    "emergency_5_minute": {"minutes": 5, "focus": ["breathing", "seated_mobility"], "intensity": "very_low", "equipment": ["chair"]},
    "light_10_minute": {"minutes": 10, "focus": ["mobility"], "intensity": "low", "equipment": ["body weight", "chair"]},
    "mobility_15_minute": {"minutes": 15, "focus": ["mobility", "flexibility"], "intensity": "low", "equipment": ["body weight"]},
    "target_muscle_20_minute": {"minutes": 20, "focus": ["target_focus"], "intensity": "moderate", "equipment": ["body weight", "resistance band"]},
    "full_body_30_minute": {"minutes": 30, "focus": ["full_body"], "intensity": "moderate", "equipment": ["body weight", "dumbbell"]},
    "full_45_minute": {"minutes": 45, "focus": ["full_body", "cardio"], "intensity": "moderate", "equipment": ["body weight", "dumbbell", "resistance band"]},
    "full_60_minute": {"minutes": 60, "focus": ["full_body", "cardio", "mobility"], "intensity": "moderate", "equipment": ["body weight", "dumbbell", "resistance band"]},
    "chair_based": {"minutes": 15, "focus": ["seated_mobility", "strength"], "intensity": "low", "equipment": ["chair"]},
    "standing_only": {"minutes": 20, "focus": ["standing_mobility"], "intensity": "low", "equipment": ["body weight"]},
    "no_floor": {"minutes": 20, "focus": ["standing_mobility", "upper_body"], "intensity": "low", "equipment": ["body weight", "chair"]},
    "quiet_apartment": {"minutes": 15, "focus": ["quiet_strength"], "intensity": "low", "equipment": ["body weight", "resistance band"]},
    "no_equipment": {"minutes": 20, "focus": ["bodyweight"], "intensity": "moderate", "equipment": ["body weight"]},
    "resistance_band": {"minutes": 20, "focus": ["strength"], "intensity": "moderate", "equipment": ["resistance band"]},
    "dumbbell": {"minutes": 30, "focus": ["strength"], "intensity": "moderate", "equipment": ["dumbbell"]},
    "office_break": {"minutes": 10, "focus": ["posture", "mobility"], "intensity": "low", "equipment": ["chair"]},
    "morning_mobility": {"minutes": 10, "focus": ["mobility"], "intensity": "low", "equipment": ["body weight"]},
    "evening_mobility": {"minutes": 10, "focus": ["recovery", "mobility"], "intensity": "very_low", "equipment": ["body weight"]},
    "balance_session": {"minutes": 15, "focus": ["balance"], "intensity": "low", "equipment": ["chair"]},
    "low_impact_cardio": {"minutes": 20, "focus": ["cardio"], "intensity": "low", "equipment": ["body weight", "chair"]},
    "pain_day_recovery": {"minutes": 10, "focus": ["recovery"], "intensity": "very_low", "equipment": ["chair"]},
    "return_after_break": {"minutes": 15, "focus": ["reconditioning"], "intensity": "low", "equipment": ["body weight", "chair"]},
    "clinician_supervised": {"minutes": 20, "focus": ["restricted"], "intensity": "clinician_supervised", "equipment": ["body weight"]},
    "delayed_diabetes_low_intensity": {"minutes": 10, "focus": ["walking", "mobility"], "intensity": "low", "equipment": ["body weight", "chair"]},
}

PROVIDER_REGISTRY: dict[str, dict[str, Any]] = {
    "dexcom": {"category": "cgm", "status": "blocked_credentials", "scopes": ["glucose:read"]},
    "freestyle_libre": {"category": "cgm", "status": "blocked_credentials", "scopes": ["glucose:read"]},
    "nightscout": {"category": "cgm", "status": "mock_ready", "scopes": ["glucose:read"]},
    "tidepool": {"category": "cgm", "status": "blocked_credentials", "scopes": ["glucose:read"]},
    "apple_health": {"category": "health_platform", "status": "blocked_platform_entitlement", "scopes": ["steps", "workouts", "heart_rate", "sleep", "weight", "active_energy", "glucose"]},
    "android_health_connect": {"category": "health_platform", "status": "blocked_platform_entitlement", "scopes": ["steps", "workouts", "heart_rate", "sleep", "weight", "active_energy", "glucose"]},
    "apple_watch": {"category": "wearable", "status": "blocked_device", "scopes": ["heart_rate", "workouts", "steps"]},
    "wear_os": {"category": "wearable", "status": "blocked_device", "scopes": ["heart_rate", "workouts", "steps"]},
    "garmin": {"category": "wearable", "status": "blocked_credentials", "scopes": ["heart_rate", "activity_duration", "steps"]},
    "fitbit": {"category": "wearable", "status": "blocked_credentials", "scopes": ["heart_rate", "activity_duration", "steps"]},
    "bluetooth_heart_rate": {"category": "wearable", "status": "blocked_hardware", "scopes": ["heart_rate"]},
}

VOICE_COMMANDS = {
    "prepare": {"en": "Prepare", "tr": "Hazirlan"},
    "start": {"en": "Start", "tr": "Basla"},
    "ten_seconds_remaining": {"en": "Ten seconds remaining", "tr": "On saniye kaldi"},
    "rest": {"en": "Rest", "tr": "Dinlen"},
    "final_set": {"en": "Final set", "tr": "Son set"},
    "next_exercise": {"en": "Next exercise", "tr": "Sonraki egzersiz"},
    "stop_movement": {"en": "Stop movement", "tr": "Hareketi durdur"},
    "pause": {"en": "Pause", "tr": "Duraklat"},
    "resume": {"en": "Resume", "tr": "Devam et"},
    "pain_means_stop": {"en": "Pain means stop", "tr": "Agri varsa dur"},
    "session_complete": {"en": "Session complete", "tr": "Seans tamamlandi"},
}


def interpret_natural_request(text: str | None) -> dict[str, Any]:
    normalized = (text or "").strip().lower()
    minutes = None
    match = re.search(r"(\d{1,2})\s*(-| )?\s*(minute|min|dakika)", normalized)
    if match:
        minutes = max(5, min(60, int(match.group(1))))
    focuses = sorted(focus for focus in TARGET_FOCUSES if focus.replace("_", " ") in normalized or focus in normalized)
    if "knee" in normalized or "diz" in normalized:
        focuses.append("avoid_knee_loading")
    if "floor" in normalized or "yer" in normalized:
        focuses.append("no_floor")
    if "quiet" in normalized or "sessiz" in normalized:
        focuses.append("quiet")
    return {
        "available_minutes": minutes,
        "target_focuses": sorted(set(focuses)),
        "raw_text": text or "",
        "parser_version": PLATFORM_VERSION,
    }


def derive_capacity_profile(inputs: dict[str, Any]) -> dict[str, Any]:
    flags: list[str] = []
    if inputs.get("single_leg_stand") in {"unable", "low"} or inputs.get("balance_level") in {"low", "needs_support"}:
        flags.append("balance_support_required")
    if inputs.get("floor_rise_capacity") in {"unable", "avoids_floor"}:
        flags.append("no_floor_preferred")
    if inputs.get("walking_tolerance_minutes", 15) < 10:
        flags.append("short_bouts")
    if inputs.get("mobility_aids"):
        flags.append("mobility_aid_present")
    return {
        "version": "capacity-2026-07",
        "flags": flags,
        "preferred_position": inputs.get("preferred_exercise_position", "mixed"),
        "conservative_level": "supported" if flags else "standard",
        "expires_at_days": 90,
    }


def evaluate_contextual_safety(inputs: dict[str, Any]) -> dict[str, Any]:
    decision = evaluate_safety(inputs)
    triggered = list(decision["triggered_rule_ids"])
    action = decision["action"]
    explanation_parts = [decision["explanation"]]
    if inputs.get("clinician_prohibited_movements"):
        triggered.append("clinician.prohibited_movements")
        action = "READY_WITH_MODIFICATIONS" if action == "READY" else action
        explanation_parts.append("Clinician-prohibited movements must be excluded.")
    if inputs.get("pregnancy") or inputs.get("postpartum"):
        triggered.append("physiology.pregnancy_or_postpartum")
        action = "READY_WITH_MODIFICATIONS" if action == "READY" else action
        explanation_parts.append("Pregnancy or postpartum context requires lower intensity and conservative positioning.")
    if inputs.get("osteoporosis") or inputs.get("osteoporosis_risk"):
        triggered.append("condition.osteoporosis")
        action = "READY_WITH_MODIFICATIONS" if action == "READY" else action
        explanation_parts.append("Osteoporosis context excludes high impact and loaded spinal flexion.")
    if inputs.get("neuropathy") or inputs.get("fall_risk") or inputs.get("balance_problem"):
        triggered.append("condition.balance_or_neuropathy")
        action = "READY_WITH_MODIFICATIONS" if action == "READY" else action
        explanation_parts.append("Balance or neuropathy context requires supported low-impact choices.")
    if inputs.get("cardiac_rehabilitation"):
        triggered.append("condition.cardiac_rehab")
        action = "CLINICIAN_SUPERVISION_REQUIRED"
        explanation_parts.append("Cardiac rehabilitation mode requires clinician-supervised programming.")
    return {
        **decision,
        "policy_version": POLICY_VERSION,
        "triggered_rule_ids": sorted(set(triggered)),
        "action": action,
        "explanation": " ".join(explanation_parts),
        "outcome_classification": action,
        "timestamp": datetime.now(UTC).isoformat(),
    }


def choose_variant(payload: dict[str, Any]) -> str:
    minutes = int(payload.get("available_minutes") or 15)
    if payload.get("cardiac_rehabilitation"):
        return "clinician_supervised"
    if payload.get("recent_low") or payload.get("cgm_trend") == "falling":
        return "delayed_diabetes_low_intensity"
    if payload.get("pain", 0) >= 5:
        return "pain_day_recovery"
    if payload.get("chair_only"):
        return "chair_based"
    if payload.get("no_floor"):
        return "no_floor"
    if payload.get("quiet"):
        return "quiet_apartment"
    if minutes <= 5:
        return "emergency_5_minute"
    if minutes <= 10:
        return "light_10_minute"
    if minutes <= 15:
        return "mobility_15_minute"
    if minutes <= 20 and payload.get("target_focuses"):
        return "target_muscle_20_minute"
    if minutes <= 30:
        return "full_body_30_minute"
    if minutes <= 45:
        return "full_45_minute"
    return "full_60_minute"


def build_program_payload(user_id: str, request_payload: dict[str, Any], exercise_candidates: list[dict[str, Any]]) -> dict[str, Any]:
    interpreted = interpret_natural_request(request_payload.get("natural_request"))
    merged = {**request_payload}
    if interpreted["available_minutes"] and not merged.get("available_minutes"):
        merged["available_minutes"] = interpreted["available_minutes"]
    merged["target_focuses"] = sorted(set((merged.get("target_focuses") or []) + interpreted["target_focuses"]))
    safety = evaluate_contextual_safety(merged)
    variant_key = merged.get("variant") or choose_variant(merged)
    variant = PROGRAM_VARIANTS.get(variant_key, PROGRAM_VARIANTS["mobility_15_minute"])
    minutes = int(merged.get("available_minutes") or variant["minutes"])
    minutes = max(5, min(60, minutes))
    allowed_equipment = set(merged.get("equipment") or variant["equipment"])
    excluded: list[dict[str, str]] = []
    selected: list[dict[str, Any]] = []
    for candidate in exercise_candidates:
        equipment = candidate.get("equipment", "body weight")
        target = candidate.get("target", "")
        body_part = candidate.get("body_part", "")
        if equipment not in allowed_equipment and "body weight" not in allowed_equipment:
            excluded.append({"id": candidate["id"], "reason": "equipment_unavailable"})
            continue
        if "avoid_knee_loading" in merged.get("target_focuses", []) and ("knee" in target or "leg" in body_part):
            excluded.append({"id": candidate["id"], "reason": "knee_loading_avoided"})
            continue
        if safety["action"] in {"LOW_INTENSITY_ONLY", "READY_WITH_MODIFICATIONS", "DELAY_AND_RECHECK"} and equipment not in {"body weight", "chair"}:
            excluded.append({"id": candidate["id"], "reason": "low_intensity_policy"})
            continue
        selected.append(candidate)
        if len(selected) == 4:
            break
    if not selected:
        selected = [
            {"id": "fallback-breathing", "name": "Supported breathing", "equipment": "chair", "target": "recovery", "body_part": "cardio"},
            {"id": "fallback-chair-march", "name": "Chair-supported march", "equipment": "chair", "target": "cardio", "body_part": "legs"},
            {"id": "fallback-wall-glide", "name": "Wall shoulder glide", "equipment": "body weight", "target": "mobility", "body_part": "shoulders"},
            {"id": "fallback-cooldown", "name": "Seated mobility cooldown", "equipment": "chair", "target": "mobility", "body_part": "full body"},
        ]
    per_item = minutes * 60 // len(selected)
    items = []
    for index, item in enumerate(selected):
        items.append({
            "exercise_id": item["id"],
            "name": item["name"],
            "block": "warmup" if index == 0 else "cooldown" if index == len(selected) - 1 else "main",
            "duration_seconds": per_item,
            "rest_seconds": 30 if safety["action"] != "READY" else 20,
            "sets": 1 if safety["action"] != "READY" else 2,
            "reps": 6 if safety["action"] != "READY" else 10,
            "target": item.get("target"),
            "equipment": item.get("equipment"),
            "safety_notes": ["Stop for concerning symptoms or increasing pain.", "Safety rules override intensity requests."],
        })
    return {
        "id": "program_" + datetime.now(UTC).strftime("%Y%m%d%H%M%S%f"),
        "user_id": user_id,
        "variant": variant_key,
        "total_minutes": minutes,
        "generator_version": PROGRAM_GENERATOR_VERSION,
        "policy_version": safety["policy_version"],
        "safety_decision": safety,
        "triggered_rules": safety["triggered_rule_ids"],
        "excluded_exercises": excluded[:30],
        "selected_exercises": [item["exercise_id"] for item in items],
        "modifications": {"intensity": variant["intensity"], "equipment": sorted(allowed_equipment)},
        "user_request": request_payload,
        "final_safe_interpretation": {"variant": variant_key, "minutes": minutes, "focuses": merged.get("target_focuses", [])},
        "items": items,
    }


def apply_plan_modification(plan_payload: dict[str, Any], intent: str, request_payload: dict[str, Any]) -> dict[str, Any]:
    modified = dict(plan_payload)
    items = [dict(item) for item in plan_payload.get("items", [])]
    safety = evaluate_contextual_safety({**request_payload, "pain": request_payload.get("pain", 0)})
    if intent in {"make_shorter", "reduce_duration"}:
        modified["total_minutes"] = max(5, int(modified.get("total_minutes", 15)) - 5)
        for item in items:
            item["duration_seconds"] = max(30, int(item.get("duration_seconds", 60) * 0.75))
    elif intent in {"make_easier", "too_hard", "reduce_intensity"}:
        modified["intensity"] = "low"
        for item in items:
            item["sets"] = 1
            item["rest_seconds"] = max(item.get("rest_seconds", 20), 45)
    elif intent == "make_harder":
        if safety["action"] == "READY":
            modified["intensity"] = "moderate"
            for item in items:
                item["sets"] = min(3, item.get("sets", 1) + 1)
        else:
            modified["intensity"] = "unchanged_safety_limited"
    elif intent in {"no_floor", "seated_only", "standing_only", "avoid_knee_loading", "quieter", "no_cardio"}:
        modified["constraints"] = sorted(set(modified.get("constraints", []) + [intent]))
        for item in items:
            item.setdefault("safety_notes", []).append(f"Constraint applied: {intent}")
    elif intent in {"increase_rest", "reduce_rest"}:
        delta = 15 if intent == "increase_rest" else -10
        for item in items:
            item["rest_seconds"] = max(10, item.get("rest_seconds", 20) + delta)
    else:
        modified["constraints"] = sorted(set(modified.get("constraints", []) + ["manual_review"]))
    modified["items"] = items
    modified["modification_intent"] = intent
    modified["safety_decision"] = safety
    return modified


def resolve_media(exercise_payload: dict[str, Any], reduced_motion: bool = False, low_bandwidth: bool = False) -> dict[str, Any]:
    media = exercise_payload.get("media") or {}
    license_status = media.get("license_status") or "external_terms_required"
    if license_status == "approved" and media.get("gif") and not reduced_motion and not low_bandwidth:
        source_type = "approved_licensed_animation"
        uri = media["gif"]
    elif license_status == "approved" and media.get("image"):
        source_type = "approved_licensed_static_image"
        uri = media["image"]
    else:
        source_type = "internal_silhouette_static" if reduced_motion or low_bandwidth else "internal_silhouette_animation"
        uri = f"silhouette://{exercise_payload.get('slug') or exercise_payload.get('id')}"
    return {
        "uri": uri,
        "source_type": source_type,
        "license_state": license_status,
        "attribution": media.get("attribution") or "Internal silhouette fallback",
        "prefetch_policy": "current_and_next_only",
        "cache_policy": "respect_license_and_user_offline_setting",
        "overlays": ["direction_label", "movement_arrows", "form_cues", "common_mistakes"],
    }


def schedule_voice_cues(items: list[dict[str, Any]], mode: str, language: str) -> list[dict[str, Any]]:
    if mode == "off":
        return []
    language = "tr" if language == "tr" else "en"
    cue_keys = ["prepare", "start", "ten_seconds_remaining", "rest", "next_exercise", "pain_means_stop", "session_complete"]
    if mode == "countdown_only":
        cue_keys = ["prepare", "start", "ten_seconds_remaining", "session_complete"]
    elif mode == "essential_cues":
        cue_keys = ["prepare", "start", "ten_seconds_remaining", "rest", "pain_means_stop", "session_complete"]
    cues: list[dict[str, Any]] = []
    cursor = 0
    cues.append({"at_seconds": 0, "command": "prepare", "text": VOICE_COMMANDS["prepare"][language]})
    for index, item in enumerate(items):
        cues.append({"at_seconds": cursor + 5, "command": "start", "text": VOICE_COMMANDS["start"][language], "exercise": item.get("name")})
        duration = int(item.get("duration_seconds", 60))
        if duration > 15:
            cues.append({"at_seconds": cursor + duration - 10, "command": "ten_seconds_remaining", "text": VOICE_COMMANDS["ten_seconds_remaining"][language]})
        if "pain_means_stop" in cue_keys and index == 0:
            cues.append({"at_seconds": cursor + 15, "command": "pain_means_stop", "text": VOICE_COMMANDS["pain_means_stop"][language]})
        cursor += duration + int(item.get("rest_seconds", 0))
        if index < len(items) - 1:
            cues.append({"at_seconds": cursor, "command": "next_exercise", "text": VOICE_COMMANDS["next_exercise"][language]})
    cues.append({"at_seconds": cursor, "command": "session_complete", "text": VOICE_COMMANDS["session_complete"][language]})
    return [cue for cue in cues if cue["command"] in cue_keys]


def mock_provider_sync(provider_key: str) -> dict[str, Any]:
    provider = PROVIDER_REGISTRY[provider_key]
    return {
        "provider_key": provider_key,
        "category": provider["category"],
        "status": "mock_synced" if provider["status"] == "mock_ready" else provider["status"],
        "records_seen": 1 if provider["status"] == "mock_ready" else 0,
        "duplicates_skipped": 0,
        "cursor_after": f"mock-{provider_key}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
        "provenance": {"mock": True, "official_api_required": provider["status"] != "mock_ready"},
    }


def diabetes_insights(entries: list[dict[str, Any]]) -> dict[str, Any]:
    values = [entry["canonical_mg_dl"] for entry in entries if entry.get("canonical_mg_dl") is not None]
    if len(values) < 3:
        return {
            "state": "insufficient_data",
            "sample_count": len(values),
            "confidence": "low",
            "observations": [],
            "disclaimer": "This is not an insulin, carbohydrate, medication, diagnosis, or treatment recommendation.",
        }
    average = round(sum(values) / len(values))
    variability = max(values) - min(values)
    return {
        "state": "ready",
        "sample_count": len(values),
        "confidence": "limited" if len(values) < 10 else "moderate",
        "observations": [
            {"type": "average", "canonical_mg_dl": average},
            {"type": "variability", "range_mg_dl": variability},
        ],
        "disclaimer": "This is not an insulin, carbohydrate, medication, diagnosis, or treatment recommendation.",
    }


def progression_recommendation(history: list[dict[str, Any]], restrictions: dict[str, Any]) -> dict[str, Any]:
    completed = [item for item in history if item.get("status") == "completed" and not item.get("pain") and not item.get("symptoms")]
    if restrictions.get("clinician_prohibited_movements") or len(completed) < 3:
        return {"action": "hold", "reason": "Progression requires at least three symptom-free completions and no clinician conflict."}
    return {"action": "progress", "dimension": "duration", "amount": "5_percent", "reason": "Sufficient symptom-free completion evidence."}


def schedule_notification(category: str, timezone: str, payload: dict[str, Any]) -> dict[str, Any]:
    delay_minutes = {
        "delayed_glucose_30": 30,
        "delayed_glucose_60": 60,
        "delayed_glucose_90": 90,
        "delayed_glucose_120": 120,
    }.get(category, 24 * 60)
    return {
        "category": category,
        "provider": "mock_local",
        "scheduled_for": (datetime.now(UTC) + timedelta(minutes=delay_minutes)).isoformat(),
        "timezone": timezone,
        "preview_policy": "private",
        "payload": payload,
    }


def mock_pose_result(exercise_id: str | None, samples: list[dict[str, Any]]) -> dict[str, Any]:
    repetitions = sum(1 for sample in samples if sample.get("phase") == "rep_complete")
    confidence = 0.72 if repetitions else 0.45
    return {
        "exercise_id": exercise_id,
        "provider": "mock_pose",
        "confidence": confidence,
        "repetition_count": repetitions,
        "signals": {
            "knee_valgus": "not_evaluated",
            "range_of_motion": "sample_only",
            "shoulder_alignment": "sample_only",
        },
        "privacy": {"uploaded": False, "recording_stored": False, "mode": "session_only"},
        "disclaimer": "Form analysis is not a diagnosis or clinical posture assessment.",
    }
