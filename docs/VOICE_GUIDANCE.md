# Voice Guidance

Implemented:

- voice modes: `off`, `countdown_only`, `essential_cues`, `full_guidance`
- Turkish and English cue text
- deterministic cue scheduling
- mobile local scheduler
- API scheduler
- mock TTS/prerecorded adapter metadata

API:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/voice/cues -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"payload":{"language":"tr","mode":"essential_cues","items":[{"name":"Chair march","duration_seconds":40,"rest_seconds":20}]}}'
```

Native background audio behavior is not claimed until device testing is completed.
