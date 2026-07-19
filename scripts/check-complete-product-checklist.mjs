import { readFileSync } from "node:fs";

const errors = [];
const checklistPaths = [
  "docs/COMPLETE_PRODUCT_MASTER_CHECKLIST.md",
  "docs/FUNCTIONAL_PRODUCT_COMPLETION_CHECKLIST.md",
  "docs/PRODUCT_ACCEPTANCE_CHECKLIST.md"
];

for (const checklistPath of checklistPaths) {
  const checklist = readFileSync(checklistPath, "utf8");

  if (/^- \[~\] IN PROGRESS/m.test(checklist)) {
    errors.push(`${checklistPath} contains an in-progress task.`);
  }

  if (/^- \[ \] NOT STARTED/m.test(checklist)) {
    errors.push(`${checklistPath} contains a not-started task.`);
  }

  const taskBlocks = checklist.split(/\n(?=- \[[ x!~-]\])/);
  for (const block of taskBlocks) {
    const header = block.split("\n")[0] ?? "";
    if (!header.startsWith("- [")) continue;
    if (header.includes("[x] COMPLETE")) {
      const requiredFields = checklistPath.includes("PRODUCT_ACCEPTANCE")
        ? ["feature:", "route:", "component:", "API endpoint:", "persistence:", "validation:", "unit-test evidence:", "integration-test evidence:", "E2E evidence:", "manual validation:", "blocker:"]
        : checklistPath.includes("FUNCTIONAL_PRODUCT")
          ? ["Backend:", "Mobile UI:", "Persistence:", "Authorization:", "Unit tests:", "Integration tests:", "E2E tests:"]
          : ["Implementation files:", "Tests:", "Verification evidence:"];
      for (const required of requiredFields) {
        if (!block.includes(required)) errors.push(`Completed task missing ${required} ${header}`);
      }
      if (/Implementation files: TBD|Tests: TBD|Verification evidence: TBD|Backend: TBD|Mobile UI: TBD|Persistence: TBD|Authorization: TBD/.test(block)) {
        errors.push(`Completed task has TBD evidence: ${header}`);
      }
      if (checklistPath.includes("PRODUCT_ACCEPTANCE") && /E2E evidence: (None|TBD|N\/A)\b/i.test(block)) {
        errors.push(`Completed acceptance item has no real E2E test name: ${header}`);
      }
      if (checklistPath.includes("PRODUCT_ACCEPTANCE") && /CRUD/i.test(header) && !/mutation|POST|PUT|PATCH|DELETE/i.test(block)) {
        errors.push(`Completed CRUD item has no mutation evidence: ${header}`);
      }
      if (checklistPath.includes("PRODUCT_ACCEPTANCE") && /provider activation/i.test(header) && !/sandbox|credential|blocker/i.test(block)) {
        errors.push(`Provider activation item lacks proof: ${header}`);
      }
    }
    if (header.includes("[!] BLOCKED")) {
      if (/Blockers: (None|TBD)\b/.test(block)) errors.push(`Blocked task has no blocker: ${header}`);
      if (/Implementation files: TBD|Tests: TBD/.test(block)) errors.push(`Blocked task missing interface/mock evidence: ${header}`);
      if (checklistPath.includes("PRODUCT_ACCEPTANCE") && !/blocker: .+/i.test(block)) errors.push(`Blocked acceptance item missing blocker field: ${header}`);
    }
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

console.log("Complete product checklists are closed and evidence-backed.");
