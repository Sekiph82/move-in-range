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

ChatGPT post-run audit:
`A-YYYYMMDD-NNN-SLUG.md`

The date/sequence/slug should match whenever practical. Historical artifacts are append-only. `CURRENT.md` files are pointers, not replacements for history.

## Execution Protocol

CHATGPT AUDIT -> CHATGPT PROMPT -> TASK -> CODEX IMPLEMENT -> CODEX TEST/VERIFY -> CODEX EVIDENCE -> CODEX RUN LOG -> CHATGPT POST-RUN AUDIT -> TASK STATUS

A Codex run log is an execution record, not authoritative proof that its own work passed. Codex must not self-author the final authoritative audit verdict for its own run.

### Separation of duties

**Codex is responsible for:**
- reading the active prompt and repository control files;
- implementation;
- local/Docker/runtime validation;
- capturing exact command results;
- saving the matching `CR-...` run log;
- updating task evidence conservatively.

**ChatGPT audit layer is responsible for:**
- reviewing the resulting GitHub commit and CR artifact;
- ignoring Codex PASS/FAIL claims as proof until independently reviewed;
- inspecting source/test/task consistency and GitHub evidence;
- writing the authoritative `A-...` post-run audit;
- deciding whether task status may advance.

Codex must not create, overwrite, or declare authoritative the ChatGPT post-run audit for the same run.

Every task must contain an ID, milestone, title, status, priority, dependencies, source, acceptance criteria, evidence, and Codex run reference. DONE requires implementation plus separate audit validation plus evidence. BLOCKED requires a specific external or technical blocker and, where practical, evidence that the blocker was actively tested rather than assumed.

## Independent Audit Rule

For applicable test/build/runtime/security claims the ChatGPT audit layer must:

1. read the Codex claim;
2. inspect the exact GitHub changes and current source/tests;
3. independently corroborate what can be verified through GitHub/CI evidence;
4. classify unsupported local runtime claims as `UNVERIFIED` rather than copying Codex PASS;
5. record discrepancies;
6. store the audit under `.hiveai/audits/`;
7. only then permit canonical task status advancement.

When Codex needs Docker validation, Docker being stopped is not itself a blocker. Codex should attempt to start Docker Desktop, wait for the engine, run Docker-backed validation, and shut Docker Desktop down only when that run started it.

## Bootstrap Command

Read `.hiveai/INDEX.md`, `.hiveai/PROJECT_DASHBOARD.md`, `TASKS.md`, `.hiveai/audits/CURRENT.md`, `.hiveai/prompts/CURRENT.md`, `.hiveai/handoffs/LATEST.md`, and `AGENTS.md`. Execute the active prompt exactly. Re-run required validation rather than trusting historical claims. Save only the matching Codex `CR-...` run log for your execution. Do not author the final ChatGPT audit for your own run.

## Branch Safety

Inspect ancestry, ahead/behind counts, open PRs, and conflicts before consolidation. Use a reviewable branch for consolidation. Do not merge into `main`, delete historical branches, or close stacked PRs without explicit maintainer approval and recorded evidence.
