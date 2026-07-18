import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const source = resolve(process.argv[2] ?? "../exercises-dataset-main/data/exercises.json");
const args = ["-m", "app.scripts.import_exercises", "--source", source];
const result = spawnSync("python", args, {
  cwd: "services/api",
  stdio: "inherit",
  env: process.env
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
