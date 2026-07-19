# Resend Setup

MoveInRange staging uses Resend through the HTTPS API.

Required Vercel API environment variables:

```env
EMAIL_SENDER=resend
RESEND_API_KEY=<secret>
RESEND_FROM_EMAIL=MoveInRange <no-reply@verified-domain.example>
PUBLIC_APP_URL=https://<product-or-reset-host>
PASSWORD_RESET_URL_BASE=https://<product-or-reset-host>
```

Create the API key in Resend:

API Keys -> Create API Key -> choose the verified sending domain scope -> copy once.

Verify a sending domain:

Domains -> Add Domain -> add DNS records at the domain host -> wait for verified status.

Temporary limitation:

Resend requires a verified domain for normal sender addresses. If no domain is verified, password reset cannot be marked production-ready. Do not weaken production guards by using console email, Mailpit, or localhost SMTP in staging.

Add Vercel secrets interactively:

```powershell
npx.cmd vercel env add EMAIL_SENDER preview
npx.cmd vercel env add RESEND_API_KEY preview
npx.cmd vercel env add RESEND_FROM_EMAIL preview
npx.cmd vercel env add PUBLIC_APP_URL preview
npx.cmd vercel env add PASSWORD_RESET_URL_BASE preview
```

Repeat for `production` only after preview is verified.

Password reset email behavior:

- generic forgot-password response
- token is included only in the email link
- token is not stored raw
- token is not added to audit payloads
- delivery attempts are stored in `email_delivery_attempts`
- text and HTML bodies include English and Turkish instructions
- one-time and 30-minute expiration notice included

Troubleshooting:

- `resend_not_configured`: missing API key or sender
- `resend_http_403`: domain or API key scope problem
- `resend_http_422`: invalid sender or recipient payload
- `resend_unavailable`: timeout or network failure
