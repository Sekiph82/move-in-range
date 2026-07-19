# Release Test Matrix

| Area | Automated | Manual | Status |
| --- | --- | --- | --- |
| Backend complete product API | `python -m pytest services/api/tests` | API smoke | Automated |
| Mobile pure state | `npm.cmd run test` | Device validation | Automated, device blocked until tooling exists |
| Admin session and dashboard | `npm.cmd run test`, `npm.cmd run build` | Browser validation | Automated, live browser optional |
| PostgreSQL migrations | CI Postgres service, `npm.cmd run db:migrate` | Docker local | CI expected |
| Redis revocation | CI Redis service | Docker local | CI expected |
| Full dataset import | `npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json` | Review logs | Manual local when dataset available |
| External providers | mock tests | Real provider activation | Blocked by credentials/hardware |

Required local commands:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
npm.cmd install
npm.cmd run format:check
npm.cmd run lint
npm.cmd run checklist:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
ruff check services/api
python -m pytest services/api/tests
npm.cmd run security:check
npm.cmd audit --audit-level=high
npm.cmd audit
```
