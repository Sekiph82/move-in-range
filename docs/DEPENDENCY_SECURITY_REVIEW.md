# Dependency Security Review

## Python

GitHub security initially failed on vulnerable `pytest` and transitive `starlette` versions. The API pins were updated to:

- `fastapi==0.139.2`, resolving to `starlette==1.3.1`
- `pytest==9.1.1`

GitHub Actions `security` passed after the update. Local Windows `pip-audit -r services/api/requirements.txt` timed out in this environment during one run, so the CI result is the authoritative Python audit result for this branch.

## npm

`npm.cmd audit --json` reports 13 moderate findings, 0 high, and 0 critical.

| Package | Dependency path | Workspace impact | Exploitability in this project | Fix availability | Decision |
|---|---|---|---|---|---|
| `@expo/cli` | `expo -> @expo/cli` | Mobile development/build tooling | Development and bundle tooling exposure; not an API runtime dependency. | Expo 57 major upgrade. | Deferred pending native/device regression pass. |
| `@expo/config` | Expo config stack and `expo-constants` | Mobile configuration tooling | Build/config processing exposure. | Expo 57 major upgrade. | Deferred. |
| `@expo/config-plugins` | `expo -> @expo/config-plugins -> xcode` | Mobile prebuild tooling | Primarily local/prebuild impact. | Expo 57 major upgrade. | Deferred. |
| `@expo/metro-config` | Expo Metro config and `postcss` | Mobile bundler | Bundler/CSS processing exposure. | Expo 57 major upgrade. | Deferred. |
| `@expo/prebuild-config` | Expo prebuild stack | Mobile prebuild tooling | Development/prebuild only in current MVP. | npm reports fix available through dependency updates. | Deferred to Expo modernization. |
| `expo` | Direct dependency in `apps/mobile` | Mobile runtime/toolchain | Direct app dependency; major SDK jump can break native compatibility. | Expo 57.0.7 major upgrade. | Deferred. |
| `expo-asset` | `expo -> expo-asset` | Mobile asset handling | Runtime asset path handling; no committed third-party media payloads. | Expo 57 major upgrade. | Deferred. |
| `expo-constants` | `expo`, `expo-asset`, `expo-notifications` | Mobile runtime/config | Runtime config exposure; no public admin secrets are stored in Expo public env. | Expo/notifications 57 major upgrade. | Deferred. |
| `expo-notifications` | Direct dependency in `apps/mobile` | Mobile notifications | Notifications are adapter-only in MVP; no production push delivery configured. | `expo-notifications` 57 major upgrade. | Deferred. |
| `next` | Direct dependency in `apps/admin` | Admin build/server | Advisory path is transitive `postcss`; admin is local MVP, not public production. | npm suggests an incompatible major downgrade target. | Deferred; monitor upstream patch path. |
| `postcss` | `next` and Expo Metro config | CSS processing | XSS requires malicious CSS stringify input; no user-authored CSS ingestion exists. | Requires Next/Expo dependency changes. | Deferred. |
| `uuid` | `xcode -> uuid` | Expo config tooling | Buffer API issue in tooling path; not used directly by API/admin runtime. | Expo 57 major upgrade. | Deferred. |
| `xcode` | `@expo/config-plugins -> xcode` | iOS prebuild tooling | Local native project generation path. | Expo 57 major upgrade. | Deferred. |

No safe non-breaking npm upgrade was available for these findings. `npm.cmd audit --audit-level=high` remains the gating command and passes because no high or critical npm vulnerabilities are reported.
