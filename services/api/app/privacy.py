from typing import Any

SENSITIVE_KEYS = {
    "access_token",
    "authorization",
    "blood_glucose",
    "conditions",
    "glucose",
    "health_payload",
    "password",
    "refresh_token",
    "sensitivities",
}


def redact_for_log(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: "[REDACTED]" if key.lower() in SENSITIVE_KEYS else redact_for_log(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_for_log(item) for item in value]
    return value
