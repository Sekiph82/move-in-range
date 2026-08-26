# Backup And Restore Rehearsal

Date: 2026-07-19

Scope: disposable local Docker PostgreSQL data only. No backup file was committed.

Commands executed:

```powershell
docker compose exec -T postgres pg_dump -U moveinrange -d moveinrange -f /tmp/mir_release_rehearsal_backup.sql
docker compose cp postgres:/tmp/mir_release_rehearsal_backup.sql .local\release-rehearsal-backup.sql
Get-FileHash -Algorithm SHA256 .local\release-rehearsal-backup.sql
docker compose exec -T postgres createdb -U moveinrange moveinrange_restore_20260719130849
docker compose cp .local\release-rehearsal-backup.sql postgres:/tmp/mir_release_rehearsal_restore.sql
docker compose exec -T postgres psql -U moveinrange -d moveinrange_restore_20260719130849 -f /tmp/mir_release_rehearsal_restore.sql
Remove-Item -LiteralPath .local\release-rehearsal-backup.sql
```

Checksum:

```text
316330A7536BF19CE93B437237732CE09BD6E5C1A9BCEC2111E313CA5FDE526C
```

Verification:

| Database | exercises | exercise_localizations | users |
| --- | ---: | ---: | ---: |
| source `moveinrange` | 1328 | 13241 | 65 |
| restore `moveinrange_restore_20260719130849` | 1328 | 13241 | 65 |

Result:

- Restore completed successfully.
- Representative user count matched.
- Exercise count matched.
- Localization count matched.
- Generated backup file was deleted after verification.
- PostgreSQL service remained healthy.

Rollback note:

- This rehearsal used disposable local data. Production rollback must use an immutable backup from the production backup system, restore into an isolated database, verify migration head and health, then switch traffic only after manual approval.
