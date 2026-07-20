# Source Repository Review

## Exercise Dataset

Reviewed the local exercise dataset import source.

- `data/exercises.json` contains 1,324 exercise records.
- `data/exercises.schema.json` describes the JSON shape.
- Instructions are available in 10 locales: English, Spanish, French, Hindi, Italian, Korean, Polish, Russian, Turkish, and Chinese.
- Records include category/body part, equipment, target, secondary muscles, media ids, image/GIF paths, and attribution.
- MoveInRange imports metadata and attribution but does not commit the full image/GIF library.

## MVP Application Impact

The functional MVP keeps MoveInRange medically conservative and API-backed. Exercise data is imported through the FastAPI importer into SQLAlchemy tables, while media is hosted outside Git and exposed through canonical HTTPS URLs.
