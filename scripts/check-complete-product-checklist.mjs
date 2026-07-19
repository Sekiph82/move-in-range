import { readFileSync } from "node:fs";

const errors = [];
const checklistPaths = [
  "docs/COMPLETE_PRODUCT_MASTER_CHECKLIST.md",
  "docs/FUNCTIONAL_PRODUCT_COMPLETION_CHECKLIST.md",
  "docs/PRODUCT_ACCEPTANCE_CHECKLIST.md",
  "docs/REAL_BETA_COMPLETION_CHECKLIST.md",
  "docs/CLOSED_BETA_READINESS_CHECKLIST.md",
  "docs/RELEASE_REHEARSAL_CHECKLIST.md"
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
      const requiredFields = checklistPath.includes("CLOSED_BETA")
        ? ["route:", "component:", "user action:", "API endpoint:", "persistence:", "authorization:", "validation:", "unit test:", "integration test:", "product E2E:", "admin E2E:", "Android validation:", "manual evidence:", "blocker:"]
        : checklistPath.includes("RELEASE_REHEARSAL")
        ? ["code evidence:", "role:", "API endpoint:", "UI route:", "persisted result:", "unit test:", "PostgreSQL integration test:", "browser E2E:", "Docker result:", "Android artifact evidence:", "blocker:", "go/no-go result:"]
        : checklistPath.includes("REAL_BETA")
        ? ["route:", "component:", "user action:", "API endpoint:", "persistence:", "validation:", "loading state:", "empty state:", "error state:", "success state:", "unit test:", "integration test:", "browser E2E:", "device validation:", "blocker:"]
        : checklistPath.includes("PRODUCT_ACCEPTANCE")
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
      if (checklistPath.includes("REAL_BETA") && /\b(mock|internal fallback pending|not loaded|achievement_key|event_type|value: 112)\b/i.test(block)) {
        errors.push(`Completed beta item exposes internal or sample wording: ${header}`);
      }
      if (checklistPath.includes("CLOSED_BETA") && /product E2E: (None|TBD|N\/A)\b/i.test(block)) {
        errors.push(`Completed closed-beta item lacks product E2E evidence: ${header}`);
      }
      if (checklistPath.includes("CLOSED_BETA") && /admin CRUD|admin mutation/i.test(header) && !/admin E2E: .*Playwright/i.test(block)) {
        errors.push(`Completed admin item lacks mutation E2E evidence: ${header}`);
      }
      if (checklistPath.includes("RELEASE_REHEARSAL") && /full dataset/i.test(header) && /SQLite/i.test(block)) {
        errors.push(`Release rehearsal dataset item references SQLite acceptance: ${header}`);
      }
      if (checklistPath.includes("RELEASE_REHEARSAL") && /Android installable preview artifact/i.test(header)) {
        errors.push(`Android installable artifact is marked complete without APK/build evidence: ${header}`);
      }
    }
    if (header.includes("[!] BLOCKED")) {
      if (/Blockers: (None|TBD)\b/.test(block)) errors.push(`Blocked task has no blocker: ${header}`);
      if (/Implementation files: TBD|Tests: TBD/.test(block)) errors.push(`Blocked task missing interface/mock evidence: ${header}`);
      if (checklistPath.includes("PRODUCT_ACCEPTANCE") && !/blocker: .+/i.test(block)) errors.push(`Blocked acceptance item missing blocker field: ${header}`);
      if (checklistPath.includes("REAL_BETA") && !/blocker: .+/i.test(block)) errors.push(`Blocked beta item missing blocker field: ${header}`);
      if (checklistPath.includes("CLOSED_BETA") && !/blocker: .+/i.test(block)) errors.push(`Blocked closed-beta item missing blocker field: ${header}`);
      if (checklistPath.includes("RELEASE_REHEARSAL") && !/blocker: .+/i.test(block)) errors.push(`Blocked release rehearsal item missing blocker field: ${header}`);
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

const rbacMatrix = readFileSync("docs/RBAC_OPERATION_MATRIX.md", "utf8");
const matrixRows = Object.fromEntries(
  rbacMatrix
    .split("\n")
    .filter((line) => line.startsWith("| "))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 8)
    .map((cells) => [cells[1], { super_admin: cells[2], clinical_reviewer: cells[3], exercise_reviewer: cells[4], content_editor: cells[5], support: cells[6], analyst: cells[7] }])
);
if (matrixRows.user_role_update?.support === "ALLOWED") {
  errors.push("RBAC matrix allows support role updates.");
}
if (matrixRows.integration_disable?.analyst === "ALLOWED") {
  errors.push("RBAC matrix allows analyst integration disable.");
}
if (matrixRows.policy_publish?.clinical_reviewer === "ALLOWED") {
  errors.push("RBAC matrix allows clinical reviewer policy publish.");
}

