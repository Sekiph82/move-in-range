# H!veAI Project Control Index

MoveInRange uses a durable, evidence-backed control loop. `TASKS.md` is the only canonical task ledger. `AGENTS.md` remains the mandatory instruction source.

## Authority Map

- task ledger: `TASKS.md`
- project pointers: `.hiveai/PROJECT_DASHBOARD.md`
- active prompt pointer: `.hiveai/prompts/CURRENT.md`
- active audit pointer: `.hiveai/audits/CURRENT.md`
- latest handoff: `.hiveai/handoffs/LATEST.md`
- decisions: `.hiveai/decisions/DECISIONS.md`
- execution history: `.hiveai/codex-runs/`
- architecture and product design: `docs/`

## Artifact Naming

Use aligned IDs so every prompt, Codex run, and independent audit can be traced as one work package.

Prompt:
`P-YYYYMMDD-NNN-SLUG.md`

Codex run log:
`CR-YYYYMMDD-NNN-SLUG.md`

Independent audit:
`A-YYYYMMDD-NNN-SLUG.md`

The `YYYYMMDD-NNN-SLUG` portion must match across all three files.

Example:

- `.hiveai/prompts/P-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`
- `.hiveai/codex-runs/CR-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`
- `.hiveai/audits/A-20260826-002-INDEPENDENT-AUDIT-DOCKER-VALIDATION.md`

Historical artifacts are append-only. `CURRENT.md` files are pointers, not replacements for history.

## Execution Protocol

AUDIT -> PROMPT -> TASK -> IMPLEMENT -> TEST -> VERIFY -> EVIDENCE -> CODEX RUN -> INDEPENDENT AUDIT -> TASK STATUS

A Codex run log is an execution record, not authoritative proof that its own work passed. Prior PASS/BLOCKED statements must be independently revalidated before they can support DONE or merge readiness.

Every task must contain an ID, milestone, title, status, priority, dependencies, source, acceptance criteria, evidence, and Codex run reference. DONE requires implementation plus independent validation plus evidence. BLOCKED requires a specific external or technical blocker and, where practical, evidence that the blocker was actively tested rather than assumed.

## Independent Audit Rule

For applicable test/build/runtime/security claims:

1. read the prior claim;
2. identify the proving command;
3. execute it again on the current branch;
4. capture actual result and exit status;
5. classify as `VERIFIED`, `REGRESSED`, `UNVERIFIED`, or `BLOCKED`;
6. store the independent audit under `.hiveai/audits/`;
7. update `TASKS.md` from current evidence only.

Docker being stopped is not itself a blocker. The active audit prompt may require starting Docker Desktop, waiting for the engine, running Docker-backed validation, and shutting Docker Desktop down only when that run started it.

## Bootstrap Command

Read `.hiveai/INDEX.md`, `.hiveai/PROJECT_DASHBOARD.md`, `TASKS.md`, `.hiveai/audits/CURRENT.md`, `.hiveai/prompts/CURRENT.md`, `.hiveai/handoffs/LATEST.md`, and `AGENTS.md`. Execute the active prompt exactly. Re-run required validation rather than trusting historical PASS/BLOCKED claims. Update task evidence and save the run log using the same ID/slug as the active prompt.

## Branch Safety

Inspect ancestry, ahead/behind counts, open PRs, and conflicts before consolidation. Use a reviewable branch for consolidation. Do not merge into `main`, delete historical branches, or close stacked PRs without explicit maintainer approval and recorded evidence.
