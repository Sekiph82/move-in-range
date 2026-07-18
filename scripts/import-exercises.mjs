import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const source = process.argv[2] ?? "../exercises-dataset-main/data/exercises.json";
const records = JSON.parse(readFileSync(source, "utf8"));
const required = ["id", "name", "body_part", "equipment", "instructions", "instruction_steps", "target", "media_id", "image", "gif_url", "attribution", "created_at"];
const seen = new Set();
const failed = [];
let imported = 0;
const locales = new Set();
for (const [index, record] of records.entries()) {
  const missing = required.filter((field) => record[field] === undefined);
  if (missing.length) {
    failed.push({ row: index + 1, id: record.id, reason: `missing ${missing.join(",")}` });
    continue;
  }
  if (seen.has(record.id)) {
    failed.push({ row: index + 1, id: record.id, reason: "duplicate id" });
    continue;
  }
  seen.add(record.id);
  Object.keys(record.instructions).forEach((locale) => locales.add(locale));
  createHash("sha256").update(JSON.stringify(record)).digest("hex");
  imported += 1;
}
const summary = { source, totalRows: records.length, imported, failedRows: failed.length, failed, locales: [...locales].sort(), mediaCommitted: false };
console.log(JSON.stringify(summary, null, 2));
if (failed.length) process.exitCode = 1;
