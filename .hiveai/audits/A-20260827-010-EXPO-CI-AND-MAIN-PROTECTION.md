# A-20260827-010 - Expo CI And Main Protection Audit

Repository: `Sekiph82/move-in-range`
Authoritative branch: `main`
Audited Codex run: `CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`

## Audit policy

This is the authoritative ChatGPT post-run audit. Codex PASS/FAIL classifications are treated as execution claims until corroborated from GitHub source, pull-request metadata, commit history, and GitHub Actions evidence.

## Independently verified GitHub facts

1. PR #14 is merged into `main` by merge commit `558c6b38d7d11063d0b5877b4413021af480f4b3`.
2. PR #15 is merged into `main` by merge commit `af7d42c920510bab3dbb467730cd9d6453fdb347`.
3. PR #16 is merged into `main` by merge commit `6cef7b2f2916ec73acf7fc74fa0de0b78a30d509`.
4. Final `main` CI run `33057057333` completed successfully on `6cef7b2f2916ec73acf7fc74fa0de0b78a30d509`.
5. The exact final CI job visibly contains both `Expo Doctor` and `Expo dependency check`, and both steps completed successfully as real workflow steps.
6. Final `main` Security run `33057057320` completed successfully on the same exact final commit.
7. GitHub branch metadata reports `main` as `protected: true` and exposes required status checks `validate` and `security` with enforcement enabled.
8. The P010 CR exists on `main` and records the protection transition, the failed first protection payload, the corrected protection payload, PR-path evidence, and the exact final CI/Security evidence.

## Source review

The CI change is bounded to repository validation infrastructure: GitHub CI now executes Expo compatibility checks directly from `apps/mobile`. Existing CI and Security coverage was not removed by the audited change.

The final CI sequence still includes install, Expo Doctor, Expo dependency check, format, lint, checklist, typecheck, Node tests, migration, exercise import, Ruff, API pytest, and build.

## Branch protection evidence

Core protection is independently verified from GitHub branch metadata:

- `main` is protected;
- required checks include `validate` and `security`;
- enforcement is active.

The connector available to this audit returned HTTP 403 when requesting the full branch-protection subresource, so the following detailed settings are not independently re-fetched by ChatGPT in this run and remain corroborated Codex execution evidence:

- strict up-to-date mode;
- required pull-request review object with zero approvals;
- admin enforcement;
- force-push prohibition;
- branch-deletion prohibition.

However, PRs #15 and #16 successfully traversed the protected `main` path after protection was enabled, and GitHub independently reports the branch itself as protected.

## Environment evidence not promoted to product defects

P010 records stale local SQLite failures for local migration/import commands while clean PostgreSQL-backed GitHub CI passed migration/import. This is environment-local evidence and not an independently verified product regression.

Host-only E2E/integration skips caused by missing local environment URLs remain execution-environment skips. They are not silently reclassified as complete product acceptance.

## Security

Final GitHub Security is green on the exact final main commit. No evidence was found that the Security workflow was weakened by P010.

## Verdict

`VERIFIED_CORE_EXPO_CI_AND_MAIN_PROTECTION`

The original GitHub warning that `main` was unprotected is resolved at the repository metadata level. Expo Doctor and Expo dependency compatibility are now GitHub-hosted CI gates rather than local-only claims.

Detailed branch-protection sub-settings beyond the exposed branch metadata remain partially unverified by this connector because the full protection endpoint is not accessible to the audit integration. This does not reopen the core protection or Expo CI tasks.

## Task adjudication

- `MR-CI-EXPO-001`: accepted `DONE`.
- `MR-BRANCH-001`: accepted `DONE` for core repository protection.
- `MR-CLEAN-001`: eligible to move to `READY` for a separately bounded cleanup run.
- Native physical-device acceptance and real deployment/provider acceptance remain separate work.

## Next action

Proceed with a bounded post-consolidation cleanup run that first inventories all historical stacked PRs and branches against `main`, preserves audit history, and only retires items that are conclusively superseded. Any ambiguous or non-ancestor branch must be left intact and reported instead of deleted.