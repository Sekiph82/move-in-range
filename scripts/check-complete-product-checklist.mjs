import { readFileSync } from "node:fs";

const checklistPath = "docs/COMPLETE_PRODUCT_MASTER_CHECKLIST.md";
const checklist = readFileSync(checklistPath, "utf8");
const errors = [];

if (/^- \[~\] IN PROGRESS/m.test(checklist)) {
  errors.push("Checklist contains an in-progress task.");
}

if (/^- \[ \] NOT STARTED/m.test(checklist)) {
  errors.push("Checklist contains a not-started task.");
}

const taskBlocks = checklist.split(/\n(?=- \[[ x!~-]\])/);
for (const block of taskBlocks) {
  const header = block.split("\n")[0] ?? "";
  if (!header.startsWith("- [")) continue;
  if (header.includes("[x] COMPLETE")) {
    for (const required of ["Implementation files:", "Tests:", "Verification evidence:"]) {
      if (!block.includes(required)) errors.push(`Completed task missing ${required} ${header}`);
    }
    if (/Implementation files: TBD|Tests: TBD|Verification evidence: TBD/.test(block)) {
      errors.push(`Completed task has TBD evidence: ${header}`);
    }
  }
  if (header.includes("[!] BLOCKED")) {
    if (/Blockers: (None|TBD)\b/.test(block)) errors.push(`Blocked task has no blocker: ${header}`);
    if (/Implementation files: TBD|Tests: TBD/.test(block)) errors.push(`Blocked task missing interface/mock evidence: ${header}`);
  }
}

const repoText = [
  "package.json",
  "README.md",
  ".env.example",
  "apps/mobile/src/api.ts",
  "apps/admin/app/session.ts"
].map((path) => readFileSync(path, "utf8")).join("\n");

const legacyApiPort = 8_000;
const legacyAdminPort = 3_000;
const legacyPortPattern = new RegExp(`localhost:${legacyApiPort}|localhost:${legacyAdminPort}|0\\.0\\.0\\.0:${legacyApiPort}`);

if (legacyPortPattern.test(repoText)) {
  errors.push("Forbidden legacy local ports returned.");
}

if (/x-admin-role/i.test(repoText)) {
  errors.push("Unauthorized admin role header pattern returned to core source/config.");
}

if (/MoveInRangeAdminLocal!(?![A-Za-z])/.test(readFileSync("apps/admin/app/page.tsx", "utf8"))) {
  errors.push("Admin page embeds the local admin password.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Complete product checklist is closed and evidence-backed.");
