# Privacy And Data Rights

Implemented:

- consent history
- data export jobs
- deletion jobs
- cancellation deadline for deletion requests
- provider disconnect
- caregiver revoke
- professional relationship revoke foundations
- audit logs
- admin privacy job view

API:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/privacy/export-jobs -Headers @{Authorization="Bearer <token>"}
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/privacy/deletion-jobs -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"payload":{"deletion_type":"selected_health_data"}}'
```

This implementation improves GDPR/KVKK readiness, but does not claim legal certification.
