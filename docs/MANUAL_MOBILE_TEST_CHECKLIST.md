# Manual Mobile Test Checklist

No Android emulator or physical device was used during this implementation pass.

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

- Open Profile, save onboarding profile, and confirm it reloads.
- Complete readiness check and confirm safety action/explanation.
- Generate daily plan and confirm total duration displays.
- Open Plan, generate weekly plan and four-week progression.
- Open Move, search exercises, open a Turkish detail view, and confirm attribution appears.
- Start guided workout from Today, report pain, log glucose, and complete session.
- Open Insights and confirm stored session/glucose context updates.
- Put device offline, enqueue a health event through the app flow, return online, and retry sync.
- Confirm blocked readiness prevents workout generation.
- Confirm screen reader labels on primary buttons.
