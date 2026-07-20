# MoveInRange Product Blueprint

## Product Shape

MoveInRange is a health-aware movement application built around five primary areas:

- Home: today's readiness, current program, primary start action, recent activity, and recovery-aware prompts.
- Program: daily, seven-day, and four-week planning with day detail, adaptation, and history preservation.
- Move: visual exercise library, exercise detail, substitutions, and quick sessions.
- Progress: movement minutes, consistency, completion, pain trend, energy trend, and calendar history.
- Profile: health profile, pain and equipment editors, preferences, account security, privacy, and language.

The app should feel calm, premium, movement-focused, accessible, and non-intimidating. It must avoid diagnostic claims, medication guidance, competitive ranking, and aggressive fitness language.

## Feature Classification

| Area | Current classification | Product correction |
| --- | --- | --- |
| Authentication | Fully functional | Preserve existing auth, session restore, password reset, and session revocation. |
| Browser password reset | Fully functional | Keep the Vercel browser reset page and single-use token lifecycle. |
| Onboarding | Partially functional | Convert long technical form into step-by-step health-aware setup with a visual safety summary. |
| Daily plan | Partially functional | Render sectioned plan with media previews, durations, substitutions, and direct player start. |
| Weekly plan | Partially functional | Show seven days, date/status/focus, day detail, recovery days, missed-day actions, and future-day adaptation. |
| Four-week plan | Partially functional | Show four connected weeks with progression, holds, recovery, and history-preserving regeneration. |
| Exercise library | Partially functional | Render visual cards, filters, safety labels, media fallback, and detail navigation. |
| Exercise detail | Partially functional | Show large media/fallback, localized steps, targets, equipment, breathing, mistakes, stop conditions, and substitutions. |
| Guided workout | Broken product flow | Start a dedicated player with preparation, work/rest phases, media, cues, pause/resume, skip, pain, substitution, completion, and feedback. |
| Exercise media | Backend-only | Surface media/fallback consistently through API payloads and mobile components. |
| Progress | Partially functional | Replace technical metrics with consistency, minutes, completion, pain trend, and active program progress. |
| Offline recovery | Partially functional | Persist active player snapshots and queue completion/feedback without duplicate sync. |

## Safety Rules

Plan generation, workout start/resume, progression, diabetes context, coaching, and safety-sensitive notifications must stay behind the existing rule-driven safety policy. The product must show conservative stop/delay guidance for concerning symptoms without diagnosis or treatment advice.

## Program Model

The program model is connected:

Four-week program -> weekly structure -> daily session -> same-day readiness adaptation -> guided session -> completion and feedback -> future adaptation.

Daily, weekly, and monthly views must not be unrelated plan generators. They are different views over one conservative movement program.
