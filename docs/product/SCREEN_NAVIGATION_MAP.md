# Screen Navigation Map

## Primary Tabs

| Tab | Route | Purpose |
| --- | --- | --- |
| Home | `/(tabs)` | Today, readiness, current program, start action, quick recovery-aware prompts. |
| Program | `/(tabs)/program` | Daily, weekly, and four-week plan views with day detail actions. |
| Move | `/(tabs)/move` | Exercise library, filters, quick sessions, substitutions. |
| Progress | `/(tabs)/progress` | Consistency, minutes, pain trend, activity calendar, achievements. |
| Profile | `/(tabs)/profile` | Health profile, preferences, account security, privacy. |

## Auth Routes

- `/auth`
- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/reset-password-success`
- `/auth/session-expired`

## Product Routes

- `/onboarding`
- `/readiness`
- `/daily-plan`
- `/weekly-plan`
- `/monthly-plan`
- `/calendar`
- `/exercises`
- `/exercise/[id]`
- `/quick-session`
- `/workout/[sessionId]`
- `/workout/[sessionId]/pain`
- `/workout/[sessionId]/symptom`
- `/workout/[sessionId]/feedback`
- `/settings`
- `/privacy`
- `/diabetes`
- `/notifications`
- `/integrations`
- `/caregivers`
- `/professionals`

## Navigation Principles

- All Expo Router targets use absolute hrefs.
- Auth redirects run only after the root navigator is mounted.
- Route groups are used only for tabs and do not imply public URL segments.
- Guided workout flow must use dedicated routes rather than one scrolling control page.
