# Camera Privacy Model

Implemented:

- feature-flag-ready camera analysis session model
- explicit consent requirement
- mock pose estimator
- session-only privacy mode
- no upload by default
- no recording by default
- repetition-count foundation
- confidence output
- no diagnosis or clinical posture claim

API:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/camera/analyze -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"payload":{"camera_consent":true,"exercise_id":"exercise-1","samples":[{"phase":"rep_complete"}]}}'
```

Native pose-estimation and device-camera validation are blocked until mobile hardware and native dependencies are available.
