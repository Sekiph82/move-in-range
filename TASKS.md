# MoveInRange Canonical Task Ledger

This is the only canonical task ledger. Do not infer new tasks from README prose or unchecked implementation ideas. A task may become DONE only when implementation, independent validation, and evidence are all recorded.

Status values: BACKLOG, READY, IN_PROGRESS, BLOCKED, REVIEW, DONE, CANCELLED.

## MR-CTRL-001

- milestone: project-control
- title: Establish the permanent H!veAI/Codex control system
- status: DONE
- priority: P0
- dependencies: none
- source: consolidation prompt; AGENTS.md; origin/main H!veAI manifest
- acceptance criteria: TASKS.md, .hiveai/INDEX.md, prompts, audits, handoff, decisions, and codex-runs protocol exist; manifest remains pointer-only; historical runs are append-only.
- evidence: canonical ledger, pointer manifest, protocol index, current prompt/audit pointers, handoff, decisions, and run-log protocol exist in the repository; control-system existence independently verified by ChatGPT audits through A-20260826-006.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-AUDIT-001

- milestone: project-control
- title: Independently revalidate consolidation, Docker, dependency audit, and test claims
- status: DONE
- priority: P0
- dependencies: MR-CTRL-001; MR-CONS-001
- source: .hiveai/prompts/P-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md; authoritative ChatGPT audits through A-20260826-006-FINAL-CONSOLIDATION-READINESS.md
- acceptance criteria: prior PASS/BLOCKED claims are rerun on the current branch; Docker Desktop is actively started when needed; Compose test profile is executed; npm audit baseline is reconciled; test/build/export/migration claims are independently classified with current evidence; Codex execution evidence is separately reviewed by the ChatGPT audit layer.
- evidence: the audit loop is now functioning with GitHub as the shared control plane. A006 independently verified PR #13 metadata plus exact-head GitHub CI and Security evidence, while local Docker/native-export claims remain explicitly classified as execution evidence rather than blindly accepted proof.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-E2E-001

- milestone: consolidation
- title: Align stale product E2E contracts with current canonical onboarding and readiness flow
- status: DONE
- priority: P0
- dependencies: MR-AUDIT-001
- source: .hiveai/prompts/P-20260826-003-E2E-CONTRACT-ALIGNMENT.md; authoritative audits A-20260826-005 and A-20260826-006
- acceptance criteria: E2E tests use the current 7-step onboarding contract, current readiness entry points, and mandatory readiness-before-new-workout flow; no safety requirement is weakened; full Docker Node suite is rerun with 0 stale-contract failures; matching CR evidence is produced and then separately audited by ChatGPT.
- evidence: current GitHub source uses the seven-step onboarding/readiness-first contract; P004/P005/P006 execution evidence reports zero stale-contract Docker failures; exact PR-head GitHub CI remains green after the framework modernization; authoritative audit A006 retains this task as DONE.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-CONS-001

- milestone: consolidation
- title: Consolidate the verified stacked branch chain into a reviewable branch
- status: DONE
- priority: P0
- dependencies: MR-CTRL-001
- source: .hiveai/audits/BRANCH_CONSOLIDATION_AUDIT.md; PRs #1-#11; current origin/main and origin/codex/release-rehearsal; PR #13
- acceptance criteria: codex/main-consolidation is based on latest main, contains the full verified release-rehearsal content, preserves the main manifest, has no unresolved conflicts, and is pushed without merging into main.
- evidence: PR #13 exists as the single reviewable consolidation PR from codex/main-consolidation to main; GitHub independently reports it OPEN, non-draft, unmerged, and mergeable. Exact PR-head CI and Security are green. Authoritative audit A006 adjudicated the consolidation acceptance criteria satisfied without authorizing automatic merge.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-VAL-001

- milestone: consolidation
- title: Validate the consolidated repository and migration lineage
- status: DONE
- priority: P0
- dependencies: MR-CONS-001; MR-AUDIT-001; MR-E2E-001; MR-SEC-001
- source: active H!veAI prompts; docs/RELEASE_REHEARSAL_CHECKLIST.md; docs/STACKED_PR_MERGE_PLAN.md; A-20260826-006-FINAL-CONSOLIDATION-READINESS.md
- acceptance criteria: applicable format, lint, checklist, typecheck, Node, build, mobile web, ruff, pytest, security, Docker/test profile, Expo, export, migration checks are rerun and current evidence is recorded with exact blockers; final advancement requires separate ChatGPT post-run audit.
- evidence: exact PR-head GitHub CI independently passes install/format/lint/checklist/typecheck/tests/migration/import/ruff/pytest/build. Exact PR-head GitHub Security independently passes high npm audit, repository security scan, and pip-audit. P006 separately records Docker Node 75/75, API 36/36, one Alembic head, Expo Doctor 21/21, and iOS/Android exports as execution evidence. Physical native-device and real public deployment/provider acceptance remain separate tasks rather than blockers to automated consolidation validation.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-MERGE-001

