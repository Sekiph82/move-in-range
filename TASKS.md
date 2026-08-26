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
- evidence: canonical ledger, pointer manifest, protocol index, current prompt/audit pointers, handoff, decisions, and run-log protocol exist in the repository; control-system existence independently verified by ChatGPT audit A-20260826-003.
- Codex run reference: CR-20260826-001

## MR-AUDIT-001

- milestone: project-control
- title: Independently revalidate consolidation, Docker, dependency audit, and test claims
- status: REVIEW
- priority: P0
- dependencies: MR-CTRL-001; MR-CONS-001
- source: .hiveai/prompts/P-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md; .hiveai/audits/A-20260826-004-CHATGPT-POSTRUN-AUDIT.md
- acceptance criteria: prior PASS/BLOCKED claims are rerun on the current branch; Docker Desktop is actively started when needed; Compose test profile is executed; npm audit baseline is reconciled; test/build/export/migration claims are independently classified with current evidence; Codex execution evidence is separately reviewed by the ChatGPT audit layer.
- evidence: GitHub-side post-run audits now independently corroborate branch/source facts, a green core CI workflow, and the current npm security baseline. Local Docker/native-export execution remains Codex execution evidence unless reproduced by an independent runtime.
- Codex run reference: CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION

## MR-E2E-001

- milestone: consolidation
- title: Align stale product E2E contracts with current canonical onboarding and readiness flow
- status: REVIEW
- priority: P0
- dependencies: MR-AUDIT-001
- source: .hiveai/prompts/P-20260826-003-E2E-CONTRACT-ALIGNMENT.md; .hiveai/audits/A-20260826-004-CHATGPT-POSTRUN-AUDIT.md
- acceptance criteria: E2E tests use the current 7-step onboarding contract, current readiness entry points, and mandatory readiness-before-new-workout flow; no safety requirement is weakened; full Docker Node suite is rerun with 0 stale-contract failures; matching CR evidence is produced and then separately audited by ChatGPT.
- evidence: current GitHub source independently shows `Step ${step} of 7` and readiness-first helpers in product UI E2E. P004 execution evidence reports Docker Node 75 passed / 0 failed / 0 skipped; core GitHub CI is green. Final DONE remains subject to the audit layer's acceptance policy.
- Codex run reference: CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION

## MR-CONS-001

- milestone: consolidation
- title: Consolidate the verified stacked branch chain into a reviewable branch
- status: REVIEW
- priority: P0
- dependencies: MR-CTRL-001
- source: .hiveai/audits/BRANCH_CONSOLIDATION_AUDIT.md; PRs #1-#11; current origin/main and origin/codex/release-rehearsal
- acceptance criteria: codex/main-consolidation is based on latest main, contains the full verified release-rehearsal content, preserves the main manifest, has no unresolved conflicts, and is pushed without merging into main.
- evidence: repository history and consolidation artifacts show main plus release-rehearsal content with the H!veAI manifest retained. GitHub core CI is currently green, but GitHub Security remains red, so merge readiness is incomplete.
- Codex run reference: CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION

## MR-VAL-001

- milestone: consolidation
- title: Validate the consolidated repository and migration lineage
- status: REVIEW
- priority: P0
- dependencies: MR-CONS-001; MR-AUDIT-001; MR-E2E-001; MR-SEC-001
- source: active H!veAI prompts; docs/RELEASE_REHEARSAL_CHECKLIST.md; docs/STACKED_PR_MERGE_PLAN.md
- acceptance criteria: applicable format, lint, checklist, typecheck, Node, build, mobile web, ruff, pytest, security, Docker/test profile, Expo, export, migration, and deployment checks are rerun and current evidence is recorded with exact blockers; final advancement requires separate ChatGPT post-run audit.
- evidence: latest GitHub CI independently passes install/format/lint/checklist/typecheck/tests/migration/import/ruff/pytest/build. Security workflow independently fails at npm high audit. P004 records broad Docker/native export execution evidence.
- Codex run reference: CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION

## MR-DEV-001

