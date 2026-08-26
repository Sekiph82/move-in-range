# Backup And Restore

Backup procedure:

```powershell
docker compose exec postgres pg_dump -U moveinrange -d moveinrange > .\backups\moveinrange_$(Get-Date -Format yyyyMMddHHmmss).sql
```

Restore test procedure:

```powershell
docker compose up -d postgres redis
Get-Content .\backups\<backup-file>.sql | docker compose exec -T postgres psql -U moveinrange -d moveinrange
npm.cmd run db:migrate
python -m pytest services/api/tests
```

Managed production should use provider-native encrypted backups, restore drills, and separate staging restore validation before production recovery.
