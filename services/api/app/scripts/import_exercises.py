import argparse
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.models import Exercise, ExerciseLocalization, ExerciseMedia, ExerciseTag
from app.db.session import SessionLocal, init_db

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


def _manifest_by_exercise(path: Path | None) -> dict[str, dict]:
    if not path or not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {item["exercise_id"]: item for item in payload.get("items", [])}


def _media_values(record: dict, manifest_item: dict | None) -> dict:
    image_url = (manifest_item or {}).get("image_url") or ""
    gif_url = (manifest_item or {}).get("gif_url") or ""
    hosted = image_url.startswith("https://") and gif_url.startswith("https://")
    return {
        "image_path": image_url if hosted else record.get("image", ""),
        "gif_path": gif_url if hosted else record.get("gif_url", ""),
        "license_status": "available" if hosted else "review_required",
        "manifest": {
            "source_version": (manifest_item or {}).get("source_version"),
            "image_sha256": (manifest_item or {}).get("image_sha256"),
            "gif_sha256": (manifest_item or {}).get("gif_sha256"),
            "image_width": (manifest_item or {}).get("image_width"),
            "image_height": (manifest_item or {}).get("image_height"),
            "gif_width": (manifest_item or {}).get("gif_width"),
            "gif_height": (manifest_item or {}).get("gif_height"),
            "gif_frames": (manifest_item or {}).get("gif_frames"),
            "gif_duration_ms": (manifest_item or {}).get("gif_duration_ms"),
            "status": (manifest_item or {}).get("status"),
        },
    }


def _upsert_exercise(db: Session, record: dict, manifest_item: dict | None = None) -> None:
    exercise_id = "exercise-" + record["id"]
    exercise = db.get(Exercise, exercise_id)
    if not exercise:
        exercise = Exercise(id=exercise_id, source_id=record["id"])
        db.add(exercise)
    exercise.slug = record["id"] + "-" + slugify(record["name"])
    exercise.name = record["name"]
    exercise.body_part = record["body_part"].lower()
    exercise.equipment = record["equipment"].lower()
    exercise.target = record["target"].lower()
    exercise.secondary_muscles = record.get("secondary_muscles", [])
    exercise.source_metadata = {
        "category": record.get("category"),
        "muscle_group": record.get("muscle_group"),
        "deterministic_hash": hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest(),
        "attribution": record.get("attribution"),
        "media_manifest": _media_values(record, manifest_item)["manifest"],
    }

    for locale, instructions in record["instructions"].items():
        loc = (
            db.query(ExerciseLocalization)
            .filter(ExerciseLocalization.exercise_id == exercise_id, ExerciseLocalization.locale == locale)
            .one_or_none()
        )
        if not loc:
            loc = ExerciseLocalization(exercise_id=exercise_id, locale=locale)
            db.add(loc)
        loc.instructions = instructions
        loc.instruction_steps = record.get("instruction_steps", {}).get(locale, [])

    media = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise_id).one_or_none()
    if not media:
        media = ExerciseMedia(exercise_id=exercise_id)
        db.add(media)
    media_values = _media_values(record, manifest_item)
    media.media_id = record.get("media_id", "")
    media.image_path = media_values["image_path"]
    media.gif_path = media_values["gif_path"]
    media.attribution = record.get("attribution", "")
    media.license_status = media_values["license_status"]

    tag = db.query(ExerciseTag).filter(ExerciseTag.exercise_id == exercise_id).one_or_none()
    tags = classify(record)
    if not tag:
        tag = ExerciseTag(exercise_id=exercise_id)
        db.add(tag)
    tag.classifier_version = tags["classifier_version"]
    tag.tags = tags
    tag.provenance = tags["provenance"]
    tag.confidence = tags["confidence"]
    tag.manual_review_status = tags["manual_review_status"]


