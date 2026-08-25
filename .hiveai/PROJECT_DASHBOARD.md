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

Canonical task source: none verified yet
Handoff source: none verified
Roadmap source: none verified
Progress/history source: none verified
Architecture source: none verified at repository root
Decision source: none verified
Agent instruction source: `AGENTS.md`
Security source: `SECURITY.md`
Build/test metadata: `package.json`, `docker-compose.yml`, TypeScript configuration, infrastructure/docs directories

## Authority notes

No canonical task ledger is currently verified. H!veAI must report `TASK AUTHORITY NOT YET CANONICALIZED` instead of manufacturing backlog from README, infrastructure, or security prose.

`AGENTS.md` is instruction-only and `SECURITY.md` is security context. Neither is task authority.

When verified active work is next established, add a canonical task ledger and update this manifest rather than guessing from repository contents.

## Refresh model

H!veAI should derive live state from Registry/Git/watcher evidence plus the verified sources above. This manifest should remain pointer-only and should not be rewritten as a generated status snapshot.
