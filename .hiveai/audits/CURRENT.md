# Current Audit Pointer

Authoritative repository branch:
`https://github.com/Sekiph82/move-in-range/tree/main`

Active authoritative audit:
`A-20260827-010-EXPO-CI-AND-MAIN-PROTECTION`

Source after this control-plane PR is merged:
`https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/audits/A-20260827-010-EXPO-CI-AND-MAIN-PROTECTION.md`

Audited Codex run:
`https://github.com/Sekiph82/move-in-range/blob/main/.hiveai/codex-runs/CR-20260827-010-EXPO-CI-COMPATIBILITY-GATE.md`

Current authoritative state:

- GitHub CI now directly enforces `Expo Doctor` and `Expo dependency check` as real failing steps;
- exact final main CI `33057057333` is independently verified green and both Expo steps are independently visible as successful;
- exact final Security `33057057320` is independently verified green;
- PRs #14, #15, and #16 are independently verified merged;
- GitHub branch metadata independently reports `main` as protected with required `validate` and `security` contexts;
- the connector cannot independently read the full protection subresource, so detailed force-push/deletion/approval/admin settings remain corroborated Codex execution evidence rather than separately re-fetched proof;
- `MR-CI-EXPO-001` and core `MR-BRANCH-001` are accepted as DONE;
- post-consolidation cleanup is now eligible for a bounded safety-first run;
- next active prompt is `P-20260827-011-POST-CONSOLIDATION-CLEANUP`.

Audit verdict:
`VERIFIED_CORE_EXPO_CI_AND_MAIN_PROTECTION`

Historical audits remain append-only.
