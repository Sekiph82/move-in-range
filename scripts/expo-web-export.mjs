import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mobileRoot = resolve(repoRoot, "apps/mobile");
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["expo", "export", "--platform", "web", "--output-dir", ".expo-web-export"], {
  cwd: mobileRoot,
  env: { ...process.env, EXPO_ROUTER_APP_ROOT: "app" },
  shell: process.platform === "win32",
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