- milestone: beta-validation
- title: Complete native Android and iPhone acceptance
- status: BLOCKED
- priority: P1
- dependencies: reachable API deployment; Android emulator or device; iPhone or Expo Go
- source: docs/MANUAL_DEVICE_TEST_CHECKLIST.md; docs/ANDROID_BETA_BUILD_HANDOFF.md; docs/IOS_BETA_OPTIONS.md; docs/product/IMPLEMENTATION_STATUS.md
- acceptance criteria: login, onboarding resume, readiness, plan generation, workout recovery, pain/symptom stop, offline outbox, media fallback, voice/haptics, privacy, and invitation flows pass on the relevant native runtimes and are evidenced.
- evidence: no complete current native-device acceptance evidence is recorded in the canonical audit layer.
- Codex run reference: CR-20260826-001

## MR-SEC-001

- milestone: dependency-modernization
- title: Resolve remaining high and moderate dependency advisories with regression coverage
- status: READY
- priority: P0
- dependencies: MR-AUDIT-001
- source: .hiveai/prompts/P-20260826-005-DEPENDENCY-MAJOR-MODERNIZATION.md; .hiveai/audits/A-20260826-004-CHATGPT-POSTRUN-AUDIT.md
- acceptance criteria: establish one authoritative current npm audit baseline; apply supported dependency upgrades without weakening the security workflow; achieve zero high/critical npm advisories so `npm audit --audit-level=high` and GitHub Security pass; run Python pip-audit; rerun full web/mobile/backend/Docker regression; final result is separately audited.
- evidence: P004 safely reduced the previous dependency baseline, including Next 15.5.24 and patched transitive packages. GitHub Actions independently confirms the current baseline is 20 vulnerabilities: 11 moderate, 9 high, 0 critical. Remaining high chains are centered on Expo/Metro/image-size and PostCSS/Next, with automatic audit suggestions requiring breaking parent upgrades. P005 explicitly authorizes a controlled supported major modernization rather than suppression.
- Codex run reference: CR-20260826-004-E2E-CONTRACT-AND-SECURITY-REMEDIATION

## MR-DEPLOY-001

- milestone: beta-deployment
- title: Produce a working phone beta against a real public API and provider configuration
- status: BLOCKED
- priority: P1
- dependencies: Vercel API URL; EAS preview environment; provider credentials and entitlements where applicable
- source: docs/ZERO_COST_BETA_DEPLOYMENT.md; docs/VERCEL_DEPLOYMENT.md; docs/ANDROID_BETA_BUILD_HANDOFF.md; AGENTS.md
- acceptance criteria: a rebuilt installable artifact uses a reachable non-local API and real deployment/provider validation is recorded without claiming unavailable credentials or hardware.
- evidence: deployment/provider validation remains external and is not established by the current independent audit.
- Codex run reference: CR-20260826-001

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
- status: BACKLOG
- priority: P2
- dependencies: MR-VAL-001; clinical and product review of the v2 model
- source: docs/opengym-integration-audit.md; docs/workout-engine-v2.md; docs/workout-history.md; docs/exercise-model-v2.md
- acceptance criteria: implementation is separately scoped, safety-reviewed, migrated, API-backed, mobile-tested, and does not import openGym code, media, or unverified dataset licensing.
- evidence: design-only recommendation; no implementation is authorized by the current audit prompt.
- Codex run reference: CR-20260826-001

## MR-CLEAN-001

- milestone: post-consolidation-cleanup
- title: Retire or retarget stacked PRs and branches after consolidation is merged and verified
- status: BACKLOG
- priority: P2
- dependencies: consolidation PR merged; post-merge validation green; manual maintainer approval
- source: consolidation prompt; docs/STACKED_PR_MERGE_PLAN.md; .hiveai/decisions/DECISIONS.md
- acceptance criteria: each old PR/branch is handled deliberately, no historical evidence is lost, and cleanup actions are recorded before execution.
- evidence: no old branch or PR should be deleted or closed before consolidation is independently verified and merged.
- Codex run reference: CR-20260826-001
