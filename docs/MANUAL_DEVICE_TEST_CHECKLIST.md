# Manual Device Test Checklist

Use this checklist only when Android or iOS device tooling is genuinely available.

```powershell
cd <repo-root>
npm.cmd run api
npm.cmd run mobile
```

Android emulator API URL:

```text
http://10.0.2.2:8200
```

Physical device API URL:

```text
http://<WINDOWS_LAN_IP>:8200
```

Validate:

- login/register
- onboarding resume
- quick session
- advanced plan
- workout pause/resume/restart
- pain and symptom stop
- glucose delayed notification mock
- offline outbox account isolation
- media fallback
- voice cues
- camera mock consent screen
- caregiver/professional invitation screens

Do not mark physical-device validation passed unless it was actually run.
