import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const forbidden = [/TODO: unsafe/i, /recommend\s+.*insulin/i, /calculate\s+.*insulin/i, /guarantee prevention of hypoglycemia/i];
const roots = ["packages", "apps", "services", "docs", "scripts"];
const ignoredDirectories = new Set(["node_modules", ".next", "dist", "__pycache__", ".pytest_cache", ".ruff_cache", ".local"]);
const files = [];
function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    if (error?.code === "EACCES" || error?.code === "EPERM") return;
    throw error;
  }
  for (const entry of entries) {
    if (ignoredDirectories.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}
roots.filter((root) => statSync(root, { throwIfNoEntry: false })?.isDirectory()).forEach(walk);
const failures = [];
for (const file of files) {
  if (file.endsWith("check-no-placeholders.mjs")) continue;
  const text = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push({ file, pattern: pattern.source });
  }
}
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log(`Checked ${files.length} files for prohibited safety language.`);
