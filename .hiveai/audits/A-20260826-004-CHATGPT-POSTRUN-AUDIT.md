# Audit A-20260826-004 - ChatGPT Post-Run Audit

Audit ID: `A-20260826-004`
Related prompt: `P-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION`
Codex run reviewed: `CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION`
Repository: `Sekiph82/move-in-range`
Branch: `codex/main-consolidation`
Audit layer: ChatGPT / GitHub-side independent review

## Verdict

`VERIFIED_WITH_BLOCKERS`

P004 materially improved the dependency graph and the stale E2E contracts are aligned with the current seven-step onboarding/readiness-first product behavior. However the security acceptance criterion is not complete: current GitHub Actions independently confirms that `npm audit --audit-level=high` still fails with `20 vulnerabilities (11 moderate, 9 high)`. The remaining high paths require a controlled Expo/Metro and Next/PostCSS modernization rather than suppression.

## Independent repository verification

The P004 work is two commits ahead of its recorded starting revision `9b5aefcd221011c7e069f3ec7e894e7676cd30a5`. The actual P004 diff is limited to:

- `.hiveai/codex-runs/CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION.md`
- `apps/admin/package.json`
- `package-lock.json`

The direct admin dependency is now `next: ^15.5.24`. The mobile app remains on Expo `~54.0.37`, React Native `0.81.5`, and Expo Router `~6.0.24`; no unreviewed Expo major migration was performed.

The prior E2E correction is present in current source. `tests/product-ui-e2e.test.mjs` now expects `Step ${step} of 7`, uses current Continue semantics, and contains a readiness helper that completes readiness before workout continuation. This independently confirms that the old 22-step assertion was removed rather than product onboarding being reverted.

## Independent GitHub Actions evidence

GitHub Actions was inspected directly for the current consolidation branch after P004.

### CI workflow

The latest CI run for the branch completed successfully. GitHub reports successful steps for:

- `npm ci`
- format check
- lint
- checklist check
- typecheck
- Node tests
- Python requirements installation
- database migration
- exercise fixture import
- Ruff
- API pytest
- admin build

This independently corroborates that the committed dependency graph installs with normal `npm ci` and that the core CI validation remains green after the Next/lockfile changes.

### Security workflow

The latest Security workflow failed specifically at `npm audit --audit-level=high` after a successful `npm ci`.

The GitHub-hosted runner independently reports:

- `823` packages installed / `831` audited
- `20 vulnerabilities`
- `11 moderate`
- `9 high`
- `0 critical`

This independently confirms the final P004 vulnerability baseline and replaces the older `24 vulnerabilities (10 moderate, 14 high)` baseline.

GitHub's audit output identifies the remaining high chains as including:

- `image-size` through Metro / Expo
- `metro`, `metro-config`, and `metro-transform-worker`
- `@expo/metro`, `@expo/metro-config`, `@expo/cli`, and Expo-related parents
- `postcss` through Expo Metro config and Next

GitHub reports the automatic remediation paths as breaking upgrades, including Expo `57.0.16` for the Expo/Metro chain and Next `16.3.3` for the PostCSS/Next chain. The workflow correctly remains red; the security gate was not weakened.

The audit also reports a moderate `uuid` chain under Expo/xcode. Because the workflow exits at the npm audit step, its later `security:check` and Python `pip-audit` steps are skipped in that workflow run. Therefore Python dependency security is not independently verified by this GitHub Actions run.

## Codex execution claims not independently reproduced here

The CR records local Docker Desktop startup/shutdown, full Docker E2E `75/75`, Docker API pytest `36/36`, Expo Doctor `18/18`, iOS export, Android export, and local Python audit timeout behavior. Those are useful execution evidence but are not reclassified as independently reproduced merely because they appear in the CR.

GitHub-side evidence does independently support core CI health and the exact current npm vulnerability baseline.

## Task classification

### MR-E2E-001

Classification: `REVIEW` pending final acceptance.

Evidence is materially stronger than before: current test source is aligned with seven-step onboarding/readiness-first behavior, CI is green, and the Codex Docker run reports zero E2E failures. The authoritative audit layer did not independently run the local Docker E2E environment, so the task should not be auto-promoted to DONE solely from the CR.

### MR-SEC-001

Classification: `READY` for the next modernization phase, not DONE.

P004 reduced high advisories from the independently observed prior baseline, but GitHub Actions still proves nine high advisories remain. The next work package should deliberately migrate the affected Expo/Metro and Next/PostCSS dependency families with full regression coverage rather than suppressing `npm audit`.

### MR-VAL-001 / MR-CONS-001

Classification: remain `REVIEW`.

Core CI is green, but security workflow is red. Main consolidation should not be declared merge-ready until the high audit gate passes and the resulting major dependency changes survive full mobile/web/backend/Docker regression.

## Required next work

1. Perform a controlled Expo 54 -> secure supported Expo line migration sufficient to remove the Metro/image-size high advisories, following Expo's supported package matrix rather than manually pinning incompatible Metro packages.
2. Perform a controlled Next 15 -> secure supported Next line migration sufficient to remove the PostCSS high advisory, with admin runtime/build/E2E regression coverage.
3. Reconcile Expo Router, React Native, React, native Expo modules, Metro config, TypeScript types, and lockfile to the target Expo SDK.
4. Do not use `npm audit fix --force` as a blind migration mechanism. Explicitly select and document target versions.
5. Keep `.github/workflows/security.yml` strict. The goal is for `npm audit --audit-level=high` to pass, not to bypass it.
6. Run Python `pip-audit` separately even if npm audit fails so Python security does not remain hidden behind an earlier workflow failure.
7. Re-run full CI, Docker-backed E2E/API integration, Expo Doctor, iOS export, Android export, security scan, npm audit, and Python audit after modernization.

## Audit conclusion

P004 was a valid partial remediation, not a completed security fix. The dependency graph is healthier and core CI is green, but GitHub itself independently confirms the high-severity security gate still fails. The next active prompt should therefore be a controlled dependency-major modernization sprint focused on making `MR-SEC-001` actually green.