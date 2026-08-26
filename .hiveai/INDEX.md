# H!veAI Project Control Index

MoveInRange uses a GitHub-centered, evidence-backed control loop. The authoritative control plane is the GitHub branch `codex/main-consolidation` in `Sekiph82/move-in-range`. Local files are an execution checkout only; they are not the source of truth for prompts, audits, task state, handoffs, or run history.

## Canonical GitHub Control Plane

Repository branch root:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation`

Canonical task ledger:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/TASKS.md`

Project dashboard pointer:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/PROJECT_DASHBOARD.md`

Control protocol:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/INDEX.md`

Active prompt pointer:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/CURRENT.md`

Prompt history directory:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/prompts`

Active audit pointer:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/audits/CURRENT.md`

Audit history directory:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

Latest handoff:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/handoffs/LATEST.md`

Decisions:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/decisions/DECISIONS.md`

Codex execution history:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`

Agent instructions:
`https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/AGENTS.md`

Architecture/product documentation:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/docs`

`TASKS.md` is the only canonical task ledger. `AGENTS.md` remains the mandatory instruction source.

## Source-of-truth Rule

Before every Codex run, Codex must read the control files from GitHub on `codex/main-consolidation`, not from an assumed local snapshot. The local checkout is used only to implement and execute the active GitHub prompt after the GitHub control state has been read.

Before implementation Codex must:

1. read the GitHub control files listed in the Bootstrap section below;
2. identify the active prompt from the GitHub `CURRENT.md` pointer;
3. fetch `origin/codex/main-consolidation` into the local repository;
4. confirm the local branch is `codex/main-consolidation` and corresponds to the GitHub branch;
5. check for local divergence or uncommitted work before modifying anything;
6. never overwrite divergent or uncommitted local work blindly;
7. execute the active GitHub prompt;
8. commit and push the matching `CR-...` run log to the GitHub codex-runs directory so the ChatGPT audit layer can read it.

If GitHub and local control files disagree, GitHub `codex/main-consolidation` wins for control-plane state. Local source code changes not yet pushed must not be silently destroyed; Codex must report the divergence and reconcile safely.

## Artifact Naming

Use aligned IDs so every prompt, Codex run, and ChatGPT audit can be traced as one work package.

Prompt:
`P-YYYYMMDD-NNN-SLUG.md`

Codex run log:
`CR-YYYYMMDD-NNN-SLUG.md`

ChatGPT post-run audit:
`A-YYYYMMDD-NNN-SLUG.md`

The date/sequence/slug should match whenever practical. Historical artifacts are append-only. `CURRENT.md` files are pointers, not replacements for history.

## Execution Protocol

CHATGPT AUDIT -> CHATGPT PROMPT -> GITHUB CONTROL PLANE -> TASK -> CODEX IMPLEMENT -> CODEX TEST/VERIFY -> CODEX EVIDENCE -> CODEX PUSHED RUN LOG -> CHATGPT GITHUB POST-RUN AUDIT -> TASK STATUS

A Codex run log is an execution record, not authoritative proof that its own work passed. Codex must not self-author the final authoritative audit verdict for its own run.

### Separation of duties

**ChatGPT is responsible for:**
- reading Codex logs and canonical task state from GitHub;
- inspecting GitHub commits, diffs, CI/Security evidence, and current source;
- writing/updating prompts under the GitHub `.hiveai/prompts/` directory;
- writing authoritative audits under the GitHub `.hiveai/audits/` directory;
- updating GitHub control pointers/task evidence when warranted;
- deciding whether task status may advance.

**Codex is responsible for:**
- reading the current control state and active prompt from GitHub first;
- syncing/fetching the execution checkout safely;
- implementation in the local checkout;
- local/Docker/runtime validation;
- capturing exact command results;
- saving the matching `CR-...` run log;
- committing and pushing that run log and implementation to `codex/main-consolidation`;
- updating task evidence only when the active prompt explicitly authorizes it.

Codex must not create, overwrite, or declare authoritative the ChatGPT post-run audit for the same run.

Every task must contain an ID, milestone, title, status, priority, dependencies, source, acceptance criteria, evidence, and Codex run reference. DONE requires implementation plus separate audit validation plus evidence.

## Independent Audit Rule

For applicable test/build/runtime/security claims the ChatGPT audit layer must:

1. read the pushed Codex CR from GitHub;
2. inspect the exact GitHub changes and current source/tests;
3. independently corroborate what can be verified through GitHub/CI evidence;
4. classify unsupported local runtime claims as `UNVERIFIED` rather than copying Codex PASS;
5. record discrepancies;
6. store the audit under the GitHub `.hiveai/audits/` directory;
7. only then permit canonical task status advancement.

When Codex needs Docker validation, Docker being stopped is not itself a blocker. Codex should attempt to start Docker Desktop, wait for the engine, run Docker-backed validation, and shut Docker Desktop down only when that run started it.

## GitHub Bootstrap Command

Read these GitHub resources in this exact order before doing anything locally:

1. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/INDEX.md`
2. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/PROJECT_DASHBOARD.md`
3. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/TASKS.md`
4. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/audits/CURRENT.md`
5. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/prompts/CURRENT.md`
6. the exact active prompt URL referenced by that GitHub prompt pointer;
7. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/.hiveai/handoffs/LATEST.md`
8. `https://github.com/Sekiph82/move-in-range/blob/codex/main-consolidation/AGENTS.md`

Then execute the active prompt exactly in the local checkout. Save only the matching Codex `CR-...` execution log and push it to:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/codex-runs`

Do not author the authoritative ChatGPT audit. ChatGPT audits are written to:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/audits`

ChatGPT prompts are written to:
`https://github.com/Sekiph82/move-in-range/tree/codex/main-consolidation/.hiveai/prompts`

## Branch Safety

Inspect ancestry, ahead/behind counts, open PRs, and conflicts before consolidation. Use a reviewable branch for consolidation. Do not merge into `main`, delete historical branches, or close stacked PRs without explicit maintainer approval and recorded evidence.
