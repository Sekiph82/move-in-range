import test from "node:test";
import assert from "node:assert/strict";
const { conditionPolicies } = await import("../packages/health-rules/src/index.ts");

test("admin policy rules are version-reviewable drafts by default", () => {
  assert.ok(conditionPolicies.length >= 1);
  assert.ok(conditionPolicies.every((rule) => rule.clinicalReviewState === "draft"));
});
