# Current Audit Pointer

Authoritative repository branch:
`https://github.com/Sekiph82/move-in-range/tree/main`

Active authoritative audit:
`A-20260827-009-EXPO57-PATCH-ALIGNMENT`

Source:
`https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/A-20260827-009-EXPO57-PATCH-ALIGNMENT.md`

Audited Codex run:
`https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/codex-runs/CR-20260827-009-EXPO57-PATCH-ALIGNMENT.md`

Current authoritative state:

- P009 Expo/RN patch alignment is independently verified as a bounded dependency-only change on `main`;
- exact implementation commit `799cbb470a1b37e7421bd07bc51a67b0b7a45e9e` exists and GitHub CI/Security are independently green on that exact commit;
- current mobile manifest is aligned to Expo SDK 57 patch updates including Expo `~57.0.17` and React Native `0.86.3`;
- Codex reports Expo Doctor `21/21`, Expo dependency check clean, Docker 75/75 Node and 36/36 API, and iOS/Android exports passing;
- those local Expo Doctor/dependency-check results remain execution evidence because current GitHub CI does not yet execute them directly;
- `MR-EXPO-001` remains DONE, but the control system needs a GitHub-hosted Expo compatibility gate for independent proof;
- next active prompt is `P-20260827-010-EXPO-CI-COMPATIBILITY-GATE`;
- historical PR/branch cleanup remains deferred.

Audit verdict:
`VERIFIED_WITH_EXPO_CI_EVIDENCE_GAP`

Historical audits remain append-only.
