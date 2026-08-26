# Professional Portal

Implemented as user-consented professional relationships separate from admin access.

Roles:

- physiotherapist
- clinician
- trainer
- diabetes educator

Implemented:

- invite professional
- consent scopes
- organization metadata
- verification status
- movement restrictions
- notes
- review dates
- audit

API:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/professionals/invite -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"email":"pt@example.test","role":"physiotherapist","scopes":["movement_restrictions"]}'
```

No prescribing, insulin recommendation, or clinician impersonation is implemented.
