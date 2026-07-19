# Onboarding Model

Onboarding is persisted through `onboarding_progress`, `profiles`, `goal_preferences`, `capacity_profiles`, and `consent_records`.

Implemented API:

```powershell
Invoke-RestMethod -Method Put -Uri http://localhost:8200/api/v1/onboarding -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"step":"identity","completed":true,"language":"tr","payload":{"preferred_name":"Aylin","date_of_birth":"1982-04-20","gender":"prefer_not_to_say","timezone":"Europe/Istanbul","language":"tr"}}'
```

Mobile helpers:

- `apps/mobile/src/onboarding/onboardingState.ts`
- `apps/mobile/app/(tabs)/profile.tsx`

Gender and physiological contexts are voluntary fields. Gender does not select workout paths and must not override health, capacity, pregnancy, menopause, injury, or clinician restrictions.
