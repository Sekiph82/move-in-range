# A-20260827-008 - PR13 Merge And Post-Merge Verify

- Audited run: `CR-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY`
- Repository: `Sekiph82/move-in-range`
- Authoritative branch: `main`
- Audit role: authoritative ChatGPT GitHub-side post-run review

## Verdict

`MERGE_VERIFIED_WITH_POSTMERGE_EXPO_ALIGNMENT_REQUIRED`

## Independently verified from GitHub

1. PR #13 is closed and merged.
2. Merge commit is `d18ce2a06d7dda83f6df7c03fedba119b3e61a88`.
3. PR head merged was `0b4349fd34d01bf72fb37935e2509f40eaa719af` into base `ccc91af1bafbe65a99cc9913a4989adbf8b4be4b`.
4. GitHub CI run `33019888249` completed successfully on the merge commit.
5. GitHub Security run `33019888237` completed successfully on the merge commit.
6. Current `main` head is `fdce9a45db53f901262ffcbe70b9b69e4c73f23e`, whose parent is the PR #13 merge commit. This commit records the P008 CR/control-plane state.
7. Current-main GitHub CI run `33020585674` and Security run `33020585678` also completed successfully on `fdce9a45db53f901262ffcbe70b9b69e4c73f23e`.
8. `TASKS.md` on main records `MR-MERGE-001` DONE and keeps historical cleanup unperformed.

## Codex execution claims classification

The following are accepted as Codex execution evidence but are not independently rerun by the ChatGPT audit layer:

- host Node suite 65 passed / 10 skipped;
- host API suite 34 passed / 2 skipped;
- Docker Node suite 75/75 with 0 skips;
- Docker API suite 36/36;
- Docker service health checks;
- one Alembic head `20260719_0010`;
- iOS export pass;
- Android export pass.

These claims are consistent with the green GitHub CI/Security state but remain local/runtime execution evidence rather than separately reproduced ChatGPT runtime proof.

## Important discrepancy discovered in P008

P008 classified itself `MERGED_AND_POSTMERGE_VERIFIED`, but its own execution record reports Expo Doctor only `20/21` checks passed.

The failed Expo Doctor check reports patch-level SDK compatibility drift, including React Native expected at `0.86.3` while current main declares `0.86.2`, plus Expo-managed packages below the currently expected SDK 57 patch set.

Current GitHub source independently confirms the mobile graph still declares Expo `~57.0.16`, React Native `0.86.2`, React/React DOM `19.2.3`, and the older SDK-57 patch package set.

Therefore the merge itself is valid and GitHub CI/Security are green, but the statement that every post-merge validation gate is fully green is too strong. The Expo Doctor gate has a real, bounded post-merge alignment issue.

## Security state

- GitHub Security: independently green on merge commit and current main head.
- High/critical npm gate: independently green through GitHub Security.
- Remaining moderate-only Expo tooling/uuid advisory family remains residual technical debt.
- No security workflow weakening was observed.

## Task adjudication

- `MR-MERGE-001`: `DONE`. PR #13 is independently verified merged and main CI/Security are green.
- `MR-CLEAN-001`: do not execute cleanup yet. Keep it pending until the Expo Doctor patch-alignment follow-up is completed and separately audited.
- New `MR-EXPO-001`: required. Align the current Expo 57/RN dependency set to the exact Expo Doctor-supported patch graph without changing product behavior, then rerun all affected mobile/security/build gates.
- `MR-DEV-001` and `MR-DEPLOY-001` remain separate external/manual work.

## Final audit conclusion

The consolidation merge is successful and authoritative control has correctly moved to `main`. GitHub CI and Security independently validate the merged and current control-plane commits. One bounded post-merge defect remains: Expo Doctor is 20/21 because the SDK 57 package graph is one patch alignment behind current compatibility expectations. This should be repaired before historical branch/PR cleanup.
