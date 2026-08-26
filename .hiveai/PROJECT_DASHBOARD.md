---
hiveaiDashboardSchema: hiveai-project-dashboard/v1
projectKey: move-in-range
repository: Sekiph82/move-in-range
branchPolicy: main
dashboardMode: source-map
refreshPolicy: watcher-driven source invalidation; no generated status commits
---

# H!veAI Project Dashboard Manifest

This file is a pointer map for H!veAI. It is not a task ledger and must not duplicate task checkboxes.

## Project identity

Project: move-in-range
Repository: `Sekiph82/move-in-range`
Default branch: `main`

## Source authorities

Canonical task source: `TASKS.md`
Handoff source: `.hiveai/handoffs/LATEST.md`
Roadmap source: `TASKS.md`
Progress/history source: `.hiveai/codex-runs/`
Architecture source: `docs/`
Decision source: `.hiveai/decisions/DECISIONS.md`
Agent instruction source: `AGENTS.md`
Security source: `SECURITY.md`
Build/test metadata: `package.json`, `docker-compose.yml`, TypeScript configuration, infrastructure/docs directories

## Authority notes

`TASKS.md` is the only canonical task ledger. H!veAI must derive live state from the ledger, Git, watcher evidence, and the sources above. Do not manufacture backlog from README, infrastructure, or security prose.

## Refresh model

H!veAI should derive live state from Registry/Git/watcher evidence plus the verified sources above. This manifest remains pointer-only and should not be rewritten as a generated status snapshot.
