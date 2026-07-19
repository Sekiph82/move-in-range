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


def _upsert_exercise(db: Session, record: dict) -> None:
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
        "deterministic_hash": hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest(),
        "attribution": record.get("attribution"),
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
    media.media_id = record.get("media_id", "")
    media.image_path = record.get("image", "")
    media.gif_path = record.get("gif_url", "")
    media.attribution = record.get("attribution", "")
    media.license_status = "external_terms_required"

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


def _upsert_exercises(db: Session, records: list[dict]) -> None:
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
        exercise.source_metadata = {
            "category": record.get("category"),
            "deterministic_hash": hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest(),
            "attribution": record.get("attribution"),
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
        media.image_path = record.get("image", "")
        media.gif_path = record.get("gif_url", "")
        media.attribution = record.get("attribution", "")
        media.license_status = "external_terms_required"

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


def import_dataset(source: Path, schema_path: Path | None = None, persist: bool = True) -> dict:
    records = json.loads(source.read_text(encoding="utf-8"))
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
            _upsert_exercises(db, records_to_persist)
        if db:
            db.commit()
    except Exception:
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()
    return {"source": str(source), "total_rows": len(records), "imported": len(normalized), "failed": failed, "failed_rows": len(failed), "locales": sorted({locale for item in normalized for locale in item["locales"]}), "media_committed": False}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--schema")
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    source = Path(args.source)
    schema = Path(args.schema) if args.schema else source.with_name("exercises.schema.json")
    print(json.dumps(import_dataset(source, schema, persist=not args.validate_only), indent=2))

if __name__ == "__main__":
    main()
