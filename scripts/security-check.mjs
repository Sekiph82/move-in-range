import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const secretPatterns = [/BEGIN PRIVATE KEY/, /AKIA[0-9A-Z]{16}/, /SUPABASE_SERVICE_ROLE_KEY\s*=/, /CLERK_SECRET_KEY\s*=/, /OPENAI_API_KEY\s*=/];
const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", ".npm-cache", ".local", ".pytest-tmp", ".pytest_cache", ".ruff_cache", ".expo", ".expo-web-export", "android"]);
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(".");
const hits = [];
for (const file of files) {
  if (file.endsWith("security-check.mjs")) continue;
  const text = readFileSync(file, "utf8");
  for (const pattern of secretPatterns) if (pattern.test(text)) hits.push({ file, pattern: pattern.source });
}
if (hits.length) {
  console.error(JSON.stringify(hits, null, 2));
  process.exit(1);
}
console.log(`Security check: scanned ${files.length} files, no obvious committed secrets found.`);
