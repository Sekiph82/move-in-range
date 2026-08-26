# Caregiver Model

Implemented:

- invite caregiver
- revoke caregiver
- minimal default sharing
- shared scopes
- expiry
- audit logs
- masked display

API:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/caregivers/invite -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"email":"care@example.test","scopes":["session_completion"]}'
```

Caregivers cannot silently access user data and cannot modify clinical restrictions by default.
