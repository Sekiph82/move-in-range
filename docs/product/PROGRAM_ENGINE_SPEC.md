# Program Engine Spec

## Planning Layers

MoveInRange programs use a single progression model:

- Day: readiness-adapted session with warm-up, mobility/strength/balance/cardio, recovery, and cooldown.
- Week: seven-day schedule balancing movement and recovery.
- Month: four-week progression with adaptation, consistency, gentle progression, and recovery/reassessment.

## Daily Requirements

- Total phase durations approximate the claimed duration.
- Items expose exercise id, name, section, equipment, target, position/difficulty/impact labels, work/rest/preparation durations, sets/reps, instructions, safety notes, substitutions, and media state.
- Actions include start, make easier, shorten, replace movement, regenerate safely, postpone, and mark unavailable.

## Weekly Requirements

- Seven days with date, focus, status, duration, recovery/rest labels, and day detail.
- Preserve completed days.
- Regenerate only incomplete future days.
- Reschedule missed sessions without unsafe consecutive load.

## Four-Week Requirements

- Week 1: Adaptation.
- Week 2: Consistency.
- Week 3: Gentle progression.
- Week 4: Recovery and reassessment.
- Do not progress after worsening pain, concerning symptoms, low completion, dizziness increase, or an easier-session request.
