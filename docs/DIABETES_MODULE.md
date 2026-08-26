# Diabetes Module

Implemented:

- manual glucose logging
- expanded diabetes context records
- delayed glucose notification jobs at 30, 60, 90, and 120 minutes
- CGM trend/source/unit/timestamp payload storage
- canonical mg/dL conversion
- limited insight generation with sample count, confidence, variability, and disclaimer

API:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/diabetes/context -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"payload":{"value":6.1,"unit":"mmol/L","timing":"post","source":"manual","delayed_check_minutes":30}}'
Invoke-RestMethod -Uri http://localhost:8200/api/v1/diabetes/insights -Headers @{Authorization="Bearer <token>"}
```

The module never provides insulin dose, basal, bolus, carbohydrate treatment, medication, diagnosis, or treatment recommendations.
