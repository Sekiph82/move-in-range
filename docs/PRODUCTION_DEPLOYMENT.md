# Production Deployment

Production readiness artifacts:

- `infrastructure/staging.env.example`
- `infrastructure/production.env.example`
- `docker-compose.prod.yml`
- `infrastructure/BACKUP_RESTORE.md`
- `/api/v1/health`
- `/api/v1/ready`

Local validation:

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
docker compose up -d postgres redis
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
python -m pytest services/api/tests
```

Do not commit real secrets. Do not deploy to paid infrastructure without explicit authorization.
