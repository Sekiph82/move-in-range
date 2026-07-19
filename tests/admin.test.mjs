import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const { conditionPolicies } = await import("../packages/health-rules/src/index.ts");

test("admin policy rules are version-reviewable drafts by default", () => {
  assert.ok(conditionPolicies.length >= 1);
  assert.ok(conditionPolicies.every((rule) => rule.clinicalReviewState === "draft"));
});

test("admin console has functional pages instead of a single raw JSON dashboard", () => {
  const pages = [
    "dashboard/page.tsx",
    "users/page.tsx",
    "users/[id]/page.tsx",
    "exercises/page.tsx",
    "exercises/[id]/page.tsx",
    "policies/page.tsx",
    "policies/[id]/page.tsx",
    "policies/[id]/simulate/page.tsx",
    "privacy-jobs/page.tsx",
    "import-jobs/page.tsx",
    "notifications/page.tsx",
    "integrations/page.tsx",
    "system/page.tsx",
    "audit/page.tsx"
  ];
  for (const pagePath of pages) {
    assert.equal(existsSync(`apps/admin/app/${pagePath}`), true, pagePath);
  }
  const home = readFileSync("apps/admin/app/page.tsx", "utf8");
  assert.match(home, /redirect\("\/dashboard"\)/);
  assert.doesNotMatch(home, /JSON\.stringify/);
});

test("backend exposes admin CRUD and operations used by the console", () => {
  const routes = readFileSync("services/api/app/routes.py", "utf8");
  for (const endpoint of [
    '"/admin/users/{user_id}"',
    '"/admin/exercises/{exercise_id}"',
    '"/admin/policies/{policy_id}"',
    '"/admin/policies/{policy_id}/approve"',
    '"/admin/policies/{policy_id}/publish"',
    '"/admin/policies/{policy_id}/rollback"',
    '"/admin/import-jobs"',
    '"/admin/notifications"',
    '"/admin/integrations"',
    '"/admin/audit"'
  ]) {
    assert.match(routes, new RegExp(endpoint.replace(/[{}]/g, "\\$&")));
  }
});
