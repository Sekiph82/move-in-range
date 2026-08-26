# Branch Consolidation Audit

Audit run: `CR-20260826-001`
Audit date: 2026-08-26
Repository: `Sekiph82/move-in-range`

## Scope and Sources

Inspected all local and `origin` refs for `main` and `codex/*`, all open PRs returned by GitHub, `AGENTS.md`, the main H!veAI manifest, release and beta audit/checklist documents, and the current release-rehearsal tree. The current repository exposes 12 relevant branches/ref pairs: `main` plus 11 `codex/*` branches. GitHub exposes 11 open stacked PRs and one already-merged H!veAI dashboard PR (#12).

## Branch Inventory

| order | branch | head | base relationship | main-only | branch-only | unique over previous branch |
| ---: | --- | --- | --- | ---: | ---: | ---: |
| 0 | `origin/main` | `ccc91af` | current main | 0 | 0 | 0 |
| 1 | `origin/codex/initial-moveinrange-platform` | `4e54a6c` | diverged from `a0410a4` | 1 | 7 | 7 |
| 2 | `origin/codex/functional-mobile-mvp` | `a0ca7dc` | contains branch 1 | 1 | 10 | 3 |
| 3 | `origin/codex/mvp-hardening` | `9e87121` | contains branch 2 | 1 | 11 | 1 |
| 4 | `origin/codex/release-candidate-validation` | `3ef5396` | contains branch 3 | 1 | 12 | 1 |
| 5 | `origin/codex/complete-product-platform` | `34c6eef` | contains branch 4 | 1 | 16 | 4 |
| 6 | `origin/codex/functional-product-experience` | `968a4bb` | contains branch 5 | 1 | 18 | 2 |
| 7 | `origin/codex/product-acceptance-completion` | `c7fa93e` | contains branch 6 | 1 | 21 | 3 |
| 8 | `origin/codex/real-beta-completion` | `f0c66cb` | contains branch 7 | 1 | 24 | 3 |
| 9 | `origin/codex/closed-beta-readiness` | `b5ffeb6` | contains branch 8 | 1 | 25 | 1 |
| 10 | `origin/codex/closed-beta-finalization` | `657bd27` | contains branch 9 | 1 | 26 | 1 |
| 11 | `origin/codex/release-rehearsal` | `26ec74e` | contains branch 10 | 1 | 52 | 26 |

`main-only` is the manifest commit `ccc91af` relative to the old common base. All feature branches share merge base `a0410a4`; current main is one manifest commit ahead of that base. The counts use `origin/main...branch` and the immediate stacked parent relationship.

## Stacked Ancestry

```text
main
  -> #1 codex/initial-moveinrange-platform
  -> #2 codex/functional-mobile-mvp
  -> #3 codex/mvp-hardening
  -> #4 codex/release-candidate-validation
  -> #5 codex/complete-product-platform
  -> #6 codex/functional-product-experience
  -> #7 codex/product-acceptance-completion
  -> #8 codex/real-beta-completion
  -> #9 codex/closed-beta-readiness
  -> #10 codex/closed-beta-finalization
  -> #11 codex/release-rehearsal
```

Every branch from #2 through #11 is an ancestor of the next branch. The initial branch is not an ancestor of current main only because the dashboard manifest was added independently on main after the stack was created.

## Unique Commit Groups

- #1: `c170460`, `869ae88`, `9aa51e6`, `cf952db`, `b2ecd5d`, `dd41a04`, `4e54a6c`
- #2: `191833e`, `5c90ed1`, `a0ca7dc`
- #3: `9e87121`
- #4: `3ef5396`
- #5: `2d35c93`, `0220c6f`, `8846cdf`, `34c6eef`
- #6: `4fd1d82`, `968a4bb`
- #7: `08050f3`, `6edbf49`, `c7fa93e`
- #8: `e46bdc2`, `2311d14`, `f0c66cb`
- #9: `b5ffeb6`
- #10: `657bd27`
- #11: `d6e11d6`, `92c5410`, `310cbe0`, `9c1af90`, `add338f`, `a4fa8bc`, `ee6a7bd`, `584922e`, `7c070f4`, `1ce2217`, `6fad90e`, `bbaac27`, `80baab5`, `0037496`, `6975bcd`, `3240287`, `0877c7f`, `d25cd0a`, `e58f02c`, `85fac1e`, `b526b4d`, `5fb6ba9`, `c652710`, `f7f9c60`, `139746b`, `26ec74e`

The 11 groups sum to 52 commits in release-rehearsal. No branch is an independent parallel feature line in the current graph.

## PR Inventory

PRs #1 through #11 are open draft PRs in the exact stacked order above. PR #12, `hiveai/project-dashboard-v1 -> main`, is merged. PR #11 remains `codex/release-rehearsal -> codex/closed-beta-finalization` and is still open; it was not retargeted or closed.

## Conflicts and Containment

- Three-way merge simulation from common base `a0410a4` reported no unmerged paths or conflict markers.
- Actual merge into `codex/main-consolidation` completed with the `ort` strategy and no conflict resolution was required.
- The main manifest was preserved because the release branch did not modify the manifest path; it only predates the independent main addition.
- All earlier branch heads are contained by `origin/codex/release-rehearsal`.
- No historical branch was deleted and no PR was closed.

## Consolidation Decision

Create `codex/main-consolidation` from `origin/main`, merge `origin/codex/release-rehearsal`, then validate and open one review PR to `main`. Do not merge that PR automatically.
