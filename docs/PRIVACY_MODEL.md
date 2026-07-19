# Privacy Model

Privacy model: collect only needed health context, avoid exact health values in routine logs and push previews, support consent versioning, export, deletion jobs, retention hooks, redaction, object authorization, and audit logs. No HIPAA, GDPR, MDR, or FDA compliance claim is made.

Hardening notes:

- Ordinary logs must not include passwords, access tokens, refresh tokens, raw Authorization headers, exact glucose values, full health-condition payloads, or free-form health notes.
- Structured audit records store redacted payload summaries and action metadata.
- `app.privacy.redact_for_log` provides a defensive redaction helper for request-shaped data.
- Admin support views must remain role-protected and should prefer aggregate or redacted data.
- Mobile token storage uses SecureStore where available; unsupported runtimes fall back only for local usability and must not be described as durable secure persistence.
- Admin refresh tokens are kept in HttpOnly cookies and are not exposed to browser JavaScript.
- Offline queued items are scoped by account id so another signed-in user does not submit the previous user's queued health events.