- milestone: consolidation-merge
- title: Human review and explicit merge authorization for PR #13, followed by post-merge verification
- status: DONE
- priority: P0
- dependencies: MR-CONS-001; MR-VAL-001; MR-SEC-001; MR-E2E-001
- source: PR #13; .hiveai/audits/A-20260827-007-PR13-HUMAN-MERGE-HANDOFF.md; .hiveai/prompts/P-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md
- acceptance criteria: final PR head/base/check state is reconfirmed; human merge handoff is produced; maintainer explicitly authorizes merge; PR #13 is merged without agent auto-merge; post-merge main validation succeeds before historical cleanup begins.
- evidence: PR #13 was rechecked at exact head 0b4349fd34d01bf72fb37935e2509f40eaa719af with green exact-head CI/Security gates, then merged by normal merge commit d18ce2a06d7dda83f6df7c03fedba119b3e61a88. GitHub main CI/Security and the post-merge host/Docker validation in CR-20260827-008 are green; no historical cleanup was performed.
- Codex run reference: CR-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY

## MR-EXPO-001

- milestone: expo57-patch-alignment
- title: Align Expo SDK 57 and React Native dependencies with the supported patch graph
- status: DONE
- priority: P0
- dependencies: MR-MERGE-001; MR-SEC-001
- source: .hiveai/prompts/P-20260827-009-EXPO57-PATCH-ALIGNMENT.md; .hiveai/audits/A-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md
- acceptance criteria: direct Expo SDK 57 and React Native patch dependencies match Expo compatibility tooling; Expo Doctor reports 21/21 checks passed; host and Docker test/build/security/export/migration gates are rerun without changing product behavior; final result is recorded in the matching Codex run and separately audited by ChatGPT.
- evidence: Expo-supported patch alignment updated the mobile manifest and root lockfile. Final Expo Doctor reports 21/21 checks passed; host Node/API/build/security gates, iOS/Android exports, Docker health checks, Docker Node 75/75 with 0 skips, and Docker API 36/36 passed. The moderate-only Expo/uuid advisory family remains documented and no force downgrade was applied.
- Codex run reference: CR-20260827-009-EXPO57-PATCH-ALIGNMENT

## MR-CI-EXPO-001

- milestone: expo-ci-compatibility
- title: Enforce Expo compatibility checks in GitHub CI
- status: IN_PROGRESS
- priority: P0
- dependencies: MR-EXPO-001; MR-SEC-001
- source: .hiveai/prompts/P-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md; .hiveai/audits/A-20260827-009-EXPO57-PATCH-ALIGNMENT.md
- acceptance criteria: GitHub-hosted CI directly executes Expo Doctor and Expo dependency compatibility checks from apps/mobile as real failing gates on relevant pushes and pull requests; both checks visibly pass on the exact final main run without weakening existing CI or Security gates.
- evidence: implementation and exact final-main evidence are pending in CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.
- Codex run reference: CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE

## MR-BRANCH-001

- milestone: repository-governance
- title: Protect main with pull-request and required CI/Security gates
- status: IN_PROGRESS
- priority: P0
- dependencies: MR-CI-EXPO-001
- source: .hiveai/prompts/P-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md; .hiveai/audits/A-20260827-009-EXPO57-PATCH-ALIGNMENT.md
- acceptance criteria: GitHub reports main protected with pull requests required, exact CI and Security contexts required with strict up-to-date enforcement, no unnecessary approving-review requirement, force pushes disabled, and branch deletion disabled; the resulting settings are independently re-fetched and recorded.
- evidence: initial GitHub API state is unprotected; protection implementation and final verification are pending in CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.
- Codex run reference: CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE

## MR-DEV-001

