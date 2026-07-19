# Integrations

Implemented provider architecture:

- Dexcom
- FreeStyle Libre
- Nightscout
- Tidepool
- Apple Health
- Android Health Connect
- Apple Watch
- Wear OS
- Garmin
- Fitbit
- Bluetooth heart-rate sensors

Nightscout has a mock-ready adapter. Other providers are represented by explicit blocked states until official credentials, platform entitlements, or hardware are available.

API:

```powershell
Invoke-RestMethod -Uri http://localhost:8200/api/v1/integrations/providers -Headers @{Authorization="Bearer <token>"}
Invoke-RestMethod -Method Post -Uri http://localhost:8200/api/v1/integrations/connect -Headers @{Authorization="Bearer <token>"} -ContentType application/json -Body '{"provider_key":"nightscout","mock":true}'
```

No private service scraping is implemented.
