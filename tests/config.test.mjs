import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { execFileSync } from "node:child_process";

function trackedOrWorkspaceFiles() {
  try {
    return execFileSync("git", ["ls-files"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    const ignoredDirs = new Set([".git", "node_modules", ".next", ".expo", ".pytest_cache", ".ruff_cache", ".local"]);
    const ignoredExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".db", ".sqlite"]);
    const found = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = dir === "." ? entry.name : `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) walk(path);
          continue;
        }
        if (![...ignoredExtensions].some((ext) => entry.name.endsWith(ext))) found.push(path);
      }
    };
    walk(".");
    return found;
  }
}

const files = trackedOrWorkspaceFiles().filter((file) => file && !file.endsWith("package-lock.json"));

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

test("admin environment variables use canonical LOCAL_ADMIN names", () => {
  const offenders = [];
  for (const file of files) {
    if (file.replace(/\\/g, "/").endsWith("tests/config.test.mjs")) continue;
    const text = readFileSync(file, "utf8");
    if (/ADMIN_LOCAL_EMAIL|ADMIN_LOCAL_PASSWORD/.test(text)) offenders.push(relative(process.cwd(), file));
  }
  assert.deepEqual(offenders, []);
});