def _upsert_exercises(db: Session, records: list[dict], manifest: dict[str, dict] | None = None) -> None:
    exercise_ids = ["exercise-" + record["id"] for record in records]
    exercises = {
        exercise.id: exercise
        for exercise in db.scalars(select(Exercise).where(Exercise.id.in_(exercise_ids))).all()
    }
    localizations = {
        (localization.exercise_id, localization.locale): localization
        for localization in db.scalars(select(ExerciseLocalization).where(ExerciseLocalization.exercise_id.in_(exercise_ids))).all()
    }
    media_by_exercise = {
        media.exercise_id: media
        for media in db.scalars(select(ExerciseMedia).where(ExerciseMedia.exercise_id.in_(exercise_ids))).all()
    }
    tags_by_exercise = {
        tag.exercise_id: tag
        for tag in db.scalars(select(ExerciseTag).where(ExerciseTag.exercise_id.in_(exercise_ids))).all()
    }

    for record in records:
        exercise_id = "exercise-" + record["id"]
        exercise = exercises.get(exercise_id)
        if not exercise:
            exercise = Exercise(id=exercise_id, source_id=record["id"])
            db.add(exercise)
            exercises[exercise_id] = exercise
        exercise.slug = record["id"] + "-" + slugify(record["name"])
        exercise.name = record["name"]
        exercise.body_part = record["body_part"].lower()
        exercise.equipment = record["equipment"].lower()
        exercise.target = record["target"].lower()
        exercise.secondary_muscles = record.get("secondary_muscles", [])
        media_values = _media_values(record, (manifest or {}).get(record["id"]))
        exercise.source_metadata = {
            "category": record.get("category"),
            "muscle_group": record.get("muscle_group"),
            "deterministic_hash": hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest(),
            "attribution": record.get("attribution"),
            "media_manifest": media_values["manifest"],
        }

        for locale, instructions in record["instructions"].items():
            key = (exercise_id, locale)
            loc = localizations.get(key)
            if not loc:
                loc = ExerciseLocalization(exercise_id=exercise_id, locale=locale)
                db.add(loc)
                localizations[key] = loc
            loc.instructions = instructions
            loc.instruction_steps = record.get("instruction_steps", {}).get(locale, [])

        media = media_by_exercise.get(exercise_id)
        if not media:
            media = ExerciseMedia(exercise_id=exercise_id)
            db.add(media)
            media_by_exercise[exercise_id] = media
        media.media_id = record.get("media_id", "")
        media.image_path = media_values["image_path"]
        media.gif_path = media_values["gif_path"]
        media.attribution = record.get("attribution", "")
        media.license_status = media_values["license_status"]

        tag = tags_by_exercise.get(exercise_id)
        tags = classify(record)
        if not tag:
            tag = ExerciseTag(exercise_id=exercise_id)
            db.add(tag)
            tags_by_exercise[exercise_id] = tag
        tag.classifier_version = tags["classifier_version"]
        tag.tags = tags
        tag.provenance = tags["provenance"]
        tag.confidence = tags["confidence"]
        tag.manual_review_status = tags["manual_review_status"]


def import_dataset(source: Path, schema_path: Path | None = None, persist: bool = True, media_manifest_path: Path | None = None) -> dict:
    records = json.loads(source.read_text(encoding="utf-8"))
    manifest = _manifest_by_exercise(media_manifest_path)
    if schema_path and schema_path.exists():
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        Draft202012Validator(schema).validate(records)
    seen = set()
    failed = []
    normalized = []
    records_to_persist = []
    db = SessionLocal() if persist else None
    try:
        if persist:
            init_db()
        for row, record in enumerate(records, start=1):
            if record["id"] in seen:
                failed.append({"row": row, "source_id": record["id"], "reason": "duplicate source id"})
                continue
            seen.add(record["id"])
            records_to_persist.append(record)
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
        if db:
            _upsert_exercises(db, records_to_persist, manifest)
        if db:
            db.commit()
    except Exception:
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()
    hosted_media = sum(1 for item in manifest.values() if item.get("image_url", "").startswith("https://") and item.get("gif_url", "").startswith("https://"))
    return {"source": str(source), "total_rows": len(records), "imported": len(normalized), "failed": failed, "failed_rows": len(failed), "locales": sorted({locale for item in normalized for locale in item["locales"]}), "media_committed": hosted_media > 0, "hosted_media": hosted_media}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--schema")
    parser.add_argument("--media-manifest")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    source = Path(args.source)
    schema = Path(args.schema) if args.schema else source.with_name("exercises.schema.json")
    manifest = Path(args.media_manifest) if args.media_manifest else None
    print(json.dumps(import_dataset(source, schema, persist=not args.validate_only, media_manifest_path=manifest), indent=2))

if __name__ == "__main__":
    main()
