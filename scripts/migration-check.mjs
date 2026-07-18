import { existsSync } from "node:fs";
const migration = "services/api/alembic/versions/20260718_0001_initial.py";
if (!existsSync(migration)) throw new Error("Initial migration is missing");
console.log("Migration validation: initial Alembic migration present.");
