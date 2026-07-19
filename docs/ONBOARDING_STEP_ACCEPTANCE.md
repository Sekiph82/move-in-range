# Onboarding Step Acceptance

All 22 onboarding steps are defined in `apps/mobile/src/features/onboarding/model.ts` and rendered by `OnboardingScreen`.

| # | Step | Component evidence | Validation | Persistence | Test |
|---|---|---|---|---|---|
| 1 | Welcome | `StepFields` fallback text area | optional note | `PUT /onboarding` | route inventory |
| 2 | Product boundary | `StepFields` fallback text area | optional note | `PUT /onboarding` | route inventory |
| 3 | Consent | `StepFields` fallback text area | optional note | `PUT /onboarding` | onboarding integration |
| 4 | Preferred name | `TextField` | `preferred_name_required` | `PUT /onboarding` | schema test |
| 5 | Date of birth | structured year, month, and day fields | `date_of_birth_iso_required` | `PUT /onboarding` | schema test |
| 6 | Gender | `ChipGroup` plus conditional self-description | `self_description_required` | `PUT /onboarding` | schema test |
| 7 | Physiological contexts | independent `ChipGroup` controls | trimester required only for pregnancy | `PUT /onboarding` | schema test |
| 8 | Height and weight | numeric text fields | height/weight numeric required | `PUT /onboarding` | schema test |
| 9 | Country/timezone/language | structured fields plus language chips | locale required | `PUT /onboarding` | schema test |
| 10 | Health conditions | selectable cards/chips | optional notes | `PUT /onboarding` | route inventory |
| 11 | Sensitivity regions | body-region chips, side, severity, restriction | side required when region selected | `PUT /onboarding` | schema test |
| 12 | Clinician restrictions | notes field | optional note | `PUT /onboarding` | API integration |
| 13 | Previous injuries and surgery | notes field | optional note | `PUT /onboarding` | API integration |
| 14 | Mobility aids | notes field | optional note | `PUT /onboarding` | API integration |
| 15 | Activity and experience | notes field | optional note | `PUT /onboarding` | API integration |
| 16 | Functional capacity | notes field | optional note | `PUT /onboarding` | API integration |
| 17 | Goals | selectable goal chips | `goal_required` | `PUT /onboarding` | schema test |
| 18 | Target muscles | selectable target chips | `target_required` | `PUT /onboarding` | schema test |
| 19 | Environment and equipment | selectable equipment chips | optional equipment | `PUT /onboarding` | API integration |
| 20 | Schedule and time | numeric minutes field | `minimum_five_minutes` | `PUT /onboarding` | schema test |
| 21 | Diabetes and notification settings | toggles | boolean state | `PUT /onboarding` | API integration |
| 22 | Review and complete | readable summary | completion flag | `PUT /onboarding` with completed=true | API integration |

Back, continue, save, resume, loading, readable error messages, English labels, Turkish step labels, and accessibility labels are implemented in `OnboardingScreen`.
