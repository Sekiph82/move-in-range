# EXERCISE IMPORT

Importer validates required schema fields, detects duplicate source IDs, creates deterministic IDs and hashes, normalizes equipment/body part/target text, imports localization keys, preserves media paths and attribution, derives draft classifier tags, and does not copy or commit media by default. Command: npm.cmd run import:exercises -- ..\\exercises-dataset-main\\data\\exercises.json or python -m app.scripts.import_exercises --source <dataset-path> from services/api after installing Python dependencies.
