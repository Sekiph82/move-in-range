# Deployment

Deployment requires production PostgreSQL, Redis, auth provider credentials, admin host, API host, Expo build credentials, push notification setup, HealthKit entitlements, Health Connect configuration, licensed media decisions, secret management, backups, monitoring, and clinical review of published policies.

Required production environment values:

```env
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://...
REDIS_URL=redis://...
API_BASE_URL=https://api.example.com
ADMIN_BASE_URL=https://admin.example.com
CORS_ORIGINS=https://admin.example.com
AUTH_SECRET=<long-random-secret>
TOKEN_ISSUER=moveinrange-api
TOKEN_AUDIENCE=moveinrange-mobile
LOCAL_ADMIN_EMAIL=<bootstrap-or-disabled-admin-email>
LOCAL_ADMIN_PASSWORD=<strong-bootstrap-password>
ENABLE_DEVELOPMENT_ADMIN_OVERRIDE=false
```

Production startup must fail if `AUTH_SECRET` is empty/default, `CORS_ORIGINS=*`, or a development admin override is enabled. SQLite is not a production database; it is only a local fallback for lightweight developer runs.

For mobile testing before release:

- Android emulator API URL: `http://10.0.2.2:8200`.
- Physical-device Expo Go API URL: `http://<WINDOWS_LAN_IP>:8200`.
- FastAPI must bind to `0.0.0.0:8200`.
- Windows Firewall must allow inbound access to port `8200` for physical-device testing.
