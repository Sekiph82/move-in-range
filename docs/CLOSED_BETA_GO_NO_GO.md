# Closed Beta Go/No-Go

Date: 2026-07-19

| Area | Decision | Evidence | Condition or blocker |
| --- | --- | --- | --- |
| Backend API | GO | Docker API healthy; pytest 21 passed | None |
| PostgreSQL | GO | Full dataset clean DB: 1324 exercises, 13240 localizations, duplicate ids 0 | None |
| Redis | GO | API readiness reports Redis revocation store; Redis integration test passed | None |
| Authentication | GO | Register/login/refresh/logout/reset tests passed | None |
| Password reset | GO | Mailpit E2E passed; token single-use and old session invalidation tested | Native deep-link manual check remains |
| Onboarding | GO | Product UI and mobile workflow tests cover all 22 steps in full journey | Native device manual pass required |
| Planning | GO | Readiness, daily, weekly, monthly plan browser/API tests passed | None |
| Workout | GO | Start, pause, resume, feedback browser scenario passed | Native background/process-kill validation required |
| Diabetes | GO | mg/dL and mmol/L API/UI coverage passed | None |
| Product web | GO | Product UI E2E 7 passed, 0 skipped | None |
| Admin | GO | Role-separated policy/admin mutation tests passed | None |
| Privacy | GO WITH MANUAL CONDITION | Export checksum, secret exclusion, ownership isolation, deletion processing, session revocation tested | Native/device privacy flow pending |
| Email | GO | SMTP/Mailpit reset flow passed; production console sender rejected | Production SMTP credentials external |
| Android artifact | BLOCKED EXTERNAL | Expo doctor/export/prebuild passed; no APK/AAB | Android SDK/EAS CLI/auth unavailable |
| Android runtime | BLOCKED EXTERNAL | No emulator/device available | Requires device/emulator run |
| Accessibility | GO WITH MANUAL CONDITION | Web labels used in E2E | TalkBack/manual dynamic text pass required |
| Security | GO WITH MANUAL CONDITION | High/critical audit clean; release review complete | Moderate dependency advisories need scheduled upgrade |
| Backup/restore | GO | Local pg_dump restore counts matched | Production backup system not exercised |
| Migrations | GO | Upgrade, downgrade one revision, upgrade to `20260719_0009` succeeded | None |
| Merge rehearsal | GO WITH MANUAL CONDITION | Local rehearsal documented; PRs remain unmerged | Full suite must rerun after each actual retarget/merge |
| Dependencies | GO WITH MANUAL CONDITION | `npm audit --audit-level=high` passed | Moderate PostCSS/uuid chain advisories remain |

Final decision:

- Closed beta web/API/admin release rehearsal: GO.
- Android closed beta installable artifact: BLOCKED EXTERNAL until EAS or local Android toolchain is available and an APK/AAB is produced.
- Android runtime acceptance: BLOCKED EXTERNAL until emulator or physical device validation is completed.
