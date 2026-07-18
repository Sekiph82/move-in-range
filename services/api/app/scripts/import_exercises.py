import argparse
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator

def slugify(value: str) -> str:
    import re
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))

def classify(record: dict) -> dict:
    text = f"{record['name']} {record['body_part']} {record['equipment']} {record['instructions']['en']}".lower()
    return {
        "movement_pattern": "locomotion" if any(x in text for x in ["walk", "run", "jump"]) else "controlled_strength",
        "impact": "high" if "jump" in text else "low",
        "floor_transfer_required": any(x in text for x in ["lie", "floor", "sit-up", "crunch"]),
        "overhead_movement": "overhead" in text or "raise" in text,
        "classifier_version": "rule-classifier-2026-07-18",
        "provenance": "rule_classifier",
        "confidence": 72,
        "manual_review_status": "pending",
    }

def import_dataset(source: Path, schema_path: Path | None = None) -> dict:
    records = json.loads(source.read_text(encoding="utf-8"))
    if schema_path and schema_path.exists():
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        Draft202012Validator(schema).validate(records)
    seen = set()
    failed = []
    normalized = []
    for row, record in enumerate(records, start=1):
        if record["id"] in seen:
            failed.append({"row": row, "source_id": record["id"], "reason": "duplicate source id"})
            continue
        seen.add(record["id"])
        normalized.append({
            "id": "exercise-" + record["id"],
            "source_id": record["id"],
            "deterministic_hash": hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest(),
            "slug": record["id"] + "-" + slugify(record["name"]),
            "name": record["name"],
            "body_part": record["body_part"].lower(),
            "equipment": record["equipment"].lower(),
            "target": record["target"].lower(),
            "locales": sorted(record["instructions"].keys()),
            "media": {"image": record["image"], "gif": record["gif_url"], "media_id": record["media_id"], "attribution": record["attribution"]},
            "tags": classify(record),
        })
    return {"source": str(source), "total_rows": len(records), "imported": len(normalized), "failed": failed, "locales": sorted({locale for item in normalized for locale in item["locales"]}), "media_committed": False}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--schema")
    args = parser.parse_args()
    source = Path(args.source)
    schema = Path(args.schema) if args.schema else source.with_name("exercises.schema.json")
    print(json.dumps(import_dataset(source, schema), indent=2))

if __name__ == "__main__":
    main()
