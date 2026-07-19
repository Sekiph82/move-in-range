import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const files = trackedOrWorkspaceFiles().filter((file) => file && existsSync(file) && !file.endsWith("package-lock.json"));

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

test("Android Expo config blocks broad storage and overlay permissions", () => {
  const appJson = JSON.parse(readFileSync("apps/mobile/app.json", "utf8"));
  const android = appJson.expo.android;
  assert.equal(android.package, "com.moveinrange.app");
  assert.deepEqual(android.permissions, ["INTERNET", "VIBRATE"]);
  for (const permission of ["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "SYSTEM_ALERT_WINDOW"]) {
    assert.ok(android.blockedPermissions.includes(`android.permission.${permission}`), permission);
    assert.equal(android.permissions.includes(`android.permission.${permission}`), false, permission);
    assert.equal(android.permissions.includes(permission), false, permission);
  }

  const eas = JSON.parse(readFileSync("eas.json", "utf8"));
  const releaseText = JSON.stringify([eas.build.preview, eas.build.production]);
  assert.doesNotMatch(releaseText, /localhost|127\.0\.0\.1|10\.0\.2\.2|mailpit/i);
});
