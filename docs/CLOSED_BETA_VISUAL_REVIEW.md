# Closed Beta Visual Review

Review date: 2026-07-19

## Product

Product screenshots are blocked for native Android because Android tooling is absent. Product web-compatible acceptance verifies the real mobile routes and API flow; Expo browser rendering remains a separate blocker until a stable Expo web server/export is configured.

Reviewed product surfaces by code and tests:

- Login, registration, forgot password, reset password, reset success
- Onboarding gender, sensitivity, restrictions, injuries, mobility aids, activity, capacity
- Readiness, daily plan, workout, feedback, diabetes, calendar, privacy export

## Admin

Playwright captures ignored local screenshots:

- `test-results/acceptance/admin-dashboard.png`
- `test-results/acceptance/admin-user-table.png`
- `test-results/acceptance/admin-exercises.png`
- `test-results/acceptance/admin-policy-simulator.png`

Mutation UI reviewed by Playwright:

- User edit
- Exercise edit
- Policy draft/edit/approval/publish/rollback
- Privacy job process
- Notification retry
- Integration disable
- Audit result

Screenshots are not committed because `test-results/` is intentionally ignored.
