# CR-20260826-005 - Dependency Major Modernization

- Date: 2026-08-26
- Repository: `Sekiph82/move-in-range`
- Branch: `codex/main-consolidation`
- Implementation commits: `ef798d0`, `fd3150c`
- Scope: dependency modernization and framework compatibility only
- Authoritative audit: not written by Codex; reserved for ChatGPT audit layer

## 1. Pre-migration graph

Fresh Phase 1 evidence from `npm audit --json`, `npm audit --audit-level=high`,
`npm ls --all`, `npm explain`, and the requested package explanations:

- Baseline: 20 vulnerabilities: 11 moderate, 9 high, 0 critical.
- High owner chains: `image-size` through Expo/Metro (`metro`, `metro-config`,
  `metro-transform-worker`, `@expo/metro`, `@expo/metro-config`) and `postcss`
  through Expo Metro config and Next.
- The package explanations confirmed these were transitive framework-owned
  dependencies, not direct application imports.

## 2. Selected targets

- Expo `~57.0.16`, React Native `0.86.2`, React/React DOM `19.2.3`, and the
  Expo-managed package set selected using Expo SDK 57 compatibility tooling.
  SDK 57 is the supported target for the current Metro/image-size chain; the
  official upgrade flow was followed with `expo install --fix`.
- Next `^16.3.3` selected as the minimum secure parent target reported for the
  PostCSS chain and compatible with React 19.2 and this App Router codebase.
- TypeScript `~6.0.3` and React type packages were aligned across all
  workspaces. `ignoreDeprecations: "6.0"` preserves the existing path aliases
  while TypeScript 6 deprecates `baseUrl`.

## 3. Exact changes

- Upgraded Expo-managed mobile dependencies from SDK 54/RN 0.81 to SDK 57/RN
  0.86, including Expo Router, Metro runtime, constants, notifications,
  secure-store, speech, SQLite, safe-area, screens, SVG, and web packages.
- Added Expo SDK 57 compatible direct peers `react-native-gesture-handler
  ~2.32.0` and `react-native-reanimated 4.5.1`.
- Added the `expo-sqlite` config plugin through Expo’s installer.
- Upgraded admin Next from `^15.5.24` to `^16.3.3` and React packages to
  `19.2.3`.
- Updated workspace TypeScript and React type versions and regenerated the
  lockfile with normal npm installs.
- Updated the Expo 57 router Babel plugin path and accepted the generated
  Next 16 `next-env.d.ts` import form.
- No product, safety, readiness, onboarding, auth, permissions, or canonical
  plan/session behavior was changed.

## 4. Security results

- Final `npm audit`: exit `1`, 10 moderate, 0 high, 0 critical.
- Final `npm audit --audit-level=high`: exit `0`, 0 high/critical.
- Remaining packages are one transitive advisory family: `uuid`, `xcode`,
  `@expo/cli`, `@expo/config`, `@expo/config-plugins`,
  `@expo/inline-modules`, `@expo/local-build-cache-provider`,
  `@expo/metro-config`, `@expo/prebuild-config`, and `expo`. The advisory is
  `uuid <11.1.1` reached through Expo config tooling. npm’s force fix proposes
  the incompatible Expo `46.0.21` downgrade, so no force upgrade or advisory
  suppression was used. No compatible Expo 57 remediation was available in
  this graph.
- `python -m pip install pip-audit`: exit `0` (already installed).
- Host `pip-audit -r services/api/requirements.txt`: started but did not return
  from the advisory index within the controlled run window; result UNVERIFIED.
  The GitHub Security workflow ran the same command successfully with exit 0.

## 5. Compatibility and regression evidence

- `npm ci`: pass.
- `npm ls --all`: exit `0`; no invalid or missing dependency graph entries.
  npm reports only the Windows optional-package artifacts
  `@emnapi/runtime` and `@img/sharp-wasm32` as extraneous; Expo Doctor does
  not report a native dependency issue.
- `npx expo-doctor` from `apps/mobile`: 21/21 checks passed.
- `npx expo export --platform ios --clear`: pass.
- `npx expo export --platform android --clear`: pass.
- `npm run format:check`: pass.
- `npm run lint`: pass.
- `npm run checklist:check`: pass.
- `npm run typecheck`: pass across admin, mobile, and all shared packages.
- `npm test`: 75 total, 65 passed, 0 failed, 10 skipped. All skips are
  legitimate service-precondition skips because host services were not bound:
  two admin live-browser checks and eight product/API/browser checks. The
  configured Docker test profile ran these with services and had zero skips.
- `npm run build`: pass.
- `npm run mobile:web:build`: pass.
- `npm run security:check`: pass.
- `ruff check services/api`: pass.
- `python -m pytest services/api/tests -q`: 34 passed, 0 failed, 2 skipped;
  both skips are legitimate service URL preconditions for host-only execution.

## 6. Docker evidence

Commands executed: `docker compose config -q`, `docker compose --profile test
config -q`, `docker compose --profile test build`, `docker compose up -d
--build`, `docker compose ps`, health verification, `docker compose --profile
test run --rm tests`, Postgres Alembic head query, and service logs.

- Services: `postgres`, `db-init`, `redis`, `mailpit`, `migrate`, `api`,
  `admin`, `product-web`, and profile-only `tests`.
- Exposed ports: API `8200`, admin `3200`, product web `3210`, PostgreSQL
  `5432`, Redis `6379`, Mailpit SMTP `1025`, Mailpit UI `8025`.
- Final health: Postgres, Redis, Mailpit, API, admin, and product web all
  healthy; migration and db-init completed successfully.
- Alembic head: exactly one, `20260719_0010`.
- Docker Node suite: 75 passed, 0 failed, 0 skipped.
- Docker API suite: 36 passed, 0 failed, 0 skipped.
- Docker security and high-audit checks: pass.
- Docker logs showed normal startup for PostgreSQL, Redis, Mailpit, API,
  admin, and product web; no service failure was observed.

## 7. GitHub Actions

- Previous implementation SHA `ef798d0`: CI success and Security success.
- Final implementation SHA `fd3150c`: CI run `32999916044` and Security run
  `32999916064` were queued/in progress when this log was first written.
- Final workflow status will be appended after both runs complete. The
  Security workflow must remain green for MR-SEC-001 to be considered
  satisfied.

## 8. Files changed

- `apps/admin/next-env.d.ts`
- `apps/admin/package.json`
- `apps/mobile/app.json`
- `apps/mobile/babel.config.cjs`
- `apps/mobile/package.json`
- `package-lock.json`
- `package.json`
- `packages/config/package.json`
- `packages/design-tokens/package.json`
- `packages/exercise-domain/package.json`
- `packages/health-rules/package.json`
- `packages/shared-types/package.json`
- `tsconfig.base.json`

## 9. Next audit action

ChatGPT must inspect this CR, the committed dependency graph, the final
`fd3150c` GitHub CI/Security conclusions, and the remaining moderate advisory
family before deciding the authoritative post-run audit outcome. Codex does
not mark `MR-SEC-001` DONE.
