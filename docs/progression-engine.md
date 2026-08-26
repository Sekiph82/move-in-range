# Progression Engine

Status: planning only. This document specifies a future MoveInRange progression engine inspired by common workout-tracking patterns, reimplemented inside MoveInRange's safety-first architecture.

## Principles

Progression should be:

- conservative
- explainable
- exercise-specific
- reversible through user feedback
- subordinate to readiness, pain, symptoms, medical profile, and clinician constraints
- deterministic for the same history window and inputs

The engine should recommend future targets. It should not mutate completed workouts.

## Inputs

Recommended inputs:

- user id
- exercise id
- execution mode
- current prescription
- completed set history
- skipped set history
- pain reports
- symptom stops
- readiness history
- perceived difficulty
- RPE/RIR when available
- bodyweight snapshots
- equipment availability
- clinician or program constraints
- progression policy selected by plan/program

## Outputs

Every recommendation should include:

- `exercise_id`
- `policy`
- `next_prescription`
- `confidence`
- `reason`
- `safety_override`
- `history_window`
- `source_session_ids`
- `created_at`

The reason should be user-readable, for example: "All sets completed comfortably twice, so add 1 kg next time" or "Pain was reported last session, so repeat the same target."

## Policies

### Disabled

Use when an exercise, plan, clinician rule, or user preference should not progress automatically.

Output: repeat the current prescription.

### Linear Load

Use for simple loaded reps when the user completes all prescribed sets and reps with acceptable effort.

Rules:

- add the smallest safe increment for the equipment and body region
- hold when effort is high
- hold or regress when pain, symptoms, low readiness, or repeated misses occur
- never increase load after a safety stop

### Double Progression

Use for rep ranges such as 8 to 12.

Rules:

- increase reps within the range first
- when all sets reach the top of the range, increase load and reset to the lower end
- hold if the final set falls below target
- regress if misses repeat and feedback is negative

### Bodyweight Reps

Use when bodyweight is the main resistance.

Rules:

- increase reps first
- then add a set within a configured cap
- then suggest a harder variation or optional external load
- assisted movements should reduce assistance only after consistent completion
- pain or poor readiness holds or regresses the movement

### Timed Hold

Use for planks, wall sits, mobility holds, rehab holds, and isometrics.

Rules:

- increase seconds after all intervals are completed
- hold when the user stops early
- reduce target seconds after repeated misses or pain
- do not convert timed work into reps

### Cardio Duration

Use for duration-first cardio and conditioning.

Rules:

- increase duration before speed or intensity
- use small increments
- stop progression when symptoms or abnormal glucose context appears
- keep cardio targets separate from strength volume metrics

### Rehab Hold

Use for safety-sensitive exercises and post-pain recovery work.

Rules:

- repeat or reduce targets
- prefer comfort, range quality, and symptom-free completion over volume
- require multiple clean sessions before returning to normal progression

## Safety Overrides

The following should override ordinary progression:

- severe pain
- symptom report
- readiness block
- low glucose or high-risk diabetes context
- clinician-imposed restriction
- user says the exercise was too difficult
- repeated early stops
- repeated skipped sets

Override actions:

- repeat target
- reduce reps
- reduce seconds
- reduce load
- increase rest
- suggest substitution
- mark for review

## History Windows

Use small windows for responsiveness and larger windows for confidence:

- last session: immediate safety and completion signal
- last 3 sessions: short-term trend
- last 6 to 8 sessions: confidence trend
- last 30 to 90 days: workload and consistency context

The engine should store which window was used for each recommendation.

## Backend Placement

Preferred location:

- pure domain module in the API service or shared package
- API service persists recommendations
- mobile displays recommendations but does not own the algorithm

This keeps recommendations auditable and consistent across devices.

## API Additions

Recommended endpoints:

- `GET /progression/exercises/{exercise_id}`
- `GET /progression/recommendations/current`
- `POST /progression/recommendations/recalculate`
- `POST /progression/recommendations/{id}/accept`
- `POST /progression/recommendations/{id}/dismiss`

Generated plans should reference accepted or current recommendations when building future prescriptions.

## Tests

Required tests:

- loaded reps progress only after complete sets
- timed exercises progress seconds, not reps
- bodyweight exercises increase reps before added load
- assisted exercises reduce assistance before adding difficulty
- severe pain causes hold or regression
- symptom stop prevents progression
- low readiness prevents progression
- repeated misses cause hold or deload
- reasons are stable and user-readable
- recommendations are deterministic for identical inputs
