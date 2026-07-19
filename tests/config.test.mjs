import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
  assert.equal(appJson.expo.slug, "move-in-range");
  assert.equal(android.package, "com.moveinrange.app");
  assert.equal(appJson.expo.ios.bundleIdentifier, "com.moveinrange.app");
  assert.equal(appJson.expo.extra.eas.projectId, "30719dd8-101e-4acd-8d2a-e5880d60b721");
  assert.deepEqual(android.permissions, ["INTERNET", "VIBRATE"]);
  for (const permission of ["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "SYSTEM_ALERT_WINDOW"]) {
    assert.ok(android.blockedPermissions.includes(`android.permission.${permission}`), permission);
    assert.equal(android.permissions.includes(`android.permission.${permission}`), false, permission);
    assert.equal(android.permissions.includes(permission), false, permission);
  }

  const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
  assert.equal(eas.build.preview.distribution, "internal");
  assert.equal(eas.build.preview.android.buildType, "apk");
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_ENABLE_DEMO_LOGIN, "false");
  assert.equal(eas.build.production.env.EXPO_PUBLIC_ENABLE_DEMO_LOGIN, "false");
  const releaseText = JSON.stringify([eas.build.preview, eas.build.production]);
  assert.doesNotMatch(releaseText, /localhost|127\.0\.0\.1|10\.0\.2\.2|mailpit/i);
});

test("Android package identifier is consistent across EAS documentation", () => {
  const appJson = JSON.parse(readFileSync("apps/mobile/app.json", "utf8"));
  const canonicalPackage = appJson.expo.android.package;
  assert.equal(canonicalPackage, "com.moveinrange.app");
  for (const docPath of ["docs/ANDROID_BETA_BUILD_HANDOFF.md", "docs/CLOSED_BETA_GO_NO_GO.md", "docs/EAS_ANDROID_BUNDLE_ROOT_CAUSE.md"]) {
    const text = readFileSync(docPath, "utf8");
    assert.match(text, new RegExp(canonicalPackage.replace(/\./g, "\\.")), docPath);
    if (!docPath.endsWith("EAS_ANDROID_BUNDLE_ROOT_CAUSE.md")) {
      assert.doesNotMatch(text, /com\.sekiphayit\.moveinrange/, docPath);
    }
  }
});

test("mobile EAS config targets the Expo Router workspace app root", () => {
  assert.equal(existsSync("eas.json"), false, "root eas.json would make the repository root ambiguous for EAS");
  assert.equal(existsSync("app.json"), false, "root app.json would make EAS treat the repo root as a traditional Expo app");
  assert.equal(existsSync("App.tsx"), false, "root App.tsx must not be required for the mobile app");
  assert.equal(existsSync("App.js"), false, "root App.js must not be required for the mobile app");
  assert.equal(existsSync("apps/mobile/eas.json"), true);
  assert.equal(existsSync("apps/mobile/app/_layout.tsx"), true);

  const mobilePackage = JSON.parse(readFileSync("apps/mobile/package.json", "utf8"));
  assert.equal(mobilePackage.main, "expo-router/entry");
  const mobileEas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
  assert.equal(mobileEas.cli.appVersionSource, "local");
  for (const profile of ["development", "preview", "production"]) {
    assert.ok(mobileEas.build[profile], profile);
  }

  const mobileSource = [
    readFileSync("apps/mobile/package.json", "utf8"),
    readFileSync("apps/mobile/eas.json", "utf8"),
    readFileSync("apps/mobile/app.json", "utf8"),
    readFileSync("apps/mobile/metro.config.cjs", "utf8"),
    readFileSync("apps/mobile/babel.config.cjs", "utf8")
  ].join("\n");
  assert.doesNotMatch(mobileSource, /expo\/AppEntry|import App from ["']\.\.\/\.\.\/App["']|App\.tsx/);
});

test("EAS archive inspection output keeps mobile router files when present", () => {
  const archiveRoot = ".local/eas-archive";
  if (!existsSync(archiveRoot)) return;
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = `${dir}/${entry}`;
      if (statSync(path).isDirectory()) {
        walk(path);
      } else {
        found.push(path.replace(/\\/g, "/"));
      }
    }
  };
  walk(archiveRoot);
  assert.ok(found.some((path) => path.endsWith("/apps/mobile/package.json") || path === "package.json"), "archive package.json missing");
  const packagePath = found.find((path) => path.endsWith("/apps/mobile/package.json")) ?? found.find((path) => path === "package.json");
  const archivedPackage = JSON.parse(readFileSync(packagePath, "utf8"));
  assert.equal(archivedPackage.main, "expo-router/entry");
  assert.ok(found.some((path) => path === "apps/mobile/app/_layout.tsx" || path.endsWith("/apps/mobile/app/_layout.tsx")), "archive omitted Expo Router layout");
  assert.ok(found.some((path) => path === "apps/mobile/metro.config.cjs" || path.endsWith("/apps/mobile/metro.config.cjs")), "archive omitted Metro config");
  assert.ok(found.some((path) => path === "packages/shared-types/package.json" || path.endsWith("/packages/shared-types/package.json")), "archive omitted shared workspace packages");
  assert.equal(found.some((path) => /^App\.(tsx|ts|js|jsx)$/.test(path)), false, "archive depends on root App component");
});
