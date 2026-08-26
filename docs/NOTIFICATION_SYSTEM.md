# Notification System

Implemented:

- notification preferences
- quiet hours
- private preview policy
- mock local provider
- scheduled notification jobs
- delayed glucose check jobs

API:

```powershell
Invoke-RestMethod -Method Put -Uri http://localhost:8200/api/v1/notification-preferences -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"category":"workout_reminder","enabled":true,"quiet_hours":{"start":"21:00","end":"07:00"}}'
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/notifications/schedule -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"payload":{"category":"workout_reminder"}}'
```

FCM and APNs activation is blocked until credentials are available.
