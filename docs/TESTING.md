# Testing

Run from `C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range`.

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
ruff check services/api
python -m pytest services/api/tests
npm.cmd run build
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
npm.cmd run security:check
npm.cmd audit
```

Current expanded coverage includes:

- Local auth registration/login and token use.
- User isolation for sessions and plans.
- Onboarding/profile persistence.
- Readiness persistence and deterministic safety result.
- Daily plan duration validation.
- Weekly and monthly plan generation.
- Exercise search/detail localization.
- Session event idempotency, pain reporting, completion.
- Glucose conversion and no-insulin-recommendation response.
- Stored insights aggregation.
- Canonical local port guard for `8200` and `3200`.
