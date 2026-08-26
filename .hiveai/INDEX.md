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

## Execution Protocol

AUDIT -> PROMPT -> TASK -> IMPLEMENT -> TEST -> VERIFY -> EVIDENCE -> CODEX RUN -> TASK STATUS

Audits and prompts are stored under their dedicated directories. Final execution logs are stored under `.hiveai/codex-runs/` and are never overwritten. `CURRENT.md` files are pointers or summaries, not historical replacements.

Every task must contain an ID, milestone, title, status, priority, dependencies, source, acceptance criteria, evidence, and Codex run reference. DONE requires implementation plus validation plus evidence. BLOCKED requires a specific external or technical blocker.

## Bootstrap Command

Read `.hiveai/INDEX.md`, `.hiveai/PROJECT_DASHBOARD.md`, `TASKS.md`, `.hiveai/audits/CURRENT.md`, and `.hiveai/prompts/CURRENT.md`. Execute the active prompt according to the canonical task rules. Update task states/evidence and save the final execution log under `.hiveai/codex-runs/`.

## Branch Safety

Inspect ancestry, ahead/behind counts, open PRs, and conflicts before consolidation. Use a reviewable branch for consolidation. Do not merge into `main`, delete historical branches, or close stacked PRs without explicit maintainer approval and recorded evidence.
