# Program Engine

The complete-product planner is deterministic and auditable. It stores plan evidence in `plan_decision_evidence` and never allows AI or natural language to bypass safety.

Implemented services:

- `build_program_payload`
- `interpret_natural_request`
- `evaluate_contextual_safety`
- `apply_plan_modification`
- `progression_recommendation`

Implemented API:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/plans/advanced/generate -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"available_minutes":20,"target_focuses":["back","core"],"equipment":["body weight","chair"],"no_floor":true}'
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/quick-session -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"available_minutes":8,"pain":2,"chair_only":true,"equipment":["chair"]}'
```

Safety always wins over "make it harder", target-muscle requests, recent lows, pain, clinician restrictions, pregnancy/postpartum context, osteoporosis, neuropathy, fall risk, and cardiac rehabilitation.
