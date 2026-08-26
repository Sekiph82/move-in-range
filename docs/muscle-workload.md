# Muscle Workload

Status: planning only. This document describes a future MoveInRange workload and activity insight layer.

## Purpose

Muscle workload should help users and the planner understand what body areas were trained recently. It should support coaching context, not medical diagnosis.

Primary use cases:

- progress tab workload balance
- plan generation guardrails
- recovery day suggestions
- pain-aware substitution choices
- overuse risk prompts
- per-muscle recent history

## Workload Unit

Use effective sets as the first workload unit instead of raw weight volume.

Rationale:

- bodyweight, timed, mobility, and rehab work often have no external load
- raw load volume overweights lower-body loaded exercises
- safety-first programs need a comparable signal across exercise types
- effective sets are easier to explain to beta users

## Muscle Weights

Recommended default credit:

- primary muscle: 1.0 effective set
- secondary muscle: 0.4 effective set
- stabilizer: 0.2 effective set

These values should be configurable later and reviewable by clinical/product stakeholders.

## Mode Handling

Loaded reps:

- completed set counts by muscle role
- optionally mark hard sets using RPE/RIR when available
- pain-stopped sets count as attempted but not productive

Bodyweight reps:

- completed set counts by muscle role
- added load does not change effective set credit in v1
- assistance can reduce confidence but should not erase credit

Timed work:

- full target duration counts as one effective set
- partial duration counts proportionally, capped at one set
- early stop due to symptoms or pain counts as attempted

Cardio:

- count in a conditioning bucket by default
- map to muscles only when the exercise has reviewed muscle mappings

Mobility and breathing:

- count separately from strength workload unless reviewed as muscle-targeted work

## Windows

Recommended insight windows:

- 7 days: current recovery and balance
- 30 days: recent training pattern
- 90 days: medium-term trend
- all time: history context only

The planner should use 7 and 30 day windows before increasing exercise difficulty.

## Output Shape

Recommended API output:

```text
MuscleWorkloadSummary
  window_days
  generated_at
  muscles[]
    muscle_code
    effective_sets
    attempted_sets
    pain_events
    symptom_stops
    level
    trend
```

`level` can be normalized 0 to 4 for UI display:

- 0: none
- 1: light
- 2: moderate
- 3: high
- 4: highest in selected window

## Activity Heatmap

The activity heatmap should use completed minutes per date.

Recommended bands:

- 0: no completed activity
- 1: 1 to 9 minutes
- 2: 10 to 24 minutes
- 3: 25 to 44 minutes
- 4: 45 minutes or more

Additional overlays can later mark:

- recovery day
- rest day
- skipped day
- safety stop
- rescheduled session

## Mobile UI

Recommended progress tab additions:

- compact activity heatmap
- muscle workload summary over 7 and 30 days
- per-muscle detail sheet
- recent workouts driving the selected muscle score
- pain-aware note when a muscle has recent pain events

Keep the display calm and scannable. Avoid making workload look like a clinical diagnosis.

## Planner Integration

The planner can use workload to:

- reduce repeated stress on recently painful muscles
- avoid overloading the same primary muscle on consecutive days
- choose recovery alternatives
- explain why a session was adjusted
- avoid increasing progression when workload is already high

Planner decisions should still prioritize readiness, pain, symptoms, and medical profile.

## Tests

Required tests:

- primary and secondary muscles receive correct effective set credit
- timed partial completion is prorated
- pain-stopped sets are attempted but not productive
- cardio defaults to conditioning bucket
- workload windows filter dates correctly
- heatmap counts completed minutes only
- one user's workload is not visible to another user
