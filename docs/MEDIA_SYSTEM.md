# Media System

Implemented media precedence:

1. approved licensed animation
2. approved licensed static image
3. internal silhouette animation
4. internal silhouette static
5. neutral fallback semantics

Unauthorized third-party exercise media is not committed.

API:

```powershell
Invoke-RestMethod -Uri "http://localhost:8200/api/v1/exercises/<exercise-id>/media-resolution?language=tr&reduced_motion=false&low_bandwidth=false" -Headers @{Authorization="Bearer <token>"}
```

Mobile fallback resolver:

- `apps/mobile/src/guidance/mediaVoice.ts`

Admin media approvals:

- `POST /api/v1/media-approvals`