- milestone: beta-validation
- title: Complete native Android and iPhone acceptance
- status: BLOCKED
- priority: P1
- dependencies: reachable API deployment; Android emulator or device; iPhone or Expo Go
- source: docs/MANUAL_DEVICE_TEST_CHECKLIST.md; docs/ANDROID_BETA_BUILD_HANDOFF.md; docs/IOS_BETA_OPTIONS.md; docs/product/IMPLEMENTATION_STATUS.md
- acceptance criteria: login, onboarding resume, readiness, plan generation, workout recovery, pain/symptom stop, offline outbox, media fallback, voice/haptics, privacy, and invitation flows pass on the relevant native runtimes and are evidenced.
- evidence: no complete current physical native-device acceptance evidence is recorded in the canonical audit layer.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-SEC-001

- milestone: dependency-modernization
- title: Resolve remaining high and moderate dependency advisories with regression coverage
- status: DONE
- priority: P0
- dependencies: MR-AUDIT-001
- source: .hiveai/prompts/P-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION.md; .hiveai/audits/A-20260826-005-CHATGPT-POSTRUN-AUDIT.md; A-20260826-006-FINAL-CONSOLIDATION-READINESS.md
- acceptance criteria: establish one authoritative current npm audit baseline; apply supported dependency upgrades without weakening the security workflow; achieve zero high/critical npm advisories so npm high audit and GitHub Security pass; run Python pip-audit; rerun affected regression gates; final result is separately audited.
- evidence: Expo/Metro and Next/PostCSS dependency families were modernized. Exact PR-head GitHub Security independently passes `npm audit --audit-level=high`, repository security scan, and `pip-audit`; zero high/critical npm advisories remain. A moderate-only Expo tooling/uuid advisory family remains recorded as residual technical debt and is not suppressed.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-DEPLOY-001

- milestone: beta-deployment
- title: Produce a working phone beta against a real public API and provider configuration
- status: BLOCKED
- priority: P1
- dependencies: Vercel API URL; EAS preview environment; provider credentials and entitlements where applicable
- source: docs/ZERO_COST_BETA_DEPLOYMENT.md; docs/VERCEL_DEPLOYMENT.md; docs/ANDROID_BETA_BUILD_HANDOFF.md; AGENTS.md
- acceptance criteria: a rebuilt installable artifact uses a reachable non-local API and real deployment/provider validation is recorded without claiming unavailable credentials or hardware.
- evidence: deployment/provider validation remains external and is not established by the current consolidation audit.
- Codex run reference: CR-20260826-006-FINAL-CONSOLIDATION-READINESS

## MR-OG-001

- milestone: workout-engine-planning
- title: Complete the openGym integration and workout-engine audit
- status: DONE
- priority: P2
- dependencies: none
- source: docs/opengym-integration-audit.md; docs/workout-engine-v2.md; docs/progression-engine.md; docs/workout-history.md; docs/exercise-model-v2.md; docs/muscle-workload.md
- acceptance criteria: reference architecture, license boundaries, MoveInRange gaps, canonical models, progression, history, workload, API/mobile/database milestones, and first sprint are documented without copying openGym code or media.
- evidence: six audit/design documents are present on the consolidated branch; audit is design-only and does not claim source integration.
- Codex run reference: CR-20260826-001

## MR-OG-002

- milestone: workout-engine-v2
- title: Implement the first evidence-backed workout history and set-execution slice
- status: READY
- priority: P2
- dependencies: MR-VAL-001; clinical and product review of the v2 model
- source: docs/opengym-integration-audit.md; docs/workout-engine-v2.md; docs/workout-history.md; docs/exercise-model-v2.md
- acceptance criteria: implementation is separately scoped, safety-reviewed, migrated, API-backed, mobile-tested, and does not import openGym code, media, or unverified dataset licensing.
- evidence: design-only recommendation; no implementation is authorized by the current consolidation prompt.
- Codex run reference: CR-20260826-001

## MR-CLEAN-001

- milestone: post-consolidation-cleanup
- title: Retire or retarget stacked PRs and branches after consolidation is merged and verified
- status: BACKLOG
- priority: P2
- dependencies: PR #13 merged; post-merge validation green; manual maintainer approval
- source: consolidation prompt; docs/STACKED_PR_MERGE_PLAN.md; .hiveai/decisions/DECISIONS.md; A-20260827-007-PR13-HUMAN-MERGE-HANDOFF.md; P-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md
- acceptance criteria: each old PR/branch is handled deliberately, no historical evidence is lost, and cleanup actions are recorded before execution.
- evidence: PR #13 is merged and post-merge main verification succeeded. Cleanup is now eligible for a separately authorized future task; this run intentionally did not delete branches or close historical PRs.
- Codex run reference: CR-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY
