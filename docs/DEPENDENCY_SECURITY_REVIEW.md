# Dependency Security Review

## Python

GitHub security initially failed on vulnerable `pytest` and transitive `starlette` versions. The API pins were updated to:

- `fastapi==0.139.2`, resolving to `starlette==1.3.1`
- `pytest==9.1.1`

GitHub Actions `security` passed after the update. Local Windows `pip-audit -r services/api/requirements.txt` timed out in this environment during one run, so the CI result is the authoritative Python audit result for this branch.

## npm

`npm.cmd audit --json` reports 13 moderate findings, 0 high, and 0 critical.

Affected dependency families:

- Expo toolchain: `expo`, `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/metro-config`, `@expo/prebuild-config`, `expo-asset`, `expo-constants`, `expo-notifications`.
- Admin/build toolchain: `next` and transitive `postcss`.
- Expo config tooling: `xcode` and transitive `uuid`.

The available npm fixes require major upgrades such as Expo 57 and major Next changes. Those upgrades were not applied in this MVP branch because they can affect native runtime compatibility and should be handled as a separate dependency modernization task with device testing.

GitHub security uses `npm audit --audit-level=high`; it passes because no high or critical npm vulnerabilities are currently reported.
