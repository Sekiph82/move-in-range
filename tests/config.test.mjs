import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter((file) => file && !file.endsWith("package-lock.json"));

test("MoveInRange local service URLs use canonical MVP ports", () => {
  const offenders = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const oldApi = new RegExp(`localhost:${8000}|127\\.0\\.0\\.1:${8000}`);
    const oldAdmin = new RegExp(`localhost:${3000}|127\\.0\\.0\\.1:${3000}`);
    if (oldApi.test(text) || oldAdmin.test(text)) {
      offenders.push(relative(process.cwd(), file));
    }
  }
  assert.deepEqual(offenders, []);
});
