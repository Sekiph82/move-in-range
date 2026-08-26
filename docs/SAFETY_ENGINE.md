# Safety Engine

Safety is deterministic and stores decisions in `safety_decisions`.

Implemented contexts:

- readiness symptoms
- pain and low energy
- clinician-prohibited movements
- pregnancy or postpartum context
- osteoporosis risk
- neuropathy, fall risk, and balance support
- cardiac rehabilitation supervision requirement
- baseline assessment eligibility
- plan generation
- plan modification
- quick-session creation
- admin simulator

MoveInRange does not diagnose, prescribe, provide insulin guidance, or replace emergency care.

Admin simulator:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/admin/policy-simulator -Headers @{Authorization="Bearer <admin-token>"} -ContentType application/json -Body '{"energy":2,"sleep_quality":3,"pain":7,"available_minutes":10}'
```