const productUiE2e = readFileSync("tests/product-ui-e2e.test.mjs", "utf8");
const productUiScenarios = [
  "product password reset",
  "product auth and route guards",
  "product readiness and plans",
  "product workout and feedback",
  "product diabetes and calendar",
  "product privacy logout and persistence",
  "product web UI closed beta flow"
];
for (const scenario of productUiScenarios) {
  if (!productUiE2e.includes(scenario)) errors.push(`Product UI E2E missing scenario: ${scenario}`);
}

const platformTests = readFileSync("services/api/tests/test_complete_product_platform.py", "utf8");
if (!/password_hash.*not in archive_text/s.test(platformTests) || !/refresh_token.*not in archive_text/s.test(platformTests)) {
  errors.push("Privacy export lacks explicit secret-exclusion test evidence.");
}
if (!/sessions_revoked/.test(platformTests) || !/auth\/refresh/.test(platformTests)) {
  errors.push("Deletion lacks session-revocation test evidence.");
}

const adminMutationProxy = readFileSync("apps/admin/app/api/admin-session/mutate/route.ts", "utf8");
if (/exercise_content_update/.test(adminMutationProxy)) {
  errors.push("Legacy exercise_content_update mutation returned to the admin proxy.");
}
for (const operationBlock of adminMutationProxy.matchAll(/exercise_[a-z_]+:\s*\{[\s\S]*?\n  \}/g)) {
  const block = operationBlock[0];
  const hasContentFields = /\b(title|instruction_steps|form_cues|common_mistakes|breathing_cues)\b/.test(block);
  const hasSafetyFields = /\b(safety_tags|restricted_regions|contraindication_categories|substitution_id|publish_state)\b/.test(block);
  if (hasContentFields && hasSafetyFields) {
    errors.push(`Exercise admin operation mixes content and safety fields: ${block.split(":")[0]}`);
  }
}
const backendRoutes = readFileSync("services/api/app/routes.py", "utf8");
if (/@router\.patch\("\/admin\/exercises\/\{exercise_id\}"\)/.test(backendRoutes)) {
  errors.push("Generic admin exercise PATCH endpoint returned.");
}

const releaseChecklist = readFileSync("docs/RELEASE_REHEARSAL_CHECKLIST.md", "utf8");
if (/PostgreSQL full dataset acceptance[\s\S]*SQLite/i.test(releaseChecklist)) {
  errors.push("Release checklist uses SQLite for full dataset acceptance.");
}
const androidArtifactBlock = releaseChecklist.split(/\n(?=- \[[ x!~-]\])/).find((block) => /Android installable preview artifact/i.test(block)) ?? "";
if (/go\/no-go result: GO\b/i.test(androidArtifactBlock)) {
  errors.push("Android artifact is marked GO without APK/build evidence.");
}
if (!/Backup and restore rehearsal[\s\S]*restore/i.test(releaseChecklist)) {
  errors.push("Backup rehearsal lacks restore verification.");
}
if (!/Stacked Merge Rehearsal/i.test(readFileSync("docs/STACKED_MERGE_REHEARSAL.md", "utf8"))) {
  errors.push("Merge rehearsal lacks command evidence.");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Complete product checklists are closed and evidence-backed.");
