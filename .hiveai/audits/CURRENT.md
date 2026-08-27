# Current Audit Pointer

Authoritative repository branch:
`https://github.com/Sekiph82/move-in-range/tree/main`

Active authoritative audit:
`A-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY`

Source:
`https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/A-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md`

Audited Codex run:
`https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/codex-runs/CR-20260827-008-PR13-MERGE-AND-POSTMERGE-VERIFY.md`

Current authoritative state:

- PR #13 is independently verified MERGED into `main` by merge commit `d18ce2a06d7dda83f6df7c03fedba119b3e61a88`;
- GitHub CI and Security are independently green on the merge commit;
- the current `main` control-plane/log commit is also green in GitHub CI and Security;
- `MR-MERGE-001` is accepted as DONE;
- the consolidation itself is valid and `main` is now authoritative;
- P008 local Docker/test/export claims remain Codex execution evidence unless independently reproduced by ChatGPT;
- P008 disclosed a real post-merge validation discrepancy: Expo Doctor is `20/21`, not fully green;
- current mobile package declarations independently confirm patch-level Expo SDK 57 / React Native drift, including React Native `0.86.2` where Expo Doctor expects the current supported patch line;
- historical PR/branch cleanup must wait until the Expo 57 patch-alignment follow-up is completed and separately audited;
- next active prompt is `P-20260827-009-EXPO57-PATCH-ALIGNMENT`.

Audit verdict:
`MERGE_VERIFIED_WITH_POSTMERGE_EXPO_ALIGNMENT_REQUIRED`

Historical audits remain append-only.
