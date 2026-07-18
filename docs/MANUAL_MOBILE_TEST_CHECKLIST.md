# Manual Mobile Test Checklist

No Android emulator or physical device was used during this implementation pass. Automated Node tests cover timestamp timer behavior; real backgrounding, SecureStore persistence, and networking still require device validation.

## Before Testing

```powershell
cd C:\Users\sekip\Desktop\MoveInRange-Workspace\move-in-range
copy .env.example .env
npm.cmd install
docker compose up -d postgres redis
npm.cmd run db:migrate
npm.cmd run import:exercises -- ..\exercises-dataset-main\data\exercises.json
npm.cmd run api
```

For Android emulator:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:8200"
npm.cmd run mobile
```

For Expo Go on a physical device, use the Windows LAN IPv4 address:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://<windows-lan-ip>:8200"
npm.cmd run mobile
```

Allow Windows Firewall access to port `8200`.

## Critical Workflows

| Workflow | Status | Notes |
|---|---|---|
| Android emulator networking with `http://10.0.2.2:8200` | NOT RUN | Emulator unavailable in this pass. |
| Physical-device networking with Windows LAN IP | NOT RUN | Physical device unavailable in this pass. |
| Login and token restore | NOT RUN | Automated backend auth tests pass; device SecureStore restore still needs manual validation. |
| Onboarding profile save/reload | NOT RUN | API-backed flow covered by pytest. |
| Readiness and safety explanation | NOT RUN | Backend readiness tests pass. |
| Daily plan duration | NOT RUN | Backend and Node rule tests pass. |
| Weekly plan and monthly progression | NOT RUN | Backend spacing/hold tests pass. |
| Exercise search and Turkish instructions | NOT RUN | API workflow test covers Turkish detail response. |
| Workout start, timer, pause, resume | NOT RUN | Timestamp unit tests pass; real background/foreground not run. |
| Pain report | NOT RUN | Backend and mobile unit tests cover pause/substitution action. |
| Symptom stop | NOT RUN | Backend and mobile unit tests cover stop/invalidation. |
| Glucose log and insights | NOT RUN | Backend and PostgreSQL integration tests cover write/read path. |
| Offline queue retry | NOT RUN | Unit/API tests cover failed state, retry count, and duplicate handling. |
| App restart resume | NOT RUN | API session resume exists; local persisted workout snapshot remains future work. |
| Accessibility labels | NOT RUN | Static/manual device pass still required. |
